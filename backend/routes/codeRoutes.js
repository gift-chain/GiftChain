const express = require("express");
const router = express.Router();
const { createCode } = require("../controllers/codeController");
const {createGift, downloadGiftCard, getGiftCodes} = require("../controllers/createGiftController");
const giftCode = require("../models/Gift.js");

router.post("/generate-code", createCode);

router.post("/create-gift", createGift)
router.post("/gift-codes", getGiftCodes);
router.get("/download/:fileName", downloadGiftCard);

router.get("/gift/:hashedCode", async (req, res) => {
    try {
      const { hashedCode } = req.params;
      const gift = await giftCode.findOne({ hashedCode });
      if (!gift) {
        return res.status(404).json({ error: "Gift not found" });
      }
      res.json({ giftID: gift.giftID });
    } catch (error) {
      console.error("Error fetching gift:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

module.exports = router;