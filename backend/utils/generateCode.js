const crypto = require("crypto");
const { keccak256, toUtf8Bytes } = require("ethers");

function generateCode() {
  const rawCode = crypto.randomBytes(8).toString("hex");
  const hashedCode = keccak256(toUtf8Bytes(rawCode));

  return {
    rawCode,
    hashedCode,
  };
}

module.exports = { generateCode };
