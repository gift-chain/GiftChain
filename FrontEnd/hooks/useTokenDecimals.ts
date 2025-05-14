// hooks/useTokenDecimals.ts
import { useContractRead } from "wagmi";
import { useState, useEffect } from "react";
import { erc20Abi } from "../app/constants/abi"; // Adjust path to your ERC-20 ABI

export function useTokenDecimals(tokenAddress: string) {
  const [cachedDecimals, setCachedDecimals] = useState<number | undefined>(undefined);

  const { data, isError, isLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    enabled: !!tokenAddress && tokenAddress !== "0x0", // Only fetch for valid addresses
  });

  useEffect(() => {
    if (data !== undefined) {
      setCachedDecimals(Number(data));
    }
  }, [data]);

  return {
    decimals: cachedDecimals ?? 18, // Default to 18 if undefined
    isLoading,
    isError,
  };
}