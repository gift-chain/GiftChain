import { run } from "hardhat";

interface VerifyArgs {
  address: string;
  constructorArguments: any[];
}

export const verify = async (contractAddress: string, args: any[]): Promise<void> => {
  console.log("verifying contract....");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    } as VerifyArgs);
  } catch (err: any) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified!");
    } else {
      console.log(err)
    }
  }
};

// module.exports = { verify }