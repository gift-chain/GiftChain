const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema({
   rawCode: {
    type: String,
    required: true,

   },

   hashedCode: {
    type: String,
    required: true,
    unique: true,
   },
   
   senderAddress: {
    type: String,
    required: true
  },

   createdAt: {
    type: Date,
    default: Date.now()
   }

})

module.exports = mongoose.model("giftchainUniqueCode", codeSchema);