// src/subgraph/useGiftQueries.ts
import { useQuery } from "@apollo/client";
import {
  GET_USER_GIFTS,
  GET_USER_CLAIMED_GIFTS,
  GET_USER_RECLAIMED_GIFTS,
} from "./queries";

interface GiftCreated {
  id: string;
  giftID: string;
  token: string;
  message: string;
  amount: string;
  expiry: string;
  timeCreated: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  status: "PENDING" | "CLAIMED" | "RECLAIMED";
}

interface Gift {
  id: string;
  token: string;
  message: string;
  amount: string;
  expiry: string;
  timeCreated: string;
  status: "PENDING" | "CLAIMED" | "RECLAIMED";
  claimed?: {
    id: string;
    recipient: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
  };
  reclaimed?: {
    id: string;
    creator: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
  };
}

interface GiftClaimed {
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

interface GiftReclaimed {
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
    giftsCreated: GiftCreated[];
    gifts: Gift[];
  } | null;
}

interface UserClaimedGiftsData {
  giftClaimeds: GiftClaimed[];
}

interface UserReclaimedGiftsData {
  giftReclaimeds: GiftReclaimed[];
}

export const useUserGifts = (userAddress: string) => {
  const { data, loading, error } = useQuery<UserGiftsData>(GET_USER_GIFTS, {
    variables: { userId: userAddress.toLowerCase() },
    skip: !userAddress,
  });

  return {
    giftsCreated: data?.user?.giftsCreated || [],
    gifts: data?.user?.gifts || [],
    loading,
    error,
  };
};

export const useUserClaimedGifts = (userAddress: string) => {
  const { data, loading, error } = useQuery<UserClaimedGiftsData>(
    GET_USER_CLAIMED_GIFTS,
    {
      variables: { recipient: userAddress.toLowerCase() },
      skip: !userAddress,
    }
  );

  return {
    claimedGifts: data?.giftClaimeds || [],
    loading,
    error,
  };
};

export const useUserReclaimedGifts = (userAddress: string) => {
  const { data, loading, error } = useQuery<UserReclaimedGiftsData>(
    GET_USER_RECLAIMED_GIFTS,
    {
      variables: { creator: userAddress.toLowerCase() },
      skip: !userAddress,
    }
  );

  return {
    reclaimedGifts: data?.giftReclaimeds || [],
    loading,
    error,
  };
};