const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 6969;

// Middlewares
app.use(cors());
app.use(express.json());

// define routes **inside run()** so userCollection is ready
app.get("/", (req, res) => {
  res.send("potheGo Server is Running");
});

// server lister
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
