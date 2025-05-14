const crypto = require("crypto");
const { keccak256, toUtf8Bytes } = require("ethers");

function generateCode() {
  const randomCode = crypto.randomBytes(8).toString("hex");
  const rawCode = randomCode.match(/.{1,4}/g).join("-");
  const hashedCode = keccak256(toUtf8Bytes(rawCode));

  
  return {
    rawCode,
    hashedCode,
  };
}

module.exports = { generateCode };
