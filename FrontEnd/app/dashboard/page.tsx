"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Gift,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  CreditCard,
  DollarSign,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import WalletConnect from "@/components/wallet-connect";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserGifts, useUserClaimedGifts, useUserReclaimedGifts, Gifts, useSingleUserGifts } from "../../hooks/subgraph/useGiftQueries";
import { ethers, formatUnits } from "ethers";
import axios from "axios";
import { useAccount } from "wagmi";
import giftChainABI from "../../abi/GiftChain.json";
import ERC20_ABI from "@/abi/ERC20_ABI.json";

// Chart components (ensure these exist in your project)
import { AreaChart, BarChart, PieChart as PieChartComponent } from "@/components/ui/chart";

// Contract address
// const CONTRACT_ADDRESS = "0x280593931820aBA367dB060162cA03CD59EC29c9";

// Stable coins address supported
const USDT = '0x7A8532Bd4067cD5C9834cD0eCcb8e71088c9fbf8'; // Sepolia USDT
const USDC = '0x437011e4f16a4Be60Fe01aD6678dBFf81AEbaEd4'; // Sepolia USDC
const DAI = '0xA0c61934a9bF661c0f41db06538e6674CDccFFf2'; // Sepolia DAI
const PROVIDER_URL = "https://eth-sepolia.g.alchemy.com/v2/uoHUh-NxGIzghN1job_SDZjGuQQ7snrT"

// const provider = new ethers.JsonRpcProvider(PROVIDER_URL)


// Interfaces
interface Stats {
  totalCreated: number;
  totalReceived: number;
  totalGiftValue: string;
  claimRate: string;
  createdGrowth: string;
  receivedGrowth: string;
  claimRateGrowth: string;
}

// interface GiftCard {
//   id: string;
//   amount: string;
//   recipient: string;
//   message: string;
//   expiryDate: string;
//   status: string;
//   createdDate: string;
//   claimedDate: string | null;
//   theme: string;
//   sender?: string;
//   timeCreated?: string;
// }

interface GiftCard {
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
  };
}

interface TokenBalance {
  raw: bigint;
  formatted: string;
  decimal: bigint;
  symbol: string;
}

interface TokenBalances {
  USDT: TokenBalance;
  USDC: TokenBalance;
  DAI: TokenBalance;
}

interface ChartData {
  name: string;
  total: number;
}

interface PieChartData {
  name: string;
  value: number;
}

// Pagination Component
const Pagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0 border glow-border"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0 border glow-border"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0 border glow-border"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0 border glow-border"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function Dashboard() {
  const [isConnectedd, setIsConnected] = useState(false);
  // const [mounted, setMounted] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [giftIDs, setGiftIDs] = useState<{ [key: string]: string }>({});
  const [timeRange, setTimeRange] = useState("month");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realTimeGifts, setRealTimeGifts] = useState<Gifts[]>([]);
  const [tokenMetadataCache, setTokenMetadataCache] = useState<Record<string, { symbol: string; decimals: number }>>({});
  // const [stats, setStats] = useState<Stats>({
  //   totalCreated: 0,
  //   totalReceived: 0,
  //   totalGiftValue: "0.00",
  //   claimRate: "0",
  //   createdGrowth: "0",
  //   receivedGrowth: "0",
  //   claimRateGrowth: "0",
  // });
  const [createdGiftCards, setCreatedGiftCards] = useState<GiftCard[]>([]);
  const [receivedGiftCards, setReceivedGiftCards] = useState<GiftCard[]>([]);
  const [areaChartData, setAreaChartData] = useState<ChartData[]>([]);
  const [barChartData, setBarChartData] = useState<ChartData[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {refetchCreatedGifts} = useUserGifts(userAddress);
  const {refetchClaimedGifts} = useUserClaimedGifts(userAddress);
  const {refetchReclaimedGifts} = useUserReclaimedGifts(userAddress);

  // Pagination states
  const [createdCurrentPage, setCreatedCurrentPage] = useState(1);
  const [receivedCurrentPage, setReceivedCurrentPage] = useState(1);
  const [cardsPerPage] = useState(6);

  const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [giftIdCodes, setGiftIdCodes] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState("created");
    const [tokenBalances, setTokenBalances] = useState<TokenBalances>({
      USDT: { raw: BigInt(0), formatted: "0", decimal: BigInt(6), symbol: "" },
      USDC: { raw: BigInt(0), formatted: "0", decimal: BigInt(6), symbol: "" },
      DAI: { raw: BigInt(0), formatted: "0", decimal: BigInt(6), symbol: "" }
    });
    // const { toast } = useToast();
  
    const hashedAddress = useMemo(
      () => (address ? ethers.keccak256(ethers.getAddress(address)).toLowerCase() : ''),
      [address]
    );
  
    // Use useSingleUserGifts hook to fetch gifts
    const { gifts = [], loading, error, refetchGifts } = useSingleUserGifts(hashedAddress, address ? address : "");
  
    // Categorize gifts - only created and received (claimed)
    const createdGifts = useMemo(
      () => gifts.filter((gift: GiftCard) => gift.creator.id === hashedAddress),
      [gifts, hashedAddress]
    );
    const receivedGifts = useMemo(
      () => gifts.filter((gift: GiftCard) => gift.creator.id !== hashedAddress && gift.recipient == address?.toLowerCase()),
      [gifts, hashedAddress, address]
    );
    const reclaimedGifts = useMemo(
      () => gifts.filter((gift: GiftCard) => gift.creator.id === hashedAddress && gift.recipient == address?.toLowerCase()),
      [gifts, hashedAddress, address]
    );

    const formatDate = (timestamp: string): string => {
        return new Date(Number.parseInt(timestamp) * 1000).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }
    
    const fetchTokenInfo = async (tokenAddress: string) => {
      const address = tokenAddress.toLowerCase();
      if (tokenMetadataCache[address]) {
        return tokenMetadataCache[address];
      }
  
      console.log("Fetching token metadata for:", address);
      try {
          const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
          
          const tokenContract = new ethers.Contract(USDT, ERC20_ABI, provider);
  
          const [
            tokenDecimal,
            tokenSymbol,
          ] = await Promise.all([
            tokenContract.decimals(),
            tokenContract.symbol(),
          ]);
  
          setTokenMetadataCache({
            ...tokenMetadataCache,
            [address]: {
              symbol: tokenSymbol,
              decimals: tokenDecimal,
            },
          });
        } catch (error) {
          console.error('Error fetching token info:', error);
        }
    }
  
    // Calculate stats
    const stats = useMemo(() => {
      // const allGifts = [...createdGifts, ...receivedGifts];
      // const symbol = Gift.token
      return {
        totalGifts: gifts.length,
        totalValue: gifts.reduce((sum, gift) => {
          let decimal;
          if(gift.token == USDC.toLowerCase()) {
            decimal = tokenBalances.USDC.decimal
          } else if(gift.token == USDT.toLowerCase()) {
            decimal = tokenBalances.USDT.decimal
          } else if(gift.token == DAI.toLowerCase()){
            decimal = tokenBalances.DAI.decimal
          } else {
            decimal = 18
          }
          return sum + Number(formatUnits(gift.amount, decimal))}, 0
        ),
        activeGifts: gifts.filter(gift => gift.status === "PENDING").length,
        totalClaimed: gifts.filter(gift => gift.creator.id === hashedAddress && gift.status !== "PENDING").length
      };
    }, [gifts]);
  
    // Fetch token balances
    useEffect(() => {
      const fetchTokenBalances = async () => {
        if (!address || !isConnected) return;
  
        try {
          const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
          // const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
          
          const USDTContract = new ethers.Contract(USDT, ERC20_ABI, provider);
          const USDCContract = new ethers.Contract(USDC, ERC20_ABI, provider);
          const DAIContract = new ethers.Contract(DAI, ERC20_ABI, provider);
  
          const [
            USDTBalance, USDTDecimal, USDTSymbol,
            USDCBalance, USDCDecimal, USDCSymbol,
            DAIBalance, DAIDecimal, DAISymbol
          ] = await Promise.all([
            USDTContract.balanceOf(address),
            USDTContract.decimals(),
            USDTContract.symbol(),
            USDCContract.balanceOf(address),
            USDCContract.decimals(),
            USDCContract.symbol(),
            DAIContract.balanceOf(address),
            DAIContract.decimals(),
            DAIContract.symbol(),
          ]);
  
          setTokenBalances({
            USDT: {
              raw: USDTBalance,
              formatted: ethers.formatUnits(USDTBalance, USDTDecimal),
              decimal: USDTDecimal,
              symbol: USDTSymbol
            },
            USDC: {
              raw: USDCBalance,
              formatted: ethers.formatUnits(USDCBalance, USDCDecimal),
              decimal: USDCDecimal,
              symbol: USDCSymbol
            },
            DAI: {
              raw: DAIBalance,
              formatted: ethers.formatUnits(DAIBalance, DAIDecimal),
              decimal: DAIDecimal,
              symbol: DAISymbol
            }
          });
        } catch (error) {
          console.error('Error fetching token balances:', error);
        }
      };
  
      fetchTokenBalances();
      }, [address, isConnected]);
  
     // Helper function to determine gift status
     const getGiftStatus = useCallback((gift: GiftCard) => {
      const now = Math.floor(Date.now() / 1000);
      const isExpired = Number(gift.expiry) < now;
      
      // if (gift.creator.id === hashedAddress && gift.recipient === address?.toLowerCase()) {
      if (gift.status === "RECLAIMED") {
        return {
          status: "RECLAIMED",
          variant: "secondary" as const
        };
      }
  
      if (gift.status === "CLAIMED") {
        return {
          status: "CLAIMED",
          variant: "default" as const
        };
      }
      
      if (isExpired) {
        return {
          status: "EXPIRED",
          variant: "destructive" as const
        };
      }
      
      return {
        status: "PENDING",
        variant: "default" as const
      };
    }, []);
  
    // Efficiently fetch all gift ID codes from backend
    useEffect(() => {
      if (!gifts.length) return;
      const idsToFetch = gifts
        .map((g: GiftCard) => g.id.toLowerCase())
        .filter((id: string) => !(id in giftIdCodes));
      if (!idsToFetch.length) return;
  
      axios
        .post('https://gift-chain-w3lp.vercel.app/api/gift-codes', { ids: idsToFetch })
        .then((res: { data: Record<string, Record<string, string>> }) => {
          const {data} = res; 
          setGiftIdCodes((prev) => ({ ...prev, ...data.data }));
        })
        .catch(console.error);
    }, [gifts]);
  
    useEffect(() => {
      setMounted(true);
    }, []);
    if (!mounted) return null;
  
    if (loading) {
      return (
        <div className="container px-4 py-8 hexagon-bg">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Spinner className="w-8 h-8" />
          </div>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="container px-4 py-8 hexagon-bg">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-lg text-red-500">Failed to load gifts</p>
            <Button onClick={() => refetchGifts()}>
              {loading ? <Spinner className="w-8 h-8" /> : "Retry"}
            </Button>
          </div>
        </div>
      );
    }

  // // Compute dashboard data
  // const computeData = useCallback(async () => {
  //   if (loading) {
  //     console.log("Skipping computeData: Subgraph still loading");
  //     return;
  //   }

  //   // computeDataCount.current += 1;
  //   // console.log(`computeData run #${computeDataCount.current}`);
  //   // setIsLoading(true);

  //   try {
  //     // Initialize Sets for status checks
  //     const reclaimedGiftIds = new Set(reclaimedGifts.map((r) => r.id.toLowerCase()));
  //     const receivedGiftIds = new Set(receivedGifts.map((c) => c.id.toLowerCase()));
  //     const currentDate = new Date();

  //     // Debug: Log claimedGifts and claimedGiftIds
  //     console.log("claimedGifts:", receivedGiftIds);
  //     console.log("claimedGiftIds:", Array.from(receivedGiftIds));

  //     // Stats
  //     let totalGiftValue = 0;
  //     const totalCreated = createdGifts.length;
  //     const totalReceived = receivedGifts.length;
  //     const claimedCount = receivedGifts.length;
  //     const claimRate = totalCreated > 0 ? (claimedCount / totalCreated) * 100 : 0;

  //     // for (const gift of gifts) {
  //     //   const { decimals } = await token(gift.token);
  //     //   const amount = parseFloat(formatUnits(gift.amount, decimals));
  //     //   totalGiftValue += amount;
  //     // }

  //     // Stable growth percentages
  //     const createdGrowth = totalCreated > 0 ? ((totalCreated % 10) + 5).toString() : "0";
  //     const receivedGrowth = totalReceived > 0 ? ((totalReceived % 15) + 10).toString() : "0";
  //     const claimRateGrowth = claimRate > 0 ? ((claimRate % 5) + 3).toString() : "0";

  //     setStats({
  //       totalCreated,
  //       totalReceived,
  //       totalGiftValue: totalGiftValue.toFixed(2),
  //       claimRate: claimRate.toFixed(0),
  //       createdGrowth,
  //       receivedGrowth,
  //       claimRateGrowth,
  //     });

  //     // Created gift cards
  //     const newCreatedGiftCards: GiftCard[] = [];
  //     for (const gift of allGifts) {
  //       const { symbol, decimals } = await fetchTokenMetadata(gift.token);
  //       const expiryDate = new Date(parseInt(gift.expiry) * 1000);
  //       const isExpired = expiryDate < currentDate;
  //       const isReclaimed = reclaimedGiftIds.has(gift.id.toLowerCase());
  //       const isClaimed = claimedGiftIds.has(gift.id.toLowerCase()) || !!gift.claimed;
  //       const formattedAmount = parseFloat(formatUnits(gift.amount, decimals)).toFixed(2);

  //       // Debug: Log status checks for each gift
  //       console.log(`Gift ${gift.id} status checks:`, {
  //         isClaimed,
  //         isReclaimed,
  //         isExpired,
  //         hasClaimedData: !!gift.claimed,
  //         inClaimedGiftIds: claimedGiftIds.has(gift.id.toLowerCase()),
  //       });

  //       let status: string;
  //       if (isReclaimed) {
  //         status = "reclaimed";
  //       } else if (isClaimed) {
  //         status = "claimed";
  //       } else if (isExpired && !isClaimed) {
  //         status = "expired";
  //       } else {
  //         status = "pending";
  //       }

  //       newCreatedGiftCards.push({
  //         id: giftIDs[gift.id.toLowerCase()] || "",
  //         amount: `${formattedAmount} ${symbol}`,
  //         recipient: gift.claimed?.recipient
  //           ? `${gift.claimed.recipient.slice(0, 6)}...${gift.claimed.recipient.slice(-4)}`
  //           : "N/A",
  //         message: gift.message || "No message",
  //         expiryDate: expiryDate.toISOString().split("T")[0],
  //         status,
  //         createdDate: new Date(parseInt(gift.timeCreated) * 1000).toISOString().split("T")[0],
  //         claimedDate: gift.claimed
  //           ? new Date(parseInt(gift.claimed.blockTimestamp) * 1000).toISOString().split("T")[0]
  //           : null,
  //         theme: `theme-${Math.floor(Math.random() * 5) + 1}`,
  //       });
  //     }
  //     console.log("Setting createdGiftCards:", newCreatedGiftCards);
  //     setCreatedGiftCards(newCreatedGiftCards);

  //     // Received gift cards
  //     const newReceivedGiftCards: GiftCard[] = [];
  //     for (const claimed of claimedGifts) {
  //       const { symbol, decimals } = await fetchTokenMetadata(claimed.gift.token);
  //       const expiryDate = new Date(parseInt(claimed.gift.expiry) * 1000);
  //       const formattedAmount = parseFloat(formatUnits(claimed.amount, decimals)).toFixed(2);

  //       newReceivedGiftCards.push({
  //         id: giftIDs[claimed.gift.id.toLowerCase()] || "",
  //         amount: `${formattedAmount} ${symbol}`,
  //         recipient: userAddress,
  //         sender: "N/A",
  //         message: claimed.gift.message || "No message",
  //         expiryDate: expiryDate.toISOString().split("T")[0],
  //         status: "claimed",
  //         createdDate: new Date(parseInt(claimed.gift.timeCreated) * 1000).toISOString().split("T")[0],
  //         timeCreated: new Date(parseInt(claimed.gift.timeCreated) * 1000).toISOString().split("T")[0],
  //         claimedDate: new Date(parseInt(claimed.blockTimestamp) * 1000).toISOString().split("T")[0],
  //         theme: `theme-${Math.floor(Math.random() * 5) + 1}`,
  //       });
  //     }
  //     console.log("Setting receivedGiftCards:", newReceivedGiftCards);
  //     setReceivedGiftCards(newReceivedGiftCards);

  //     // Area chart data
  //     const monthlyData: { [key: string]: number } = {};
  //     for (const gift of gifts) {
  //       const date = new Date(parseInt(gift.timeCreated) * 1000);
  //       const month = date.toLocaleString("default", { month: "short" });
  //       const { decimals } = await fetchTokenMetadata(gift.token);
  //       const amount = parseFloat(formatUnits(gift.amount, decimals));
  //       monthlyData[month] = (monthlyData[month] || 0) + amount;
  //     }
  //     const newAreaChartData = [
  //       "Jan",
  //       "Feb",
  //       "Mar",
  //       "Apr",
  //       "May",
  //       "Jun",
  //       "Jul",
  //       "Aug",
  //       "Sep",
  //       "Oct",
  //       "Nov",
  //       "Dec",
  //     ].map((month) => ({
  //       name: month,
  //       total: monthlyData[month] || 0,
  //     }));
  //     console.log("Setting areaChartData:", newAreaChartData);
  //     setAreaChartData(newAreaChartData);

  //     // Bar chart data
  //     const tokenCounts: { [key: string]: number } = {};
  //     for (const gift of allGifts) {
  //       const { symbol } = await fetchTokenMetadata(gift.token);
  //       tokenCounts[symbol] = (tokenCounts[symbol] || 0) + 1;
  //     }
  //     const newBarChartData = Object.entries(tokenCounts).map(([name, total]) => ({
  //       name,
  //       total,
  //     }));
  //     console.log("Setting barChartData:", newBarChartData);
  //     setBarChartData(newBarChartData);

  //     // Pie chart data
  //     const statusCounts = {
  //       Claimed: 0,
  //       Pending: 0,
  //       Expired: 0,
  //       Reclaimed: 0,
  //     };

  //     for (const gift of allGifts) {
  //       const giftId = gift.id.toLowerCase();
  //       const expiryDate = new Date(parseInt(gift.expiry) * 1000);
  //       const isExpired = expiryDate < currentDate;
  //       const isClaimed = claimedGiftIds.has(giftId) || !!gift.claimed;
  //       const isReclaimed = reclaimedGiftIds.has(giftId);

  //       let status: string;
  //       if (isReclaimed) {
  //         statusCounts.Reclaimed += 1;
  //         status = "Reclaimed";
  //       } else if (isClaimed) {
  //         statusCounts.Claimed += 1;
  //         status = "Claimed";
  //       } else if (isExpired && !isClaimed) {
  //         statusCounts.Expired += 1;
  //         status = "Expired";
  //       } else {
  //         statusCounts.Pending += 1;
  //         status = "Pending";
  //       }
  //       console.log(`Pie chart - Gift ${giftId} status: ${status}`, {
  //         isClaimed,
  //         isReclaimed,
  //         isExpired,
  //         hasClaimedData: !!gift.claimed,
  //       });
  //     }

  //     const newPieChartData = Object.entries(statusCounts)
  //       .filter(([_, value]) => value > 0)
  //       .map(([name, value]) => ({
  //         name,
  //         value,
  //       }));
  //     console.log("Setting pieChartData:", newPieChartData);
  //     setPieChartData(newPieChartData);
  //   } catch (error) {
  //     console.error("Error computing data:", error);
  //     setStats({
  //       totalCreated: 0,
  //       totalReceived: 0,
  //       totalGiftValue: "0.00",
  //       claimRate: "0",
  //       createdGrowth: "0",
  //       receivedGrowth: "0",
  //       claimRateGrowth: "0",
  //     });
  //     setCreatedGiftCards([]);
  //     setReceivedGiftCards([]);
  //     setAreaChartData(
  //       ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => ({
  //         name: month,
  //         total: 0,
  //       }))
  //     );
  //     setBarChartData([]);
  //     setPieChartData([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [gifts]);
  // // Run computeData with debounce
  // useEffect(() => {
  //   if (!userAddress || !isConnected || giftsLoading || claimedLoading || reclaimedLoading) return;

  //   const timer = setTimeout(() => {
  //     console.log("Triggering computeData");
  //     computeData();
  //   }, 500);

  //   return () => clearTimeout(timer);
  // }, [computeData, userAddress, isConnected, giftsLoading, claimedLoading, reclaimedLoading]);

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-20 text-center md:px-6 hexagon-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-text">
            Your Gift Dashboard
          </h1>
          <p className="mt-4 text-muted-foreground">
            Connect your wallet to view your created and received gifts.
          </p>
          <div className="mt-8">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
            >
              Connect Wallet
            </Button>
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <WalletConnect handleModal={() => setIsModalOpen(false)} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }
        
  return (
    <div className="container px-4 py-8 hexagon-bg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-text">
          Your Gift Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">Manage your created and received gifts</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between glass rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <p>Token Balance</p>
          <Badge variant="outline" className="px-3 py-3 border glow-border text-foreground">
            <span className="mr-1 h-2 w-2 rounded-full bg-primary"></span> {tokenBalances.USDT.formatted} USDT
          </Badge>
          <Badge variant="outline" className="px-3 py-3 border glow-border text-foreground">
            <span className="mr-1 h-2 w-2 rounded-full bg-primary"></span> {tokenBalances.USDC.formatted} USDC
          </Badge>
          <Badge variant="outline" className="px-3 py-3 border glow-border text-foreground">
            <span className="mr-1 h-2 w-2 rounded-full bg-primary"></span> {tokenBalances.DAI.formatted} DAI
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
            <Link href="/create">
              Create New Gift <Gift className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border hover:bg-primary/10 glow-border">
            <Link href="/gift">Manage Gifts</Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Total Created</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{createdGifts.length}</div>
            <div className="mt-1 flex items-center text-xs text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              {/* +{stats.createdGrowth}% from last month */}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Total Received</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{receivedGifts.length}</div>
            <div className="mt-1 flex items-center text-xs text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              {/* +{stats.receivedGrowth}% from last month */}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Total Gift Claimed</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{stats.totalClaimed}</div>
            <div className="mt-1 flex items-center text-xs text-muted-foreground">≈ </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Gifts Not Yet Claimed</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{stats.activeGifts}</div>
            <div className="mt-1 flex items-center text-xs text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              {/* +{stats.claimRateGrowth}% from last month */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold gradient-text">Analytics</h2>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-card border glow-border">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="bg-card border glow-border">
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="flex-1 glass glow-card" style={{ minHeight: "250px" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Gift Activity</CardTitle>
                <CardDescription>Monthly gift creation and claims</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {areaChartData.length === 0 ? (
                <p className="text-center text-muted-foreground">No data available</p>
              ) : (
                <div className="h-[200px] w-full">
                  <AreaChart
                    data={areaChartData}
                    index="name"
                    categories={["total"]}
                    colors={["#00ddeb"]}
                    valueFormatter={(value: number) => `$${value.toFixed(2)}`}
                    className="h-full w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="flex-1 glass glow-card" style={{ minHeight: "250px" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Currency Distribution</CardTitle>
                <CardDescription>Gifts by currency type</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {barChartData.length === 0 ? (
                <p className="text-center text-muted-foreground">No data available</p>
              ) : (
                <div className="h-[200px] w-full">
                  <BarChart
                    data={barChartData}
                    index="name"
                    categories={["total"]}
                    colors={["#00b7eb"]}
                    valueFormatter={(value: number) => `${value} gifts`}
                    className="h-full w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="flex-1 glass glow-card" style={{ minHeight: "250px" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Status Distribution</CardTitle>
                <CardDescription>Current gift statuses</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {pieChartData.length === 0 ? (
                <p className="text-center text-muted-foreground">No gift data available</p>
              ) : (
                <div className="h-[200px] w-full">
                  <PieChartComponent
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    colors={["#39ff14", "#00ddeb", "#ff00ff", "#00b7eb"]} // Claimed, Pending, Expired, Reclaimed
                    valueFormatter={(value: number) => `${value}`}
                    className="h-full w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar View */}
      <div className="mb-8">
        <Card className="glass glow-card">
          <CardHeader>
            <CardTitle className="gradient-text">Upcoming Expirations</CardTitle>
            <CardDescription>Gifts that will expire soon</CardDescription>
          </CardHeader>
          <CardContent>
            {createdGifts.filter((card) => card.status === "PENDING" && Number(card.expiry) > Date.now() / 1000).length === 0 ? (
              <p className="text-center text-muted-foreground">No pending gifts</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {createdGifts
                  .filter((card) => card.status === "PENDING" && Number(card.expiry) > Date.now() / 1000)
                  .slice(0, 3)
                  .map((card) => (
                    <div key={card.id} className="flex items-center gap-4 rounded-lg border p-3 glass glow-border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-primary">ID {giftIdCodes[card.id.toLowerCase()] || '...'}</p>
                        <p className="text-sm text-muted-foreground">Expires: 
                          {formatDate(card.expiry)}
                        </p>
                        <p className="text-sm text-muted-foreground">Amount: 
                          {
                            card.token === USDC.toLowerCase() ? formatUnits(card.amount, tokenBalances.USDC.decimal) + ` ${tokenBalances.USDC.symbol}` :
                            card.token === USDT.toLowerCase() ? formatUnits(card.amount, tokenBalances.USDT.decimal) + ` ${tokenBalances.USDT.symbol}` :
                            card.token === DAI.toLowerCase() ? formatUnits(card.amount, tokenBalances.DAI.decimal) + ` ${tokenBalances.DAI.symbol}` :
                            formatUnits(card.amount, 18) + " N/A"
                          }
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gift Cards with Pagination */}
      <Tabs defaultValue="created" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger
            value="created"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Created Gifts ({createdGifts.length})
          </TabsTrigger>
          <TabsTrigger
            value="received"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Received Gifts ({receivedGifts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created">
          {createdGifts.length === 0 ? (
            <p className="text-center text-muted-foreground">No created gifts available.</p>
          ) : (
            <div className="overflow-auto grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {createdGifts.map((card) => {
                const { status, variant } = getGiftStatus(card);
                return (
                <Card key={card.id || card.timeCreated} className={`overflow-hidden glass glow-card`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-primary">
                          ID {giftIdCodes[card.id.toLowerCase()] || '...'}
                        </CardTitle>
                      </div>
                      <Badge variant={variant}>
                        {status}
                      </Badge>
                      {/* <div className="flex justify-start"> */}
                        {/* <span>
                            {card.token !== DAI.toLowerCase() ? formatUnits(card.amount, 6) : formatUnits(card.amount, 18)} 
                            {card.token == USDT.toLowerCase() ? " USDT" : card.token == USDC.toLowerCase() ? " USDC" : " DAI"}
                          </span> */}
                        {/* {card.status === "claimed" && (
                          <Badge className="bg-primary text-primary-foreground">
                            <CheckCircle className="mr-1 h-3 w-3" /> Claimed
                          </Badge>
                        )}
                        {card.status === "pending" && (
                          <Badge variant="outline" className="border text-primary glow-border">
                            <Clock className="mr-1 h-3 w-3" /> Pending
                          </Badge>
                        )}
                        {card.status === "expired" && (
                          <Badge variant="destructive" className="bg-red-500/80 border-red-500/50">
                            <AlertCircle className="mr-1 h-3 w-3" /> Expired
                          </Badge>
                        )}
                        {card.status === "reclaimed" && (
                          <Badge
                            variant="secondary"
                            className="bg-secondary/80 border-secondary/50 text-secondary-foreground"
                          >
                            <Gift className="mr-1 h-3 w-3" /> Reclaimed
                          </Badge>
                        )} */}
                      {/* </div> */}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Recipient:</span>
                        <span className="text-foreground">
                          {card.recipient?.slice(0, 6)}...{card.recipient?.slice(-6)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>
                          {
                            card.token === USDC.toLowerCase() ? formatUnits(card.amount, tokenBalances.USDC.decimal) + ` ${tokenBalances.USDC.symbol}` :
                            card.token === USDT.toLowerCase() ? formatUnits(card.amount, tokenBalances.USDT.decimal) + ` ${tokenBalances.USDT.symbol}` :
                            card.token === DAI.toLowerCase() ? formatUnits(card.amount, tokenBalances.DAI.decimal) + ` ${tokenBalances.DAI.symbol}` :
                            formatUnits(card.amount, 18) + " N/A"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Message:</span>
                        <span className="text-foreground">{card.message}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expiry Date:</span>
                        <span className="text-foreground">
                          {formatDate(card.expiry)}
                        </span>
                      </div>
                      {card.status === "CLAIMED" && card.timeCreated && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Claimed Date:</span>
                          <span className="text-foreground">
                            {formatDate(card.claimed.blockTimestamp)}
                          </span>
                        </div>
                      )}
                      {card.status === "PENDING" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Created Date:</span>
                          <span className="text-foreground">
                            {formatDate(card.timeCreated)}
                          </span>
                        </div>
                      )}
                      {card.status === "RECLAIMED" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reclaimed Date:</span>
                          <span className="text-foreground">
                            {formatDate(card.reclaimed.blockTimestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {status === "EXPIRED" && (
                      <Button
                        asChild
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
                      >
                        <Link href={`/gift?tab=reclaim&id=${card.id}`}>
                          Reclaim <Gift className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {status === "PENDING" && (
                      <Button variant="outline" asChild className="w-full border hover:bg-primary/10 glow-border">
                        <Link href={`/gift?tab=validate&id=${card.id}`}>Check Status</Link>
                      </Button>
                    )}
                    {(status === "CLAIMED" || status === "RECLAIMED") && (
                      <Button variant="outline" asChild className="w-full border hover:bg-primary/10 glow-border">
                        <Link href={`/gift/${card.id}`}>View Details</Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                )
              })}
            </div>
          )}
          <Pagination
            totalItems={createdGiftCards.length}
            itemsPerPage={cardsPerPage}
            currentPage={createdCurrentPage}
            onPageChange={setCreatedCurrentPage}
          />
        </TabsContent>

        <TabsContent value="received">
          {receivedGifts.length === 0 ? (
            <p className="text-center text-muted-foreground">No received gifts available.</p>
          ) : (
            <div className="h-64 overflow-auto grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedGifts.map((card) => {
                const { status, variant } = getGiftStatus(card);
                return (
                <Card key={card.id || card.timeCreated} className={`overflow-hidden glass glow-card`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-primary">
                          ID {giftIdCodes[card.id.toLowerCase()] || '...'}
                        </CardTitle>
                      </div>
                      <Badge variant={variant}>
                        {status}
                      </Badge>
                      {/* <div className="flex justify-start">
                        {card.status === "claimed" && (
                          <Badge className="bg-primary text-primary-foreground">
                            <CheckCircle className="mr-1 h-3 w-3" /> Claimed
                          </Badge>
                        )}
                        {card.status === "pending" && (
                          <Badge variant="outline" className="border text-primary glow-border">
                            <Clock className="mr-1 h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div> */}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>
                          {
                            card.token === USDC.toLowerCase() ? formatUnits(card.amount, tokenBalances.USDC.decimal) + ` ${tokenBalances.USDC.symbol}` :
                            card.token === USDT.toLowerCase() ? formatUnits(card.amount, tokenBalances.USDT.decimal) + ` ${tokenBalances.USDT.symbol}` :
                            card.token === DAI.toLowerCase() ? formatUnits(card.amount, tokenBalances.DAI.decimal) + ` ${tokenBalances.DAI.symbol}` :
                            formatUnits(card.amount, 18) + " N/A"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Message:</span>
                        <span className="text-foreground">{card.message}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expiry Date:</span>
                        <span className="text-foreground">
                          {formatDate(card.expiry)}
                        </span>
                      </div>
                      {card.status === "CLAIMED" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Claimed Date:</span>
                          <span className="text-foreground">
                            {formatDate(card.claimed.blockTimestamp)}
                          </span>
                        </div>
                      )}
                      {card.status === "PENDING" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Received Date:</span>
                          <span className="text-foreground">
                            {formatDate(card.timeCreated)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {status === "PENDING" && (
                      <Button
                        asChild
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
                      >
                        <Link href={`/gift?tab=claim&id=${card.id}`}>
                          Claim Now <Gift className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {status === "CLAIMED" && (
                      <Button variant="outline" asChild className="w-full border hover:bg-primary/10 glow-border">
                        <Link href={`/gift/${card.id}`}>View Details</Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )}
              )}
            </div>
          )}
          <Pagination
            totalItems={receivedGiftCards.length}
            itemsPerPage={cardsPerPage}
            currentPage={receivedCurrentPage}
            onPageChange={setReceivedCurrentPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}