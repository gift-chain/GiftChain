// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GiftErrors} from "../Library/GiftErrors.sol";

contract GiftChain is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address private relayer;

    struct Gift {
        address token;
        bool claimed;
        uint256 expiry;
        uint256 timeCreated;
        uint256 amount;
        string message;
        Status status;
        bytes32 creator;

  struct Gift {
    address token;
    bool claimed;
    uint256 expiry;
    uint256 timeCreated;
    uint256 amount;
    string message;
    Status status;
    bytes32 creator;
  }

  enum Status {
    NONE,
    PENDING,
    SUCCESSFUL,
    RECLAIMED
  }

  mapping (bytes32 => Gift) public gifts;


  event GiftClaimed(bytes32 indexed code, address indexed recipient, uint256 amount);

  event GiftCreated(bytes32 indexed, address indexed, string indexed, uint256, uint256);

  event GiftReclaimed(bytes32 indexed code, address indexed recipient, uint256 amount);


  constructor(address _relayer) {
    relayer = _relayer;
  }

  modifier onlyRelayer {
    if(msg.sender != relayer) revert GiftErrors.ONLY_RELAYER_HAS_ACCESS();
    _;
  }
  

  function createGift(
    address _token, 
    uint256 _amount, 
    uint256 _expiry, 
    string memory _message,
    bytes32 _giftID,
    bytes32 _creator
    ) external onlyRelayer() {
    if(_token == address(0)) revert GiftErrors.INVALID_ADDRESS();
    if(_amount <= 0) revert GiftErrors.INVALID_AMOUNT();
    if(_expiry <= block.timestamp) revert GiftErrors.EXPIRY_CAN_ONLY_BE_IN_FUTURE();
    if(bytes(_message).length < 3 || bytes(_message).length > 50) revert GiftErrors.EXPECT_3_TO_50_MESSAGE_CHARACTER();
    if(gifts[_giftID].timeCreated != 0) revert GiftErrors.CARD_ALREADY_EXIST();
    IERC20 token = IERC20(_token);

    if(!token.transferFrom(msg.sender, address(this), _amount)) revert GiftErrors.TRANSFER_FAILED();

    gifts[_giftID] = Gift({
      token: _token,
      claimed: false,
      timeCreated: block.timestamp,
      expiry: _expiry,
      amount: _amount,
      message: _message,
      status: Status.PENDING,
      creator: _creator
    });

    emit GiftCreated(_giftID, _token, _message, _amount, _expiry);
  }


  function claimGift(bytes32 giftID) external nonReentrant {
    Gift storage gift = gifts[giftID];

    // validates the token and amount of gift
    if(gift.token == address(0)) revert GiftErrors.INVALID_GIFTID();
    if(gift.amount == 0) revert GiftErrors.GIFT_NOT_CLAIMABLE();

    // gift must exist AND be in PENDING state (ready to claim)
    if(gift.status != Status.PENDING) revert GiftErrors.GIFT_CLAIMED();

    // gift must not be expired 
    if(gift.expiry < block.timestamp) revert GiftErrors.GIFT_EXPIRED();

    if(gift.creator == keccak256(abi.encodePacked(msg.sender))) revert GiftErrors.CREATOR_CANNOT_CLAIM_GIFT();


    //update status before transfer 
    gift.status = Status.SUCCESSFUL; // gift successfully claimed

    // transfer tokens
    IERC20(gift.token).safeTransfer(msg.sender, gift.amount);

    emit GiftClaimed(giftID, msg.sender, gift.amount);

  }
  function reclaimGift(bytes32 giftID) external nonReentrant {
    Gift storage gift = gifts[giftID];

    if (gift.token == address(0)) {
        revert GiftErrors.GiftNotFound();
    }

    // Validate sender is original creator
    if (keccak256(abi.encodePacked(msg.sender)) != gift.creator) {
        revert GiftErrors.NOT_AUTHORIZE_TO_RECLAIM_GIFT();
    }

    // Validate gift status
    if (gift.status == Status.SUCCESSFUL) {
        revert GiftErrors.GiftAlreadyRedeemed();
    }
    if (gift.status == Status.RECLAIMED) {
        revert GiftErrors.GiftAlreadyReclaimed();
    }
    if (block.timestamp <= gift.expiry) {
        revert GiftErrors.GIFT_NOT_EXPIRED_YET();
    }

    // Update state before transfer
    gift.status = Status.RECLAIMED;
    gift.claimed = true;

    // Transfer ERC20 tokens back to creator
    IERC20(gift.token).safeTransfer(msg.sender, gift.amount);

    emit GiftReclaimed(giftID, msg.sender, gift.amount);
}
  // Working on validating gift

  function validateGift(bytes32 giftID) external view returns (bool){
    Gift memory gift = gifts[giftID];

    if(gift.token == address(0)){
      revert GiftErrors.GiftNotFound();
    }

    enum Status {
        NONE,
        PENDING,
        SUCCESSFUL,
        RECLAIMED
    }

    mapping(bytes32 => Gift) public gifts;

    event GiftClaimed(bytes32 indexed code, address indexed recipient, uint256 amount);
    event GiftCreated(bytes32 indexed giftId, address indexed token, string indexed message, uint256 amount, uint256 expiry);
    event GiftReclaimed(bytes32 indexed code, address indexed recipient, uint256 amount);

    constructor(address _relayer) {
        relayer = _relayer;
    }

    modifier onlyRelayer {
        if (msg.sender != relayer) revert GiftErrors.ONLY_RELAYER_HAS_ACCESS();
        _;
    }

    function createGift(
        address _token,
        uint256 _amount,
        uint256 _expiry,
        string memory _message,
        bytes32 _giftID,
        bytes32 _creator
    ) external onlyRelayer {
        if (_token == address(0)) revert GiftErrors.INVALID_ADDRESS();
        if (_amount <= 0) revert GiftErrors.INVALID_AMOUNT();
        if (_expiry <= block.timestamp) revert GiftErrors.EXPIRY_CAN_ONLY_BE_IN_FUTURE();
        if (bytes(_message).length < 3 || bytes(_message).length > 50) revert GiftErrors.EXPECT_3_TO_50_MESSAGE_CHARACTER();
        if (gifts[_giftID].timeCreated != 0) revert GiftErrors.CARD_ALREADY_EXIST();
        IERC20 token = IERC20(_token);

        token.safeTransferFrom(msg.sender, address(this), _amount);

        gifts[_giftID] = Gift({
            token: _token,
            claimed: false,
            timeCreated: block.timestamp,
            expiry: _expiry,
            amount: _amount,
            message: _message,
            status: Status.PENDING,
            creator: _creator
        });

        emit GiftCreated(_giftID, _token, _message, _amount, _expiry);
    }

    function claimGift(bytes32 code) external nonReentrant {
        Gift storage gift = gifts[code];

        if (gift.token == address(0)) revert GiftErrors.GiftNotFound();
        if (gift.status != Status.PENDING) revert GiftErrors.InvalidGiftStatus();
        if (gift.expiry <= block.timestamp) revert GiftErrors.GiftExpired();
        if (gift.amount == 0) revert GiftErrors.INVALID_AMOUNT();

        gift.status = Status.SUCCESSFUL;
        IERC20(gift.token).safeTransfer(msg.sender, gift.amount);
        emit GiftClaimed(code, msg.sender, gift.amount);
    }

    function validateGift(string calldata rawCode) external view returns (bool) {
        bytes32 codeHash = keccak256(abi.encodePacked(rawCode));
        Gift memory gift = gifts[codeHash];

        if (gift.token == address(0)) {
            revert GiftErrors.GiftNotFound();
        }

        if (gift.status == Status.SUCCESSFUL) {
            revert GiftErrors.GiftAlreadyRedeemed();
        }

        if (gift.status == Status.RECLAIMED) {
            revert GiftErrors.GiftAlreadyReclaimed();
        }

        if (gift.status != Status.PENDING) {
            revert GiftErrors.InvalidGiftStatus();
        }

        return true;
    }

    function reclaimGift(string calldata rawCode) external nonReentrant {
        bytes32 codeHash = keccak256(abi.encodePacked(rawCode));
        Gift storage gift = gifts[codeHash];

        if (gift.token == address(0)) revert GiftErrors.GiftNotFound();
        if (gift.status == Status.SUCCESSFUL) revert GiftErrors.GiftAlreadyRedeemed();
        if (gift.status == Status.RECLAIMED) revert GiftErrors.GiftAlreadyReclaimed();
        if (block.timestamp <= gift.expiry) revert GiftErrors.GiftExpired();
        if (gift.creator != keccak256(abi.encodePacked(msg.sender))) revert GiftErrors.InvalidGiftStatus();

        gift.status = Status.RECLAIMED;
        gift.claimed = true;
        IERC20(gift.token).safeTransfer(msg.sender, gift.amount);
        emit GiftReclaimed(codeHash, msg.sender, gift.amount);
    }
}
  }
}
