// src/utils/tokenMapping.ts
export const tokenMapping: { [address: string]: string } = {
    "0x9092f9D0Ba4d2a027Cf7B6dD761C51cF893f2915": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    // Add more tokens as needed
  };
  
  export const getTokenSymbol = (address: string) => {
    return tokenMapping[address.toLowerCase()] || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };