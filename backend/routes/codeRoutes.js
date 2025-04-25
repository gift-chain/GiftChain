const express = require("express");
const router = express.Router();
const { createCode } = require("../controllers/codeController");
const {createGift} = require("../controllers/createGiftController");

router.post("/generate-code", createCode);
router.post("/create-gift", createGift)

module.exports = router;