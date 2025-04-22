const express = require("express");
const cors = require("cors");

const mongoose = require("mongoose");
const codeRoutes = require("./routes/codeRoutes.js");



const app = express();

mongoose.connect("mongodb+srv://victoradeoba83:CTDdAXepvymuPxb2@cluster0.7tyordv.mongodb.net/giftchain");
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


app.listen(PORT, () => {
  console.log(`✅ Backend running at PORT ${PORT}`);
});
