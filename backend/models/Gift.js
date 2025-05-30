const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema({
   giftID: {
    type: String,
    required: true,
    unique: true,
   },

   hashedCode: {
    type: String,
    required: true,
    unique: true,
   },

   token: {
    type: String,
    required: true
   },
   
   senderAddress: {
    type: String,
    required: true
   },

   email: {
      type: String,
      default: "",
   },

   amount: {
      type: String,
      required: true
   },

   fee: {
      type: String,
      required: true
    },

   message: {
      type: String,
      required: true
   },

   expiry: {
      type: Number,
      required: true
   },

   status: {
      type: String,
      enum: ['created', 'claimed', 'expired'],
      default: 'created'
   },

   createdAt: {
    type: Date,
    default: Date.now()
   },

})

module.exports = mongoose.model("giftchainUniqueCode", codeSchema);