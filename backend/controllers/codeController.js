// controllers/codeController.js
const { sendGiftCodeEmail } = require("../utils/emailService.js");
const giftCode = require("../models/Gift.js");
const { generateCode } = require("../utils/generateCode.js");

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
    });

    await creatorCode.save();

    res.status(200).json({ rawCode, message: "Code generated and saved" });
  } catch (error) {
    console.error("Error saving user code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendGiftEmails = async (req, res) => {
  try {
    const { entries } = req.body; // Expecting [{ email, rawCode }, ...]

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Entries must be a non-empty array" });
    }

    // Validate entries
    const errors = [];
    for (const [index, entry] of entries.entries()) {
      const { email, rawCode } = entry;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email at entry ${index + 1}: ${email || "missing"}`);
      }
      if (!rawCode) {
        errors.push(`Missing rawCode at entry ${index + 1}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check for duplicate emails
    const emails = entries.map((entry) => entry.email);
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return res.status(400).json({ error: "Duplicate emails found" });
    }

    // Send emails
    const emailErrors = [];
    for (const entry of entries) {
      try {
        await sendGiftCodeEmail(entry.email, entry.rawCode);
      } catch (error) {
        emailErrors.push(`Failed to send email to ${entry.email}`);
      }
    }

    if (emailErrors.length > 0) {
      return res.status(207).json({
        message: "Some emails failed to send",
        emailErrors,
      });
    }

    res.status(200).json({ message: "Emails sent successfully" });
  } catch (error) {
    console.error("Error sending gift emails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createCode, sendGiftEmails };