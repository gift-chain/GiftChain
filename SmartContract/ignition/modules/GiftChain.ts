import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GiftChainModule = buildModule("GiftChainModule", (m) => {
  // Relayer address parameter - you can override this when deploying
  const relayerAddress = m.getParameter("relayerAddress", "0xc95Cc3DC93ac91F4d0A8891ba2bfD1ACe0f51D41"); // Replace with actual relayer address

  // Deploy the GiftChain contract
  const giftChain = m.contract("GiftChain", [relayerAddress]);

  return { giftChain };
});

export default GiftChainModule;