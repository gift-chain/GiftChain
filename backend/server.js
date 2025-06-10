
const express = require("express");
const cors = require("cors");
require('dotenv').config();


const mongoose = require("mongoose");
const codeRoutes = require("./routes/codeRoutes.js");
const { createGift } = require("./controllers/createGiftController.js");
const crowdfundingRoutes = require("./routes/crowdfundingRoutes.js");

console.log("Crowdfunding routes:", crowdfundingRoutes); 


const app = express();

mongoose.connect(process.env.MONGO_URI);
const PORT = process.env.PORT || 4000;


app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

app.use("/api", codeRoutes);
app.use("/api/token", require("./routes/token"));

app.use("/api/crowdfunding", crowdfundingRoutes);

app.get("/", (req, res) => {
  res.json("GiftChain backend is live");
});

// app.post("/create-gift", createGift);

app.listen(PORT, () => {
  console.log(`✅ Backend running at PORT ${PORT}...`);
});
