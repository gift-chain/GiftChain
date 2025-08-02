const giftCode = require("../models/Gift.js");
const { generateCode } = require("../utils/generateCode.js");
const { sendGiftCodeEmail } = require("../utils/emailService.js");

const createCode = async (req, res) => {
  try {
    const { senderAddress, expiry, message, amount, token } = req.body;

    if (!senderAddress) {
      return res.status(400).json({ error: "Sender address is required" });
    }
    
    const { rawCode, hashedCode } = generateCode();

    const creatorCode = new giftCode({
      rawCode,
      hashedCode,
      senderAddress,
      token,
      amount,
      expiry: new Date(expiry),
      message: message.trim(),
      giftID: rawCode,
      fee: 0,
    });

    await creatorCode.save();

    res.status(200).json({ rawCode, hashedCode, message: "Code generated and saved" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const bulkCreateCodes = async (req, res) => {
  try {
    const { entries, senderAddress } = req.body;

    if (!senderAddress) {
      return res.status(400).json({ error: "Sender address is required" });
    }
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Entries must be a non-empty array" });
    }

    // Minimum 5 gifts for bulk creation
    if (entries.length < 5) {
      return res.status(400).json({ error: "Bulk creation requires at least 5 gifts" });
    }

    // Validate entries
    const errors = [];
    const validEntries = [];
    
    for (const [index, entry] of entries.entries()) {
      const { email, token, amount, expiry, message } = entry;
      
      // Email validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email at entry ${index + 1}: ${email || "missing"}`);
        continue;
      }
      
      // Token validation
      if (!token || !["USDT", "USDC", "DAI"].includes(token)) {
        errors.push(`Invalid token at entry ${index + 1}: ${token || "missing"}`);
        continue;
      }
      
      // Amount validation
      if (!amount || Number(amount) <= 0) {
        errors.push(`Invalid amount at entry ${index + 1}: ${amount || "missing"}`);
        continue;
      }
      
      // Expiry validation
      if (!expiry || new Date(expiry).getTime() <= Date.now()) {
        errors.push(`Invalid or past expiry date at entry ${index + 1}: ${expiry || "missing"}`);
        continue;
      }
      
      // Message validation (3-50 characters)
      if (!message || message.length < 3 || message.length > 50) {
        errors.push(`Message must be 3-50 characters at entry ${index + 1}: ${message?.length || 0} characters`);
        continue;
      }
      
      validEntries.push({ 
        email, 
        token, 
        amount: Number(amount), 
        expiry, 
        message: message.trim()
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check for duplicate emails
    const emails = validEntries.map((entry) => entry.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return res.status(400).json({ error: "Duplicate emails found in the batch" });
    }

    // Generate and save gift codes
    const generatedGifts = [];
    const savedCodes = [];
    
    try {
      for (const entry of validEntries) {
        const { rawCode, hashedCode } = generateCode();
        
        const gift = new giftCode({
          rawCode,
          hashedCode,
          senderAddress,
          email: entry.email.toLowerCase(),
          token: entry.token,
          amount: entry.amount,
          expiry: new Date(entry.expiry),
          message: entry.message,
          giftID: rawCode,
          fee: 0,
          status: 'created',
          createdAt: new Date(),
        });
        
        const savedGift = await gift.save();
        savedCodes.push(savedGift);
        
        generatedGifts.push({
          email: entry.email,
          rawCode,
          token: entry.token,
          amount: entry.amount,
          expiry: entry.expiry,
          message: entry.message,
          giftId: savedGift._id
        });
      }
      
      // Send emails in batches
      const emailErrors = [];
      const emailBatchSize = 5;
      
      for (let i = 0; i < generatedGifts.length; i += emailBatchSize) {
        const batch = generatedGifts.slice(i, i + emailBatchSize);
        
        const emailPromises = batch.map(async (gift) => {
          try {
            await sendGiftCodeEmail(gift.email, {
              ...gift,
              claimUrl: `${process.env.FRONTEND_URL}/claim/${gift.rawCode}`
            });
            return { success: true, email: gift.email };
          } catch (error) {
            console.error(`Failed to send email to ${gift.email}:`, error);
            return { success: false, email: gift.email, error: error.message };
          }
        });
        
        const results = await Promise.allSettled(emailPromises);
        results.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled' && !result.value.success) {
            emailErrors.push(`Failed to send email to ${result.value.email}: ${result.value.error}`);
          } else if (result.status === 'rejected') {
            const email = batch[batchIndex]?.email || 'unknown';
            emailErrors.push(`Failed to send email to ${email}: ${result.reason}`);
          }
        });
        
        // Add delay between batches to respect email service rate limits
        if (i + emailBatchSize < generatedGifts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Response based on email delivery success
      if (emailErrors.length > 0) {
        return res.status(207).json({
          message: "Gift codes generated, but some emails failed to send",
          emailErrors,
          generatedGifts,
          totalCreated: generatedGifts.length,
          emailsFailed: emailErrors.length
        });
      }

      res.status(200).json({
        message: "Gift codes generated and emails sent successfully",
        generatedGifts,
        totalCreated: generatedGifts.length,
        summary: {
          totalGifts: generatedGifts.length,
          tokens: [...new Set(generatedGifts.map(g => g.token))],
          totalValue: validEntries.reduce((sum, entry) => sum + entry.amount, 0)
        }
      });
      
    } catch (dbError) {
      // Clean up any partial saves on database error
      console.error("Database error during bulk creation:", dbError);
      
      if (savedCodes.length > 0) {
        try {
          await giftCode.deleteMany({
            _id: { $in: savedCodes.map(code => code._id) }
          });
        } catch (cleanupError) {
          console.error("Failed to cleanup after error:", cleanupError);
        }
      }
      
      return res.status(500).json({ 
        error: "Database error during bulk creation",
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
    
  } catch (error) {
    console.error("Error in bulk create:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Function to get gift status
const getGiftStatus = async (req, res) => {
  try {
    const { giftId } = req.params;
    
    if (!giftId) {
      return res.status(400).json({ error: "Gift ID is required" });
    }
    
    const gift = await giftCode.findOne({ rawCode: giftId });
    
    if (!gift) {
      return res.status(404).json({ error: "Gift not found" });
    }
    
    res.status(200).json({
      giftId: gift.rawCode,
      status: gift.status,
      token: gift.token,
      amount: gift.amount,
      expiry: gift.expiry,
      message: gift.message,
      email: gift.email,
      createdAt: gift.createdAt,
      claimed: gift.claimed || false
    });
    
  } catch (error) {
    console.error("Error getting gift status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createCode,
  bulkCreateCodes,
  getGiftStatus
};