export const tokenMap: Record<string, string> = {
    USDT: "0xf99F557Ed59F884F49D923643b1A48F834a90653",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Replace
    DAI: "0x68194a729C2450ad26072b3D33ADaCbcef39D574", // Replace
  };
  
  export const reverseTokenMap: Record<string, string> = Object.fromEntries(
    Object.entries(tokenMap).map(([symbol, address]) => [address.toLowerCase(), symbol])
  );
  
  export const tokenDecimals: Record<string, number> = {
    USDT: 6,
    USDC: 6,
    DAI: 6,
  };
  
  export const getTokenSymbol = (tokenAddress: string): string => {
    return reverseTokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 8);
  };