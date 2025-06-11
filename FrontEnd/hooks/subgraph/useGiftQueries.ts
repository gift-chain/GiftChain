// app/subgraph/useGiftQueries.ts
import { useQuery } from "@apollo/client";
import {
  GET_SINGLE_USER_GIFTS,
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

export interface SingleUserGifts {
  id: string;
  token: string;
  message: string;
  status: string;
  recipient: string;
  amount: string;
  expiry: string;
  timeCreated: string;
  creator: {
    id: string;
  }
  claimed: {
    blockTimestamp: string;
  };
  reclaimed: {
    blockTimestamp: string;
  };
}

export const useSingleUserGifts = (creator: string, address: string) => {
  const { data, loading, error, refetch: refetchGifts } = useQuery<{gifts: SingleUserGifts[]}>(GET_SINGLE_USER_GIFTS, {
    variables: { creator: creator.toLowerCase(), address: address.toLowerCase() },
    fetchPolicy: 'network-only'
  });
  
  return {
    gifts: data?.gifts || [],
    loading,
    error,
    refetchGifts,
  };
};

export const useUserGifts = (userAddress: string) => {
  // console.log("useUserGifts running, isClient:", typeof window !== "undefined");
  const { data, loading, error, refetch: refetchCreatedGifts } = useQuery<UserGiftsData>(GET_USER_GIFTS, {
    variables: { userId: userAddress.toLowerCase() },
    skip: !userAddress || !userAddress.startsWith("0x") || userAddress.length !== 66,
    fetchPolicy: 'network-only'
  });

  return {
    gifts: data?.user?.gifts || [],
    loading,
    error,
    refetchCreatedGifts,
  };
};

export const useUserClaimedGifts = (userAddress: string) => {
  // console.log("useUserClaimedGifts running, isClient:", typeof window !== "undefined");
  const { data, loading, error, refetch: refetchClaimedGifts } = useQuery<UserClaimedGiftsData>(
    GET_USER_CLAIMED_GIFTS,
    {
      variables: { recipient: userAddress.toLowerCase() },
      skip: !userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42,
      fetchPolicy: 'network-only'
    }
  );

  return {
    claimedGifts: data?.giftClaimeds || [],
    loading,
    error,
    refetchClaimedGifts,
  };
};

export const useUserReclaimedGifts = (userAddress: string) => {
  // console.log("useUserReclaimedGifts running, isClient:", typeof window !== "undefined");
  const { data, loading, error, refetch: refetchReclaimedGifts } = useQuery<UserReclaimedGiftsData>(
    GET_USER_RECLAIMED_GIFTS,
    {
      variables: { creator: userAddress.toLowerCase() },
      skip: !userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42,
      fetchPolicy: 'network-only'
    }
  );

  return {
    reclaimedGifts: data?.giftReclaimeds || [],
    loading,
    error,
    refetchReclaimedGifts
  };
};