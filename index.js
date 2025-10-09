const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const port = process.env.PORT || 6969;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const stripe = require("stripe")(process.env.Payment_Key);

// Middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vhdpi0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //DB Collections//
    const db = client.db("potheGoDB");
    const parcelCollection = db.collection("parcels");
    const paymentCollection = db.collection("payments");
    const userCollection = db.collection("users");
    const riderCollection = db.collection("riders");

    // const trackingCollection = db.collection("trackings");

    // --------- Users ---------- //
    app.post("/users", async (req, res) => {
      const email = req.body.email;
      const userExists = await userCollection.findOne({ email });
      if (userExists) {
        return res
          .status(200)
          .send({ message: "User Already Exists", inserted: false });
      }
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // ----------- Riders ------------- //
    // Add a new rider
    app.post("/riders", async (req, res) => {
      try {
        const rider = {
          ...req.body,
          status: req.body.status || "pending", // default pending
          createdAt: new Date(),
        };
        const result = await riderCollection.insertOne(rider);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding rider:", error);
        res.status(500).send({ message: "Failed to add rider" });
      }
    });

    // Get all pending riders
    app.get("/riders/pending", async (req, res) => {
      try {
        const pendingRiders = await riderCollection
          .find({ status: { $regex: /^pending$/i } })
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).send(pendingRiders);
      } catch (error) {
        console.error("Failed to load pending riders:", error);
        res.status(500).send({ message: "Failed to load pending riders" });
      }
    });

    // Approve rider
    app.patch("/riders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        const result = await riderCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.status(200).send(result);
      } catch (error) {
        console.error("Error updating rider:", error);
        res.status(500).send({ message: "Failed to update rider" });
      }
    });

    // Reject rider (delete)
    app.delete("/riders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await riderCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.status(200).send(result);
      } catch (error) {
        console.error("Error deleting rider:", error);
        res.status(500).send({ message: "Failed to delete rider" });
      }
    });

    // Get active riders (with optional search by name/email)
    app.get("/riders/active", async (req, res) => {
      try {
        const { search } = req.query;
        let query = { status: "Active" };

        if (search) {
          query = {
            ...query,
            name: { $regex: search, $options: "i" }, 
          };
        }

        const riders = await riderCollection
          .find(query)
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.send(riders);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch active riders" });
      }
    });

    // ---------- Parcel ------------ //

    // get Parcel //
    app.get("/parcels", async (req, res) => {
      const parcels = await parcelCollection.find().toArray();
      res.send(parcels);
    });

    // create a parcel
    app.post("/parcels", async (req, res) => {
      try {
        const newParcel = req.body;
        const result = await parcelCollection.insertOne(newParcel);

        // Send proper response
        res.status(201).send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating parcel:", error);
        res.status(500).send({ message: "Failed to create parcel" });
      }
    });

    // Get all parcels OR parcels created by a specific user
    app.get("/parcels", async (req, res) => {
      try {
        const email = req.query.email;

        const filter = email ? { createdBy: email } : {};

        const parcels = await parcelCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(parcels);
      } catch (error) {
        console.error("Error fetching parcels:", error);
        res.status(500).send({ message: "Failed to fetch parcels" });
      }
    });

    // Get a single parcel by its ID
    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };
        const parcel = await parcelCollection.findOne(query);

        if (!parcel) {
          return res.status(404).send({ message: "Parcel not found" });
        }

        res.send(parcel);
      } catch (error) {
        console.error("Error fetching parcel:", error);
        res.status(500).send({ message: "Failed to fetch parcel" });
      }
    });

    // Delete a parcel by its ID
    app.delete("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };

        const result = await parcelCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Parcel not found" });
        }

        res.send({ message: "Parcel deleted successfully" });
      } catch (error) {
        console.error("Error deleting parcel:", error);
        res.status(500).send({ message: "Failed to delete parcel" });
      }
    });

    // ------- Payment --------- //

    app.get("/payments", async (req, res) => {
      try {
        const userEmail = req.query.email;
        const query = userEmail ? { email: userEmail } : {};
        const options = { sort: { paid_at: -1 } };
        const payments = await paymentCollection.find(query, options).toArray();
        res.send(payments);
      } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).send({ message: "Failed to fetch payments" });
      }
    });

    app.post("/payments", async (req, res) => {
      try {
        const { parcelId, email, amount, paymentMethod, transactionId } =
          req.body;

        const updateResult = await parcelCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          {
            $set: {
              status: "Paid",
            },
          }
        );

        if (updateResult.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Parcel Not Found or Already Paid" });
        }

        const paymentDoc = {
          parcelId,
          email,
          amount,
          paymentMethod,
          transactionId,
          paid_at_string: new Date().toISOString(),
          paid_at: new Date(),
        };

        const paymentResult = await paymentCollection.insertOne(paymentDoc);

        res.status(201).send({
          message: "Marked As Paid",
          insertedId: paymentResult.insertedId,
        });
      } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).send({ message: "Failed to confirm payment" });
      }
    });

    // -------- Tracking ------------ //
    app.post("/tracking", async (req, res) => {
      try {
        const {
          parcelId,
          trackingId,
          status,
          location,
          note,
          updatedBy = "",
        } = req.body;

        const trackDoc = {
          parcelId: new ObjectId(parcelId),
          trackingId,
          status,
          location: location || "",
          note: note || "",
          updatedBy,
          updatedAt: new Date().toISOString(),
        };

        const result = await trackingCollection.insertOne(trackDoc);

        res.status(201).send({
          message: "Tracking update added",
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add tracking update" });
      }
    });

    // payment intent //
    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// define routes **inside run()** so userCollection is ready
app.get("/", (req, res) => {
  res.send("potheGo Server is Running");
});

// server lister
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
