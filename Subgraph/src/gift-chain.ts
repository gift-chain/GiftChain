import {
  GiftClaimed as GiftClaimedEvent,
  GiftCreated as GiftCreatedEvent,
  GiftReclaimed as GiftReclaimedEvent
} from "../generated/GiftChain/GiftChain"
import { GiftClaimed, GiftCreated, GiftReclaimed, User, Gift } from "../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"

function getOrCreateUser(id: Bytes): User {

  let user = User.load(id)
  
  if (!user) {
    user = new User(id)
    user.save()
  }
  
  return user
}

function getIdFromEventParams(giftID: Bytes, address: Bytes): string {
  return giftID.toHexString() + "-" + address.toHexString()
}

export function handleGiftCreated(event: GiftCreatedEvent): void {
  // Create Gift entity
  let gift = new Gift(event.params.giftID)
  let creator = getOrCreateUser(event.params.creator)
  
  gift.creator = creator.id
  gift.token = event.params.token
  gift.message = event.params.message
  gift.amount = event.params.amount
  gift.expiry = event.params.expiry
  gift.timeCreated = event.params.timeCreated
  gift.status = event.params.status
  gift.save()

  // Create GiftCreated event entity
  let entity = new GiftCreated(getIdFromEventParams(event.params.giftID, event.params.creator))
  entity.giftID = event.params.giftID
  entity.creator = creator.id
  entity.token = event.params.token
  entity.message = event.params.message
  entity.amount = event.params.amount
  entity.expiry = event.params.expiry
  entity.timeCreated = event.params.timeCreated
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleGiftClaimed(event: GiftClaimedEvent): void {
  // Update Gift status
  let gift = Gift.load(event.params.giftID)
  if (gift) {
    gift.status = event.params.status
    gift.recipient = event.params.recipient
    gift.save()
  }

  let entity = new GiftClaimed(getIdFromEventParams(event.params.giftID, event.params.recipient))
  // let recipient = getOrCreateUser(event.params.recipient)

  entity.gift = gift!.id
  entity.recipient = event.params.recipient
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleGiftReclaimed(event: GiftReclaimedEvent): void {
  // Update Gift status
  let gift = Gift.load(event.params.giftID)
  if (gift) {
    gift.status = event.params.status
    gift.recipient = event.params.recipient
    gift.save()
  }

  let entity = new GiftReclaimed(getIdFromEventParams(event.params.giftID, event.params.recipient))
  // let creator = getOrCreateUser(event.params.creator)

  entity.gift = gift!.id
  entity.creator = event.params.recipient
  
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}
