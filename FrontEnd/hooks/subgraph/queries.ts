// app/subgraph/queries.ts
import { gql } from "@apollo/client";

export const GET_USER_GIFTS = gql`
  query GetUserGifts($userId: Bytes!) {
    user(id: $userId) {
      id
      gifts(orderBy: timeCreated, orderDirection: desc) {
        id
        token
        message
        amount
        expiry
        timeCreated
        status
        claimed {
          id
          recipient
          amount
          blockNumber
          blockTimestamp
          transactionHash
        }
        reclaimed {
          id
          creator
          amount
          blockNumber
          blockTimestamp
          transactionHash
        }
      }
    }
  }
`;

export const GET_USER_CLAIMED_GIFTS = gql`
  query GetUserClaimedGifts($recipient: Bytes!) {
    giftClaimeds(where: { recipient: $recipient }) {
      id
      gift {
        id
        token
        message
        amount
        expiry
        timeCreated
        status
      }
      recipient
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const GET_USER_RECLAIMED_GIFTS = gql`
  query GetUserReclaimedGifts($creator: Bytes!) {
    giftReclaimeds(where: { creator: $creator }) {
      id
      gift {
        id
        token
        message
        amount
        expiry
        timeCreated
        status
      }
      creator
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;
export const GET_GIFTS = gql`
  query GetGifts($creator: Bytes!) {
    gift(where: { creator: $creator }) {
      creator
    }
  }
`;

export const GET_SINGLE_USER_GIFTS = gql`
  query GetSingleUserGifts($creator: Bytes!, $address: Bytes!) {
    gifts(where: {
    or: [
      { creator: $creator }, 
      { recipient: $address }
    ]}, orderBy: timeCreated, orderDirection: desc) {
      id
      token
      message
      status
      recipient
      amount
      expiry
      timeCreated
      creator {
        id
      }
      claimed {
        blockTimestamp
      }
      reclaimed {
        blockTimestamp
      }
    }
  }
`;
