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
    address sender; //added sender to track who created the gift

  }

    enum Status {
        NONE,
        PENDING,
        SUCCESSFUL,
        RECLAIMED
    }

  mapping (bytes32 => Gift) public gifts;



    function reclaimGift(string calldata rawCode) external {
        bytes32 codeHash = keccak256(abi.encodePacked(rawCode));
        Gift storage gift = gifts[codeHash];

        // Validate gift exists
        if (gift.token == address(0)) {
            revert GiftErrors.GiftNotFound();
        }

        // Validate sender is original creator
        if (msg.sender != gift.sender) {
            revert GiftErrors.InvalidGiftStatus();
        }

        // Validate gift hasn't been claimed/reclaimed
        if (gift.status == Status.SUCCESSFUL) {
            revert GiftErrors.GiftAlreadyRedeemed();
        }
        if (gift.status == Status.RECLAIMED) {
            revert GiftErrors.GiftAlreadyReclaimed();
        }

        // Validate gift is expired
        if (block.timestamp <= gift.expiry) {
            revert GiftErrors.InvalidGiftStatus();
        }

        // Update state before transfer to prevent reentrancy
        gift.status = Status.RECLAIMED;
        gift.claimed = true;

        // Handle fund transfer based on token type
        if (gift.token == address(0)) {
            // Native token transfer
            (bool success, ) = payable(msg.sender).call{value: gift.amount}("");
            require(success, "Transfer failed");
        } else {
            // ERC20 token transfer (would need IERC20 interface)
            bool success = IERC20(gift.token).transfer(msg.sender, gift.amount);
            require(success, "Token transfer failed");
            revert("ERC20 reclaim not yet implemented");
        }


    }




  

}





