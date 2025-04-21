// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {GiftErrors} from  "../Library/error.sol";

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



  // Working on validating gift

  function validateGift(string calldata rawCode) external view returns (bool){
    bytes32 codeHash = keccak256(abi.encodePacked(rawCode));
    Gift memory gift = gifts[codeHash];

    if(gift.token == address(0)){
      revert GiftErrors.GiftNotFound();
    }

    if(gift.status == Status.SUCCESSFUL){
      revert GiftErrors.GiftAlreadyRedeemed();
    }

    if(gift.status == Status.RECLAIMED) {
      revert GiftErrors.GiftAlreadyReclaimed(); 
    }

    if(gift.status != Status.PENDING){
      revert GiftErrors.InvalidGiftStatus();
    }

    return true;
  }

}