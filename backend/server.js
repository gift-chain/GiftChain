const express = require("express");
const cors = require("cors");
require('dotenv').config();


const mongoose = require("mongoose");
const codeRoutes = require("./routes/codeRoutes.js");
const { createGift } = require("./controllers/createGiftController.js");


const app = express();

mongoose.connect(process.env.MONGO_URI);
const PORT = 3000;


app.use(cors());
app.use(express.json());

// app.get("/generate-code", (req, res) => {
//   try {
//     const { rawCode, hashedCode } = generateCode();
//     res.json({ rawCode, hashedCode });
//   } catch (err) {
//     console.error("Error generating code:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.use("/api", codeRoutes);


app.get("/", (req, res) => {
  res.json("GiftChain backend is live");
});

// app.post("/create-gift", createGift);

app.listen(PORT, () => {
  console.log(`✅ Backend running at PORT ${PORT}...`);
});
