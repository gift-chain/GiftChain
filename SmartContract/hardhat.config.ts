import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const { ALCHEMY_SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

// Ensure environment variables are defined, or provide fallback for local testing
const sepoliaConfig = ALCHEMY_SEPOLIA_RPC_URL && PRIVATE_KEY ? {
  url: ALCHEMY_SEPOLIA_RPC_URL,
  accounts: [`0x${PRIVATE_KEY.replace(/^0x/, "")}`], // Remove '0x' if present
} : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat", // Use hardhat network for local testing
  networks: {
    hardhat: {
      // Local Hardhat network for testing
      chainId: 31337,
    },
    ...(sepoliaConfig ? { sepolia: sepoliaConfig } : {}), // Include sepolia only if configured
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "", // Fallback to empty string if undefined
    },
  },
};

export default config;

