const giftCode = require("../models/Gift.js");
const {generateCode} = require("../utils/generateCode.js");

const createCode = async(req,res) => {
    try {

        const {senderAddress} = req.body

        if (!senderAddress) {
            return res.status(400).json({ error: "Sender address is required" });
          }
        const {rawCode, hashedCode} = generateCode();

        const creatorCode = new giftCode({
            rawCode, hashedCode, senderAddress
        })

         creatorCode.save();

        res.status(200).json({rawCode, message: "code generated and save"});
    } catch (error) {
        console.error("Error saving user code:", error);
        res.status(500).json({error: "Internal server error"});
    }
};

module.exports = {createCode};