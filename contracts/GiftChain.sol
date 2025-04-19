// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract GiftChain {
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

}