const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const port = process.env.PORT || 6969;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
dotenv.config();
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
    const db = client.db('potheGoDB');
    const parcelCollection = db.collection('parcels');

    // get Parcel // 
    app.get('/parcels', async (req,res) =>{
      const parcelCollection = db.collection('parcels')
    })




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
