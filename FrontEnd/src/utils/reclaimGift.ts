// src/utils/reclaimGift.ts
import { ethers } from "ethers";
import GiftChainABI from "../abi/giftChainABI.json";

const CONTRACT_ADDRESS = "0xe4a0D63fd8d7f895d2077B5A2f28847Fb82B50a2";

export interface ReclaimResult {
  success: boolean;
  errorMessage?: string;
}

// src/utils/reclaimGift.ts
export const reclaimGift = async (codeHash: string, walletAddress: string): Promise<ReclaimResult> => {
    console.log("reclaimGift received codeHash:", codeHash);
console.log(ethers.keccak256(ethers.toUtf8Bytes("GiftNotFound()")).slice(0, 10)); // First 4 bytes
    if (!walletAddress) {
      return { success: false, errorMessage: "Please connect your wallet to reclaim the gift" };
    }
  
    if (!window.ethereum) {
      return { success: false, errorMessage: "Please install MetaMask or another wallet provider" };
    }
  
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, signer);
  
      const tx = await contract.reclaimGift(codeHash);
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
  
      return { success: true };
    } catch (error: any) {
      console.error("Error reclaiming gift:", error);
      let errorMessage = "Transaction failed. Please try again.";
      if (error.data?.data === "0x615b0ed0") {
        errorMessage = "Unknown custom error (0x615b0ed0). Check gift code or contract state.";
      } else if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message;
        if (reason.includes("GiftNotFound")) {
          errorMessage = "Gift card not found.";
        } else if (reason.includes("GiftAlreadyRedeemed") || reason.includes("SUCCESSFUL")) {
          errorMessage = "This gift card has already been redeemed.";
        } else if (reason.includes("GiftAlreadyReclaimed") || reason.includes("RECLAIMED")) {
          errorMessage = "This gift card has already been reclaimed.";
        } else if (reason.includes("GiftExpired")) {
          errorMessage = "This gift card is not expired yet and cannot be reclaimed.";
        } else if (reason.includes("InvalidGiftStatus")) {
          errorMessage = "You are not the creator of this gift or it has an invalid status.";
        } else {
          errorMessage = `Contract error: ${reason}`;
        }
      } else if (error.message) {
        errorMessage = `Provider error: ${error.message}`;
      }
      return { success: false, errorMessage };
    }
  };