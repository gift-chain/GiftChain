const Crowdfunding = require("../models/Crowdfunding.js");
const { generateCode } = require("../utils/generateCode.js");

const createCampaign = async (req, res) => {
  try {
    const { title, description, goalAmount, creatorAddress, deadline } = req.body;

    // Validation
    if (!title || !description || !goalAmount || !creatorAddress || !deadline) {
      return res.status(400).json({ 
        error: "All fields are required: title, description, goalAmount, creatorAddress, deadline" 
      });
    }

    // Validate goal amount 
    if (Number(goalAmount) <= 0) {
      return res.status(400).json({ error: "Goal amount must be greater than 0" });
    }

    // Validate deadline is in the future
    const campaignDeadline = new Date(deadline);
    if (campaignDeadline.getTime() <= Date.now()) {
      return res.status(400).json({ error: "Deadline must be in the future" });
    }

    // Validate title and description length
    if (title.length < 3 || title.length > 100) {
      return res.status(400).json({ error: "Title must be between 3-100 characters" });
    }

    if (description.length < 10 || description.length > 500) {
      return res.status(400).json({ error: "Description must be between 10-500 characters" });
    }

    // Generate unique codes
    const { rawCode, hashedCode } = generateCode();

    const campaign = new Crowdfunding({
      campaignCode: rawCode,
      rawCode,
      hashedCode,
      title: title.trim(),
      description: description.trim(),
      goalAmount: Number(goalAmount),
      creatorAddress,
      deadline: campaignDeadline,
      status: 'active'
    });

    await campaign.save();

    res.status(200).json({
      message: "Campaign created successfully",
      campaignCode: rawCode,
      campaignId: campaign._id,
      campaign: {
        title: campaign.title,
        description: campaign.description,
        goalAmount: campaign.goalAmount,
        deadline: campaign.deadline,
        creatorAddress: campaign.creatorAddress,
        status: campaign.status
      }
    });

  } catch (error) {
    console.error("Error creating campaign:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ error: "Campaign code already exists. Please try again." });
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCampaign = async (req, res) => {
  try {
    const { campaignCode } = req.params;

    if (!campaignCode) {
      return res.status(400).json({ error: "Campaign code is required" });
    }

    const campaign = await Crowdfunding.findOne({ campaignCode });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(200).json({
      campaignCode: campaign.campaignCode,
      title: campaign.title,
      description: campaign.description,
      goalAmount: campaign.goalAmount,
      currentAmount: campaign.currentAmount,
      creatorAddress: campaign.creatorAddress,
      deadline: campaign.deadline,
      status: campaign.status,
      createdAt: campaign.createdAt,
      progress: Math.round((campaign.currentAmount / campaign.goalAmount) * 100)
    });

  } catch (error) {
    console.error("Error getting campaign:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCampaignByHashedCode = async (req, res) => {
  try {
    const { hashedCode } = req.params;

    if (!hashedCode) {
      return res.status(400).json({ error: "Hashed code is required" });
    }

    const campaign = await Crowdfunding.findOne({ hashedCode });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(200).json({
      campaignCode: campaign.campaignCode,
      title: campaign.title,
      description: campaign.description,
      goalAmount: campaign.goalAmount,
      currentAmount: campaign.currentAmount,
      creatorAddress: campaign.creatorAddress,
      deadline: campaign.deadline,
      status: campaign.status,
      createdAt: campaign.createdAt
    });

  } catch (error) {
    console.error("Error getting campaign by hashed code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateCampaignAmount = async (req, res) => {
  try {
    const { campaignCode } = req.params;
    const { amount } = req.body;

    if (!campaignCode || !amount) {
      return res.status(400).json({ error: "Campaign code and amount are required" });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const campaign = await Crowdfunding.findOne({ campaignCode });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ error: "Campaign is not active" });
    }

    // Check if campaign has expired
    if (new Date() > campaign.deadline) {
      await Crowdfunding.findByIdAndUpdate(campaign._id, { status: 'failed' });
      return res.status(400).json({ error: "Campaign has expired" });
    }

    // Update current amount
    campaign.currentAmount += Number(amount);

    // Check if goal is reached
    if (campaign.currentAmount >= campaign.goalAmount) {
      campaign.status = 'funded';
    }

    await campaign.save();

    res.status(200).json({
      message: "Campaign amount updated successfully",
      campaignCode: campaign.campaignCode,
      currentAmount: campaign.currentAmount,
      goalAmount: campaign.goalAmount,
      status: campaign.status,
      progress: Math.round((campaign.currentAmount / campaign.goalAmount) * 100)
    });

  } catch (error) {
    console.error("Error updating campaign amount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const claimFunds = async (req, res) => {
  try {
    const { campaignCode } = req.params;
    const { creatorAddress } = req.body;

    if (!campaignCode || !creatorAddress) {
      return res.status(400).json({ error: "Campaign code and creator address are required" });
    }

    const campaign = await Crowdfunding.findOne({ campaignCode });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Verify creator
    if (campaign.creatorAddress.toLowerCase() !== creatorAddress.toLowerCase()) {
      return res.status(403).json({ error: "Only campaign creator can claim funds" });
    }

    // Check if campaign is funded
    if (campaign.status !== 'funded') {
      return res.status(400).json({ error: "Campaign must be funded to claim" });
    }

    // Update status to claimed
    campaign.status = 'claimed';
    await campaign.save();

    res.status(200).json({
      message: "Funds claimed successfully",
      campaignCode: campaign.campaignCode,
      claimedAmount: campaign.currentAmount,
      status: campaign.status
    });

  } catch (error) {
    console.error("Error claiming funds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllCampaigns = async (req, res) => {
  try {
    const { status, creatorAddress, limit = 10, page = 1 } = req.query;
    
    let filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (creatorAddress) {
      filter.creatorAddress = creatorAddress;
    }

    const skip = (page - 1) * limit;
    
    const campaigns = await Crowdfunding.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Crowdfunding.countDocuments(filter);

    res.status(200).json({
      campaigns: campaigns.map(campaign => ({
        campaignCode: campaign.campaignCode,
        title: campaign.title,
        description: campaign.description,
        goalAmount: campaign.goalAmount,
        currentAmount: campaign.currentAmount,
        creatorAddress: campaign.creatorAddress,
        deadline: campaign.deadline,
        status: campaign.status,
        createdAt: campaign.createdAt,
        progress: Math.round((campaign.currentAmount / campaign.goalAmount) * 100)
      })),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: campaigns.length,
        totalCampaigns: total
      }
    });

  } catch (error) {
    console.error("Error getting campaigns:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createCampaign,
  getCampaign,
  getCampaignByHashedCode,
  updateCampaignAmount,
  claimFunds,
  getAllCampaigns
};