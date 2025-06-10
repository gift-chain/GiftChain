const express = require("express");
const router = express.Router();
const cors = require('cors');

const {
  createCampaign,
  getCampaign,
  getCampaignByHashedCode,
  updateCampaignAmount,
  claimFunds,
  getAllCampaigns
} = require("../controllers/crowdfundingController");

console.log("Controller functions:", { createCampaign, getCampaign }); // Add this line

router.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Create new campaign
router.post("/create-campaign", createCampaign);


module.exports = router;
