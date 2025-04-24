// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

library GiftErrors {
    error ONLY_RELAYER_HAS_ACCESS();
    error INVALID_ADDRESS();
    error INVALID_AMOUNT();
    error EXPIRY_CAN_ONLY_BE_IN_FUTURE();
    error EXPECT_3_TO_50_MESSAGE_CHARACTER();
    error CARD_ALREADY_EXIST();
    error TRANSFER_FAILED();
    error GiftAlreadyRedeemed();
    error GiftAlreadyReclaimed();
    error InvalidGiftStatus();
    error GiftNotFound();
    error GiftExpired();
}