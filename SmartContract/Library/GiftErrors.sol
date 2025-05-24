// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

library GiftErrors {
    error ONLY_RELAYER_HAS_ACCESS();
    error INVALID_ADDRESS();
    error INVALID_AMOUNT();
    error EXPIRY_CAN_ONLY_BE_IN_FUTURE();
    error EXPECT_3_TO_50_MESSAGE_CHARACTER();
    error CREATOR_CANNOT_CLAIM_GIFT();
    error CARD_ALREADY_EXIST();
    error TRANSFER_FAILED();
    error INVALID_GIFTID();
    error GIFT_NOT_CLAIMABLE();
    error GIFT_CLAIMED();
    error GIFT_EXPIRED();
    error GIFT_NOT_EXPIRED_YET();
    error NOT_AUTHORIZE_TO_RECLAIM_GIFT();
    error ARRAY_LENGTH_MISMATCH();
    error BULK_CREATION_FAILED();
    error ONLY_CONTRACT_HAS_ACCESS();
    error INVALID_CREATOR();
    error CREATOR_MISMATCH();
    error BULK_CREATION_MUST_BE_AT_LEAST_5();
    error GiftAlreadyRedeemed();
    error GiftAlreadyReclaimed();
    error InvalidGiftStatus();
    error GiftNotFound();
    error GiftExpired();
}