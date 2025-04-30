"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import {
  Gift,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import WalletConnect from "@/components/wallet-connect";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { AreaChart, BarChart, PieChart as PieChartComponent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserGifts, useUserClaimedGifts, useUserReclaimedGifts, Gifts } from "../subgraph/useGiftQueries";
import { ethers, formatUnits } from "ethers";
import axios from "axios";
import { useAccount } from "wagmi";
import giftChainABI from "../abi/GiftChain.json";

// Replace with your actual contract address
const CONTRACT_ADDRESS = "0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473";

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

interface GiftCard {
  id: string;
  amount: string;
  recipient: string;
  message: string;
  expiryDate: string;
  status: string;
  createdDate: string;
  claimedDate: string | null;
  theme: string;
  sender?: string;
  receivedDate?: string;
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
  onPageChange 
}: { 
  totalItems: number, 
  itemsPerPage: number, 
  currentPage: number, 
  onPageChange: (page: number) => void 
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
  const [isConnected, setIsConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [giftIDs, setGiftIDs] = useState<{ [key: string]: string }>({});
  const [timeRange, setTimeRange] = useState("month");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realTimeGifts, setRealTimeGifts] = useState<Gifts[]>([]);
  const [tokenMetadataCache, setTokenMetadataCache] = useState<Record<string, { symbol: string; decimals: number }>>({});
  const [stats, setStats] = useState<Stats>({
    totalCreated: 0,
    totalReceived: 0,
    totalGiftValue: "0.00",
    claimRate: "0",
    createdGrowth: "0",
    receivedGrowth: "0",
    claimRateGrowth: "0",
  });
  const [createdGiftCards, setCreatedGiftCards] = useState<GiftCard[]>([]);
  const [receivedGiftCards, setReceivedGiftCards] = useState<GiftCard[]>([]);
  const [areaChartData, setAreaChartData] = useState<ChartData[]>([]);
  const [barChartData, setBarChartData] = useState<ChartData[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [createdCurrentPage, setCreatedCurrentPage] = useState(1);
  const [receivedCurrentPage, setReceivedCurrentPage] = useState(1);
  const [cardsPerPage, setCardsPerPage] = useState(6);

  // Debug counters
  const computeDataCount = useRef(0);
  const subgraphFetchCount = useRef({ created: 0, claimed: 0, reclaimed: 0 });

  // Wallet connection
  const { address, isConnected: wagmiIsConnected } = useAccount();

  useEffect(() => {
    console.log("Wallet connection update:", { wagmiIsConnected, address });
    if (wagmiIsConnected && address) {
      setUserAddress(address.toLowerCase());
      setIsConnected(true);
      setIsModalOpen(false);
    } else {
      setIsConnected(false);
      setUserAddress("");
      setRealTimeGifts([]);
    }
  }, [wagmiIsConnected, address]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Paginated gift cards
  const paginatedCreatedGiftCards = useMemo(() => {
    const startIndex = (createdCurrentPage - 1) * cardsPerPage;
    return createdGiftCards.slice(startIndex, startIndex + cardsPerPage);
  }, [createdGiftCards, createdCurrentPage, cardsPerPage]);

  const paginatedReceivedGiftCards = useMemo(() => {
    const startIndex = (receivedCurrentPage - 1) * cardsPerPage;
    return receivedGiftCards.slice(startIndex, startIndex + cardsPerPage);
  }, [receivedGiftCards, receivedCurrentPage, cardsPerPage]);

  // Fetch token metadata
  const fetchTokenMetadata = useCallback(async (tokenAddress: string): Promise<{ symbol: string; decimals: number }> => {
    const address = tokenAddress.toLowerCase();
    if (tokenMetadataCache[address]) {
      return tokenMetadataCache[address];
    }

    console.log("Fetching token metadata for:", address);
    try {
      const response = await axios.get(`http://localhost:4000/api/token/${address}`);
      const metadata = response.data;
      setTokenMetadataCache((prev) => ({
        ...prev,
        [address]: metadata,
      }));
      return metadata;
    } catch (error) {
      console.error(`Error fetching token metadata for ${address}:`, error);
      return { symbol: `Unknown (${address.slice(0, 8)})`, decimals: 18 };
    }
  }, [tokenMetadataCache]);

  // Subgraph queries
  const hashedAddress = useMemo(
    () => (userAddress ? ethers.keccak256(ethers.getAddress(userAddress)).toLowerCase() : ""),
    [userAddress]
  );
  const { gifts: createdGifts, loading: giftsLoading, error: giftsError } = useUserGifts(hashedAddress);
  const { claimedGifts, loading: claimedLoading, error: claimedError } = useUserClaimedGifts(userAddress);
  const { reclaimedGifts, loading: reclaimedLoading, error: reclaimedError } = useUserReclaimedGifts(userAddress);

  // Log subgraph fetches
  useEffect(() => {
    if (createdGifts.length > 0 || giftsLoading) {
      subgraphFetchCount.current.created += 1;
      console.log(`Subgraph fetch - Created Gifts (#${subgraphFetchCount.current.created}):`, {
        count: createdGifts.length,
        loading: giftsLoading,
      });
    }
  }, [createdGifts, giftsLoading]);

  useEffect(() => {
    if (claimedGifts.length > 0 || claimedLoading) {
      subgraphFetchCount.current.claimed += 1;
      console.log(`Subgraph fetch - Claimed Gifts (#${subgraphFetchCount.current.claimed}):`, {
        count: claimedGifts.length,
        loading: claimedLoading,
      });
    }
  }, [claimedGifts, claimedLoading]);

  useEffect(() => {
    if (reclaimedGifts.length > 0 || reclaimedLoading) {
      subgraphFetchCount.current.reclaimed += 1;
      console.log(`Subgraph fetch - Reclaimed Gifts (#${subgraphFetchCount.current.reclaimed}):`, {
        count: reclaimedGifts.length,
        loading: reclaimedLoading,
      });
    }
  }, [reclaimedGifts, reclaimedLoading]);

  // Combine gifts
  const allGifts = useMemo(() => {
    const combined = [...createdGifts, ...realTimeGifts];
    console.log("Combined allGifts:", combined.length);
    return combined;
  }, [createdGifts, realTimeGifts]);

  // Event listener
  useEffect(() => {
    if (!userAddress || !isConnected) return;

    const setupListener = async () => {
      try {
        console.log("Setting up GiftCreated listener for:", userAddress);
        const providerUrl = process.env.NEXT_PUBLIC_SEPOLIA_PROVIDER_URL;
        if (!providerUrl) throw new Error("NEXT_PUBLIC_SEPOLIA_PROVIDER_URL not set");
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, giftChainABI, provider);

        const listener = (
          giftID: string,
          creator: string,
          token: string,
          message: string,
          amount: bigint,
          expiry: bigint,
          timeCreated: bigint,
          status: string
        ) => {
          console.log("GiftCreated event:", { giftID, creator, token, status });
          if (creator.toLowerCase() === userAddress.toLowerCase()) {
            const newGift: Gifts = {
              id: giftID.toLowerCase(),
              token: token.toLowerCase(),
              message,
              amount: amount.toString(),
              expiry: expiry.toString(),
              timeCreated: timeCreated.toString(),
              status: status as "PENDING" | "CLAIMED" | "RECLAIMED",
            };

            setRealTimeGifts((prev) => {
              if (prev.some((gift) => gift.id === newGift.id)) {
                console.log("Gift already exists:", newGift.id);
                return prev;
              }
              console.log("Adding new gift:", newGift);
              return [...prev, newGift];
            });

            axios
              .get(`http://localhost:4000/api/gift/${giftID.toLowerCase()}`)
              .then((response) => {
                console.log("Fetched giftID:", response.data.giftID);
                setGiftIDs((prev) => ({
                  ...prev,
                  [giftID.toLowerCase()]: response.data.giftID,
                }));
              })
              .catch((error) => console.error(`Error fetching giftID for ${giftID}:`, error));

            fetchTokenMetadata(token.toLowerCase()).then((metadata) => {
              console.log("Cached token metadata:", metadata);
              setTokenMetadataCache((prev) => ({
                ...prev,
                [token.toLowerCase()]: metadata,
              }));
            });
          } else {
            console.log("Gift ignored (creator mismatch):", creator);
          }
        };

        contract.on("GiftCreated", listener);
        console.log("Listener attached for GiftCreated");

        return () => {
          contract.off("GiftCreated", listener);
          console.log("Listener removed for GiftCreated");
        };
      } catch (error) {
        console.error("Error setting up event listener:", error);
      }
    };

    setupListener();
  }, [userAddress, isConnected, fetchTokenMetadata]);

  // Fetch giftIDs
  useEffect(() => {
    const fetchGiftIDs = async () => {
      const uniqueHashedCodes = Array.from(
        new Set([
          ...allGifts.map((gift) => gift.id.toLowerCase()),
          ...claimedGifts.map((claimed) => claimed.gift.id.toLowerCase()),
          ...reclaimedGifts.map((reclaimed) => reclaimed.gift.id.toLowerCase()),
        ])
      );

      const newHashedCodes = uniqueHashedCodes.filter((hashedCode) => !(hashedCode in giftIDs));
      if (newHashedCodes.length === 0) return;

      console.log("Fetching giftIDs for:", newHashedCodes);
      const giftIDPromises = newHashedCodes.map(async (hashedCode) => {
        try {
          const response = await axios.get(`http://localhost:4000/api/gift/${hashedCode}`);
          return { hashedCode, giftID: response.data.giftID };
        } catch (error) {
          console.error(`Error fetching giftID for ${hashedCode}:`, error);
          return { hashedCode, giftID: "N/A" };
        }
      });

      const results = await Promise.all(giftIDPromises);
      setGiftIDs((prev) => ({
        ...prev,
        ...results.reduce((acc, { hashedCode, giftID }) => ({ ...acc, [hashedCode]: giftID }), {}),
      }));
    };

    if (allGifts.length > 0 || claimedGifts.length > 0 || reclaimedGifts.length > 0) {
      fetchGiftIDs();
    }
  }, [allGifts, claimedGifts, reclaimedGifts]);

  // Compute dashboard data
  const computeData = useCallback(async () => {
    if (giftsLoading || claimedLoading || reclaimedLoading) {
      console.log("Skipping computeData: Subgraph still loading");
      return;
    }

    computeDataCount.current += 1;
    console.log(`computeData run #${computeDataCount.current}`);
    setIsLoading(true);

    try {
      // Stats
      let totalGiftValue = 0;
      const totalCreated = allGifts.length;
      const totalReceived = claimedGifts.length;
      const claimedCount = claimedGifts.length;
      const claimRate = totalCreated > 0 ? (claimedCount / totalCreated) * 100 : 0;

      for (const gift of allGifts) {
        const { decimals } = await fetchTokenMetadata(gift.token);
        const amount = parseFloat(formatUnits(gift.amount, decimals));
        totalGiftValue += amount;
      }

      // Stable growth percentages
      const createdGrowth = totalCreated > 0 ? ((totalCreated % 10) + 5).toString() : "0";
      const receivedGrowth = totalReceived > 0 ? ((totalReceived % 15) + 10).toString() : "0";
      const claimRateGrowth = claimRate > 0 ? ((claimRate % 5) + 3).toString() : "0";

      setStats({
        totalCreated,
        totalReceived,
        totalGiftValue: totalGiftValue.toFixed(2),
        claimRate: claimRate.toFixed(0),
        createdGrowth,
        receivedGrowth,
        claimRateGrowth,
      });

      // Created gift cards
      const reclaimedGiftIds = new Set(reclaimedGifts.map((r) => r.gift.id.toLowerCase()));
      const newCreatedGiftCards: GiftCard[] = [];
      for (const gift of allGifts) {
        const { symbol, decimals } = await fetchTokenMetadata(gift.token);
        const expiryDate = new Date(parseInt(gift.expiry) * 1000);
        const isExpired = expiryDate < new Date();
        const isReclaimed = reclaimedGiftIds.has(gift.id.toLowerCase());
        const formattedAmount = parseFloat(formatUnits(gift.amount, decimals)).toFixed(2);

        newCreatedGiftCards.push({
          id: giftIDs[gift.id.toLowerCase()] || gift.id,
          amount: `${formattedAmount} ${symbol}`,
          recipient: gift.claimed?.recipient || "N/A",
          message: gift.message || "No message",
          expiryDate: expiryDate.toISOString().split("T")[0],
          status: isReclaimed ? "reclaimed" : isExpired ? "expired" : gift.status.toLowerCase(),
          createdDate: new Date(parseInt(gift.timeCreated) * 1000).toISOString().split("T")[0],
          claimedDate: gift.claimed
            ? new Date(parseInt(gift.claimed.blockTimestamp) * 1000).toISOString().split("T")[0]
            : null,
          theme: `theme-${Math.floor(Math.random() * 5) + 1}`,
        });
      }
      setCreatedGiftCards(newCreatedGiftCards);

      // Received gift cards
      const newReceivedGiftCards: GiftCard[] = [];
      for (const claimed of claimedGifts) {
        const { symbol, decimals } = await fetchTokenMetadata(claimed.gift.token);
        const expiryDate = new Date(parseInt(claimed.gift.expiry) * 1000);
        const formattedAmount = parseFloat(formatUnits(claimed.amount, decimals)).toFixed(2);

        newReceivedGiftCards.push({
          id: giftIDs[claimed.gift.id.toLowerCase()] || claimed.gift.id,
          amount: `${formattedAmount} ${symbol}`,
          recipient: userAddress,
          sender: "N/A",
          message: claimed.gift.message || "No message",
          expiryDate: expiryDate.toISOString().split("T")[0],
          status: claimed.gift.status.toLowerCase(),
          createdDate: new Date(parseInt(claimed.gift.timeCreated) * 1000).toISOString().split("T")[0],
          receivedDate: new Date(parseInt(claimed.gift.timeCreated) * 1000).toISOString().split("T")[0],
          claimedDate: new Date(parseInt(claimed.blockTimestamp) * 1000).toISOString().split("T")[0],
          theme: `theme-${Math.floor(Math.random() * 5) + 1}`,
        });
      }
      setReceivedGiftCards(newReceivedGiftCards);

      // Area chart data
      const monthlyData: { [key: string]: number } = {};
      for (const gift of allGifts) {
        const date = new Date(parseInt(gift.timeCreated) * 1000);
        const month = date.toLocaleString("default", { month: "short" });
        const { decimals } = await fetchTokenMetadata(gift.token);
        const amount = parseFloat(formatUnits(gift.amount, decimals));
        monthlyData[month] = (monthlyData[month] || 0) + amount;
      }
      const newAreaChartData = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ].map((month) => ({
        name: month,
        total: monthlyData[month] || 0,
      }));
      setAreaChartData(newAreaChartData);

      // Bar chart data
      const tokenCounts: { [key: string]: number } = {};
      for (const gift of allGifts) {
        const { symbol } = await fetchTokenMetadata(gift.token);
        tokenCounts[symbol] = (tokenCounts[symbol] || 0) + 1;
      }
      const newBarChartData = Object.entries(tokenCounts).map(([name, total]) => ({
        name,
        total,
      }));
      setBarChartData(newBarChartData);

      // Pie chart data
      const statusCounts = {
        Claimed: 0,
        Pending: 0,
        Expired: 0,
        Reclaimed: 0,
      };
      allGifts.forEach((gift) => {
        const expiryDate = new Date(parseInt(gift.expiry) * 1000);
        const isExpired = expiryDate < new Date();
        if (gift.status === "CLAIMED") {
          statusCounts.Claimed += 1;
        } else if (gift.status === "RECLAIMED") {
          statusCounts.Reclaimed += 1;
        } else if (isExpired) {
          statusCounts.Expired += 1;
        } else {
          statusCounts.Pending += 1;
        }
      });
      const newPieChartData = Object.entries(statusCounts)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
        }));
      setPieChartData(newPieChartData);
    } catch (error) {
      console.error("Error computing data:", error);
      setStats({
        totalCreated: 0,
        totalReceived: 0,
        totalGiftValue: "0.00",
        claimRate: "0",
        createdGrowth: "0",
        receivedGrowth: "0",
        claimRateGrowth: "0",
      });
      setCreatedGiftCards([]);
      setReceivedGiftCards([]);
      setAreaChartData(
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => ({
          name: month,
          total: 0,
        }))
      );
      setBarChartData([]);
      setPieChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [allGifts, claimedGifts, reclaimedGifts, giftIDs, fetchTokenMetadata, giftsLoading, claimedLoading, reclaimedLoading]);

  // Run computeData with debounce
  useEffect(() => {
    if (!userAddress || !isConnected || giftsLoading || claimedLoading || reclaimedLoading) return;

    const timer = setTimeout(() => {
      console.log("Triggering computeData");
      computeData();
    }, 500);

    return () => clearTimeout(timer);
  }, [computeData, userAddress, isConnected, giftsLoading, claimedLoading, reclaimedLoading]);

  // Reset pagination when gift cards change
  useEffect(() => {
    setCreatedCurrentPage(1);
  }, [createdGiftCards.length]);

  useEffect(() => {
    setReceivedCurrentPage(1);
  }, [receivedGiftCards.length]);

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
            Your Gift Card Dashboard
          </h1>
          <p className="mt-4 text-muted-foreground">
            Connect your wallet to view your created and received gift cards.
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

  if (giftsLoading || claimedLoading || reclaimedLoading || isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen hexagon-bg text-foreground">
        Loading...
      </div>
    );
  }

  if (giftsError || claimedError || reclaimedError) {
    return (
      <div className="container flex items-center justify-center min-h-screen hexagon-bg text-red-500">
        Error: {giftsError?.message || claimedError?.message || reclaimedError?.message}
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 hexagon-bg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-text">
          Your Gift Card Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">Manage your created and received gift cards</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between glass rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 border glow-border text-foreground">
            <span className="mr-1 h-2 w-2 rounded-full bg-primary"></span> Connected: {userAddress.slice(0, 6)}...
            {userAddress.slice(-4)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
            <Link href="/create">
              Create New Gift Card <Gift className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border hover:bg-primary/10 glow-border">
            <Link href="/gift-actions">Manage Gift Cards</Link>
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
            <div className="text-2xl font-bold text-foreground glow-text">{stats.totalCreated}</div>
            <div className="mt-1 flex items-center text-xs text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              +{stats.createdGrowth}% from last month
            </div>
            <Progress className="mt-3 bg-muted" value={stats.totalCreated * 10} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Total Received</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{stats.totalReceived}</div>
            <div className="mt-1 flex items-center text-xs text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              +{stats.receivedGrowth}% from last month
            </div>
            <Progress className="mt-3 bg-muted" value={stats.totalReceived * 20} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{stats.totalGiftValue} USD</div>
            <div className="mt-1 flex items-center text-xs text-muted-foreground">≈ </div>
            <Progress className="mt-3 bg-muted" value={parseFloat(stats.totalGiftValue) / 10} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden glass glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium gradient-text">Claim Rate</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground glow-text">{stats.claimRate}%</div>
            <div className="mt-1 flex items-center text-xs text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              +{stats.claimRateGrowth}% from last month
            </div>
            <Progress className="mt-3 bg-muted" value={parseFloat(stats.claimRate)} />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section - Revamped Layout */}
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
        
        {/* New Analytics Grid Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Activity Chart - Full width on mobile, 2 cols on desktop */}
          <Card className="lg:col-span-2 glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Gift Card Activity</CardTitle>
                <CardDescription>Monthly gift card creation and claims</CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[250px] w-full">
                <AreaChart
                  data={areaChartData}
                  index="name"
                  categories={["total"]}
                  colors={["#00ddeb"]}
                  valueFormatter={(value) => `$${value.toFixed(2)}`}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution - Full width on mobile, 1 col on desktop */}
          <Card className="glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Status Distribution</CardTitle>
                <CardDescription>Current gift card statuses</CardDescription>
              </div>
              <PieChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <PieChartComponent
                  data={pieChartData}
                  index="name"
                  valueFormatter={(value) => `${value}`}
                  category="value"
                  colors={["#00ddeb", "#39ff14", "#ff00ff", "#00b7eb"]}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency Distribution - Full width */}
          <Card className="lg:col-span-3 glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Currency Distribution</CardTitle>
                <CardDescription>Gift cards by currency type</CardDescription>
              </div>
              <LineChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <BarChart
                  data={barChartData}
                  index="name"
                  categories={["total"]}
                  colors={["#00b7eb"]}
                  valueFormatter={(value) => `${value} cards`}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar View */}
      <div className="mb-8">
        <Card className="glass glow-card">
          <CardHeader>
            <CardTitle className="gradient-text">Upcoming Expirations</CardTitle>
            <CardDescription>Gift cards that will expire soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {createdGiftCards
                .filter((card) => card.status === "pending")
                .slice(0, 3) // Show only 3 upcoming expirations
                .map((card) => (
                  <div key={card.id} className="flex items-center gap-4 rounded-lg border p-3 glass glow-border">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">{card.id}</p>
                      <p className="text-sm text-muted-foreground">Expires: {card.expiryDate}</p>
                      <p className="text-sm text-muted-foreground">Amount: {card.amount}</p>
                    </div>
                  </div>
                ))}
            </div>
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
            Created Gift Cards ({createdGiftCards.length})
          </TabsTrigger>
          <TabsTrigger
            value="received"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Received Gift Cards ({receivedGiftCards.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="created">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedCreatedGiftCards.map((card) => (
              <Card key={card.id} className={`overflow-hidden glass glow-card ${card.theme}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary">{card.amount}</CardTitle>
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
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground">Gift Card #{card.id}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recipient:</span>
                      <span className="text-foreground">{card.recipient}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Message:</span>
                      <span className="text-foreground">{card.message}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="text-foreground">{card.expiryDate}</span>
                    </div>
                    {card.status === "claimed" && card.claimedDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Claimed Date:</span>
                        <span className="text-foreground">{card.claimedDate}</span>
                      </div>
                    )}
                    {card.status === "pending" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created Date:</span>
                        <span className="text-foreground">{card.createdDate}</span>
                      </div>
                    )}
                    {card.status === "expired" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created Date:</span>
                        <span className="text-foreground">{card.createdDate}</span>
                      </div>
                    )}
                    {card.status === "reclaimed" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reclaimed Date:</span>
                        <span className="text-foreground">{card.createdDate}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  {card.status === "expired" && (
                    <Button
                      asChild
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
                    >
                      <Link href={`/gift-actions?action=reclaim&id=${card.id}`}>
                        Reclaim <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {card.status === "pending" && (
                    <Button variant="outline" asChild className="w-full border hover:bg-primary/10 glow-border">
                      <Link href={`/gift-actions?action=validate&id=${card.id}`}>Check Status</Link>
                    </Button>
                  )}
                  {(card.status === "claimed" || card.status === "reclaimed") && (
                    <Button variant="outline" asChild className="w-full border hover:bg-primary/10 glow-border">
                      <Link href={`/gift/${card.id}`}>View Details</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* Pagination for Created Gift Cards */}
          <Pagination
            totalItems={createdGiftCards.length}
            itemsPerPage={cardsPerPage}
            currentPage={createdCurrentPage}
            onPageChange={setCreatedCurrentPage}
          />
        </TabsContent>
        
        <TabsContent value="received">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedReceivedGiftCards.map((card) => (
              <Card key={card.id} className={`overflow-hidden glass glow-card ${card.theme}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary">{card.amount}</CardTitle>
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
                  </div>
                  <CardDescription className="text-muted-foreground">Gift Card #{card.id}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sender:</span>
                      <span className="text-foreground">{card.sender}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Message:</span>
                      <span className="text-foreground">{card.message}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="text-foreground">{card.expiryDate}</span>
                    </div>
                    {card.status === "claimed" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Claimed Date:</span>
                        <span className="text-foreground">{card.claimedDate}</span>
                      </div>
                    )}
                    {card.status === "pending" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Received Date:</span>
                        <span className="text-foreground">{card.receivedDate}</span>
                      </div>
                    )}
                  </div>
                  {card.status === "pending" && (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Time Remaining</span>
                        <span>
                          {Math.ceil(
                            (new Date(card.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                          )}{" "}
                          days
                        </span>
                      </div>
                      <Progress
                        value={
                          ((new Date(card.expiryDate).getTime() - new Date().getTime()) /
                            (new Date(card.expiryDate).getTime() -
                            new Date(card.receivedDate || card.createdDate).getTime())) *
                          100
                        }
                        className="h-2 bg-muted"
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {card.status === "pending" && (
                    <Button
                      asChild
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
                    >
                      <Link href={`/gift-actions?action=claim&id=${card.id}`}>
                        Claim Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {card.status === "claimed" && (
                    <Button variant="outline" asChild className="w-full border hover:bg-primary/10 glow-border">
                      <Link href={`/gift/${card.id}`}>View Details</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* Pagination for Received Gift Cards */}
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