const mongoose = require("mongoose");

const crowdfundingSchema = new mongoose.Schema({
  campaignCode: {
    type: String,
    required: true,
    unique: true,
  },
  rawCode: {
    type: String,
    required: true,
    unique: true,
  },
  hashedCode: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  goalAmount: {
    type: Number,
    required: true
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  creatorAddress: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'funded', 'failed', 'claimed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("CrowdfundingCampaign", crowdfundingSchema);