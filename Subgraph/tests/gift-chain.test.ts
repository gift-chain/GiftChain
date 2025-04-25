import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as"
import { Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import { GiftClaimed } from "../generated/schema"
import { GiftClaimed as GiftClaimedEvent } from "../generated/GiftChain/GiftChain"
import { handleGiftClaimed } from "../src/gift-chain"
import { createGiftClaimedEvent } from "./gift-chain-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let giftID = Bytes.fromI32(1234567890)
    let recipient = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let amount = BigInt.fromI32(234)
    let newGiftClaimedEvent = createGiftClaimedEvent(giftID, recipient, amount)
    handleGiftClaimed(newGiftClaimedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("GiftClaimed created and stored", () => {
    assert.entityCount("GiftClaimed", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "GiftClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "giftID",
      "1234567890"
    )
    assert.fieldEquals(
      "GiftClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "recipient",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "GiftClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amount",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
