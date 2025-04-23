import hre from "hardhat";
import { verify } from "../utils/verify";

async function main() {
  const GiftChainFactory = await hre.ethers.getContractFactory("GiftChain")
  const relayer = "0xA07139110776DF9621546441fc0a5417B8E945DF"
  const gift = await GiftChainFactory.deploy(relayer);

  const deployedAddress = await gift.getAddress()

  console.log("Deployed contract to: ", deployedAddress);
  verify(deployedAddress, [relayer]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});