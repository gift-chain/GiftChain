import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const {ALCHEMY_SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.26",
  defaultNetwork: "sepolia",
  networks: {
    sepolia: {
      url: ALCHEMY_SEPOLIA_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY!
    }
  }
};

export default config;
