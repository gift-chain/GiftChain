// app/subgraph/useGiftQueries.ts
import { useQuery } from "@apollo/client";
import {
  GET_USER_GIFTS,
  GET_USER_CLAIMED_GIFTS,
  GET_USER_RECLAIMED_GIFTS,
} from "./queries";

export interface Gifts {
  id: string;
  token: string;
  message: string;
  amount: string;
  expiry: string;
  timeCreated: string;
  status: "PENDING" | "CLAIMED" | "RECLAIMED";
  claimed?: {
    recipient: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
  };
  reclaimed?: {
    creator: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
  };
}

export interface GiftClaimed {
  id: string;
  recipient: string;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  gift: {
    id: string;
    token: string;
    message: string;
    amount: string;
    expiry: string;
    timeCreated: string;
    status: "PENDING" | "CLAIMED" | "RECLAIMED";
  };
}

export interface GiftReclaimed {
  id: string;
  gift: {
    id: string;
    token: string;
    message: string;
    amount: string;
    expiry: string;
    timeCreated: string;
    status: "PENDING" | "CLAIMED" | "RECLAIMED";
  };
  creator: string;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface UserGiftsData {
  user: {
    id: string;
    gifts: Gifts[];
  } | null;
}

interface UserClaimedGiftsData {
  giftClaimeds: GiftClaimed[];
}

interface UserReclaimedGiftsData {
  giftReclaimeds: GiftReclaimed[];
}

export const useUserGifts = (userAddress: string) => {
  console.log("useUserGifts running, isClient:", typeof window !== "undefined");
  const { data, loading, error } = useQuery<UserGiftsData>(GET_USER_GIFTS, {
    variables: { userId: userAddress.toLowerCase() },
    skip: !userAddress || !userAddress.startsWith("0x") || userAddress.length !== 66,
  });

  return {
    gifts: data?.user?.gifts || [],
    loading,
    error,
  };
};

export const useUserClaimedGifts = (userAddress: string) => {
  console.log("useUserClaimedGifts running, isClient:", typeof window !== "undefined");
  const { data, loading, error } = useQuery<UserClaimedGiftsData>(
    GET_USER_CLAIMED_GIFTS,
    {
      variables: { recipient: userAddress.toLowerCase() },
      skip: !userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42,
    }
  );

  return {
    claimedGifts: data?.giftClaimeds || [],
    loading,
    error,
  };
};

export const useUserReclaimedGifts = (userAddress: string) => {
  console.log("useUserReclaimedGifts running, isClient:", typeof window !== "undefined");
  const { data, loading, error } = useQuery<UserReclaimedGiftsData>(
    GET_USER_RECLAIMED_GIFTS,
    {
      variables: { creator: userAddress.toLowerCase() },
      skip: !userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42,
    }
  );

  return {
    reclaimedGifts: data?.giftReclaimeds || [],
    loading,
    error,
  };
};