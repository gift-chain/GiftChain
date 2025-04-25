import { newMockEvent } from "matchstick-as"
import { ethereum, Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  GiftClaimed,
  GiftCreated,
  GiftReclaimed
} from "../generated/GiftChain/GiftChain"

export function createGiftClaimedEvent(
  giftID: Bytes,
  recipient: Address,
  amount: BigInt
): GiftClaimed {
  let giftClaimedEvent = changetype<GiftClaimed>(newMockEvent())

  giftClaimedEvent.parameters = new Array()

  giftClaimedEvent.parameters.push(
    new ethereum.EventParam("giftID", ethereum.Value.fromFixedBytes(giftID))
  )
  giftClaimedEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )
  giftClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return giftClaimedEvent
}

export function createGiftCreatedEvent(
  giftID: Bytes,
  creator: Bytes,
  token: Address,
  message: string,
  amount: BigInt,
  expiry: BigInt,
  timeCreated: BigInt
): GiftCreated {
  let giftCreatedEvent = changetype<GiftCreated>(newMockEvent())

  giftCreatedEvent.parameters = new Array()

  giftCreatedEvent.parameters.push(
    new ethereum.EventParam("giftID", ethereum.Value.fromFixedBytes(giftID))
  )
  giftCreatedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromFixedBytes(creator))
  )
  giftCreatedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  giftCreatedEvent.parameters.push(
    new ethereum.EventParam("message", ethereum.Value.fromString(message))
  )
  giftCreatedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  giftCreatedEvent.parameters.push(
    new ethereum.EventParam("expiry", ethereum.Value.fromUnsignedBigInt(expiry))
  )
  giftCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "timeCreated",
      ethereum.Value.fromUnsignedBigInt(timeCreated)
    )
  )

  return giftCreatedEvent
}

export function createGiftReclaimedEvent(
  giftID: Bytes,
  creator: Address,
  amount: BigInt
): GiftReclaimed {
  let giftReclaimedEvent = changetype<GiftReclaimed>(newMockEvent())

  giftReclaimedEvent.parameters = new Array()

  giftReclaimedEvent.parameters.push(
    new ethereum.EventParam("giftID", ethereum.Value.fromFixedBytes(giftID))
  )
  giftReclaimedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  giftReclaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return giftReclaimedEvent
}
