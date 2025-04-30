// routes/token.js
const express = require("express");
const router = express.Router();
const TokenController = require("../controllers/TokenController");

router.get("/:address", TokenController.getTokenMetadata);

module.exports = router;