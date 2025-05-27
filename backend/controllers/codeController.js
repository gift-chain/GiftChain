
const giftCode = require("../models/Gift.js");
const { generateCode } = require("../utils/generateCode.js");
const { sendGiftCodeEmail } = require("../utils/emailService.js");

const createCode = async (req, res) => {
  try {
    const { senderAddress } = req.body;

    if (!senderAddress) {
      return res.status(400).json({ error: "Sender address is required" });
    }
    const { rawCode, hashedCode } = generateCode();

    const creatorCode = new giftCode({
      rawCode,
      hashedCode,
      senderAddress,
      giftID: rawCode, // Set giftID to rawCode
      fee: 0, // Default fee (adjust as needed)
    });

    await creatorCode.save();

    res.status(200).json({ rawCode, message: "Code generated and saved" });
  } catch (error) {
    console.error("Error saving user code:", error);
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

    // Validate entries
    const errors = [];
    const validEntries = [];
    for (const [index, entry] of entries.entries()) {
      const { email, token, amount, expiry, message } = entry;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email at entry ${index + 1}: ${email || "missing"}`);
        continue;
      }
      if (!token || !["USDT", "USDC", "DAI"].includes(token)) {
        errors.push(`Invalid token at entry ${index + 1}: ${token || "missing"}`);
        continue;
      }
      if (!amount || Number(amount) <= 0) {
        errors.push(`Invalid amount at entry ${index + 1}: ${amount || "missing"}`);
        continue;
      }
      if (!expiry || new Date(expiry).getTime() <= Date.now()) {
        errors.push(`Invalid or past expiry date at entry ${index + 1}: ${expiry || "missing"}`);
        continue;
      }
      validEntries.push({ email, token, amount: Number(amount), expiry, message });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check for duplicate emails
    const emails = validEntries.map((entry) => entry.email);
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return res.status(400).json({ error: "Duplicate emails found" });
    }

    // Generate and save gift codes
    const generatedGifts = [];
    for (const entry of validEntries) {
      const { rawCode, hashedCode } = generateCode();
      const gift = new giftCode({
        rawCode,
        hashedCode,
        senderAddress,
        email: entry.email,
        token: entry.token,
        amount: entry.amount,
        expiry: new Date(entry.expiry),
        message: entry.message || "",
        giftID: rawCode, // Set giftID to rawCode
        fee: 0, // Default fee (adjust as needed)
      });
      await gift.save();
      generatedGifts.push({
        email: entry.email,
        rawCode, // This is sent to the recipient's email
        token: entry.token,
        amount: entry.amount,
        expiry: entry.expiry,
        message: entry.message,
      });
    }

    // Send emails
    const emailErrors = [];
    for (const gift of generatedGifts) {
      try {
        await sendGiftCodeEmail(gift.email, gift); // Sends rawCode to recipient
      } catch (error) {
        emailErrors.push(`Failed to send email to ${gift.email}`);
      }
    }

    if (emailErrors.length > 0) {
      return res.status(207).json({
        message: "Gifts created, but some emails failed to send",
        emailErrors,
        generatedGifts,
      });
    }

    res.status(200).json({
      message: "Gifts created and emails sent successfully",
      generatedGifts,
    });
  } catch (error) {
    console.error("Error in bulk create:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createCode, bulkCreateCodes };