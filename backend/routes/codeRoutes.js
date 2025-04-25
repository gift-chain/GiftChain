const express = require("express");
const router = express.Router();
const { createCode } = require("../controllers/codeController");
const {createGift, downloadGiftCard} = require("../controllers/createGiftController");

router.post("/generate-code", createCode);

router.post("/create-gift", createGift)
router.get("/download/:fileName", downloadGiftCard);

module.exports = router;