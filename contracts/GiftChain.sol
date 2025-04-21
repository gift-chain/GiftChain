// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract GiftChain is ReentrancyGuard{
  using SafeERC20 for IERC20;

  struct Gift {
    address token;
    bool claimed;
    uint256 expiry;
    uint256 amount;
    string message;
    Status status;
  }

  enum Status {
    NONE,
    PENDING,
    SUCCESSFUL,
    RECLAIMED
  }

  mapping (bytes32 => Gift) public gifts;

  event GiftClaimed(bytes32 indexed code, address indexed recipient, uint256 amount);

  function claimGift(bytes32 code) external nonReentrant {
    Gift storage gift = gifts[code];

    // gift must exist AND be in PENDING state (ready to claim)
    require(gift.status == Status.PENDING, "Invalid gift code");

    // gift must not be expired 
    require(gift.expiry > block.timestamp, "Gift expired");

    // validates the token and amount of gift
    require(gift.token != address(0), "Invalid token");
    require(gift.amount > 0, "Invalid amount");

    //update status before transfer 
    gift.status = Status.SUCCESSFUL; // gift successfully claimed

    // transfer tokens
    IERC20(gift.token).safeTransfer(msg.sender, gift.amount);

    emit GiftClaimed(code, msg.sender, gift.amount);
  }

}