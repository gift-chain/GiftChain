import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";

const clientId = "BK3oQ3ZOwv9frm_1fN5ZZv-p2G7kWxxl0UjKPSGHrwrt7zb0F6CmCSwnBUwP2GojHMeJWXd0bi6qW7klUrsXruY"; // Replace with your actual client ID from https://dashboard.web3auth.io

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // Change to SAPPHIRE_MAINNET for production
  },
};

export default web3AuthContextConfig;