const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

const { generateCode } = require("./utils/generateCode.js");

app.use(cors());
app.use(express.json());

app.get("/generate-code", (req, res) => {
  try {
    const { rawCode, hashedCode } = generateCode();
    res.json({ rawCode, hashedCode });
  } catch (err) {
    console.error("Error generating code:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.json("GiftChain backend is live");
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at PORT ${PORT}`);
});
