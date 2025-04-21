// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

library GiftErrors {

    error GiftAlreadyRedeemed();
    error GiftAlreadyReclaimed();
    error InvalidGiftStatus();
    error GiftNotFound();
}