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

    // payment intent //
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000,
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
