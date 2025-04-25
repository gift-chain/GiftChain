export const ERC20_ABI = [
  'function transferFrom(address from, address to, uint256 value) external returns (bool)',
  'function transfer(address to, uint256 value) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];