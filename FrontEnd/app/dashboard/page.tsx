// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
import giftChainABI from "../abi/giftChainABI.json";

// Minimal ERC-20 ABI for decimals()
const erc20Abi = [
  "function decimals() view returns (uint8)",
];

// Token map (Sepolia testnet addresses)
const tokenMap: Record<string, string> = {
  USDT: "0xf99F557Ed59F884F49D923643b1A48F834a90653" ,
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  DAI: "0xA0c61934a9bF661c0f41db06538e6674CDccFFf2",
};

// Reverse token map (address to symbol)
const reverseTokenMap: Record<string, string> = Object.fromEntries(
  Object.entries(tokenMap).map(([symbol, address]) => [address.toLowerCase(), symbol])
);

// Replace with your actual contract address
const CONTRACT_ADDRESS = "0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473"; // e.g., "0x1234..."

// Sepolia provider URL (replace with your Infura/Alchemy URL)
const SEPOLIA_PROVIDER_URL = process.env.NEXT_PUBLIC_SEPOLIA_PROVIDER_URL || "https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX.sepolia.org";

// Interfaces for computed data
interface Stats {
  totalCreated: number;
  totalReceived: number;
  totalGiftValue: string;
  claimRate: string;
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

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [giftIDs, setGiftIDs] = useState<{ [key: string]: string }>({});
  const [timeRange, setTimeRange] = useState("month");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realTimeGifts, setRealTimeGifts] = useState<Gifts[]>([]);
  const [tokenDecimalsCache, setTokenDecimalsCache] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Stats>({
    totalCreated: 0,
    totalReceived: 0,
    totalGiftValue: "0.00",
    claimRate: "0",
  });
  const [createdGiftCards, setCreatedGiftCards] = useState<GiftCard[]>([]);
  const [receivedGiftCards, setReceivedGiftCards] = useState<GiftCard[]>([]);
  const [areaChartData, setAreaChartData] = useState<ChartData[]>([]);
  const [barChartData, setBarChartData] = useState<ChartData[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get connected wallet address from wagmi
  const { address, isConnected: wagmiIsConnected } = useAccount();

  // Update connection state
  useEffect(() => {
    if (wagmiIsConnected && address) {
      setUserAddress(address);
      setIsConnected(true);
      setIsModalOpen(false);
    } else {
      setIsConnected(false);
      setUserAddress("");
    }
  }, [wagmiIsConnected, address]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to fetch token decimals on-chain
  const fetchTokenDecimals = async (tokenAddress: string): Promise<number> => {
    if (tokenDecimalsCache[tokenAddress.toLowerCase()]) {
      return tokenDecimalsCache[tokenAddress.toLowerCase()];
    }
    try {
      const provider = new ethers.JsonRpcProvider(SEPOLIA_PROVIDER_URL);
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const decimals = await tokenContract.decimals();
      const decimalsNumber = Number(decimals);
      setTokenDecimalsCache((prev) => ({
        ...prev,
        [tokenAddress.toLowerCase()]: decimalsNumber,
      }));
      return decimalsNumber;
    } catch (error) {
      console.error(`Error fetching decimals for token ${tokenAddress}:`, error);
      return 18; // Default to 18 decimals if fetch fails
    }
  };

  // Function to get token decimals (cached or fetched)
  const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
    const knownDecimals: Record<string, number> = {
      USDT: 6,
      USDC: 6,
      DAI: 18,
    };
    const tokenSymbol = reverseTokenMap[tokenAddress.toLowerCase()];
    if (tokenSymbol && knownDecimals[tokenSymbol]) {
      return knownDecimals[tokenSymbol];
    }
    return fetchTokenDecimals(tokenAddress);
  };

  // Get token symbol (fallback to address if unknown)
  const getTokenSymbol = (tokenAddress: string): string => {
    return reverseTokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 8);
  };

  // Subgraph queries
  const hashedAddress = userAddress ? ethers.keccak256(ethers.getAddress(userAddress)) : "";
  console.log("User Address:", userAddress);
  console.log("Hashed Address:", hashedAddress);
  const { gifts: createdGifts, loading: giftsLoading, error: giftsError } = useUserGifts(hashedAddress);
  const { claimedGifts, loading: claimedLoading, error: claimedError } = useUserClaimedGifts(userAddress);
  const { reclaimedGifts, loading: reclaimedLoading, error: reclaimedError } = useUserReclaimedGifts(userAddress);
  console.log("Gifts Data:", createdGifts);
  console.log("Gifts Loading:", giftsLoading);
  console.log("Gifts Error:", giftsError);
  console.log("Claimed Gifts:", claimedGifts);
  console.log("Reclaimed Gifts:", reclaimedGifts);

  // Combine subgraph gifts with real-time gifts
  const allGifts = useMemo(() => [...createdGifts, ...realTimeGifts], [createdGifts, realTimeGifts]);

  // Set up contract event listener using Sepolia provider
  useEffect(() => {
    if (!userAddress || !isConnected) return;

    const setupListener = async () => {
      try {
        // Create ethers.js provider using Sepolia provider URL
        const provider = new ethers.JsonRpcProvider(SEPOLIA_PROVIDER_URL);

        // Create contract instance
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
          if (ethers.keccak256(ethers.getAddress(userAddress)).toLowerCase() === creator.toLowerCase()) {
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
              if (prev.some((gift) => gift.id === newGift.id)) return prev;
              return [...prev, newGift];
            });

            axios
              .get(`http://localhost:3000/api/gift/${giftID.toLowerCase()}`)
              .then((response) => {
                setGiftIDs((prev) => ({
                  ...prev,
                  [giftID.toLowerCase()]: response.data.giftID,
                }));
              })
              .catch((error) => {
                console.error(`Error fetching giftID for ${giftID}:`, error);
              });
          }
        };

        contract.on("GiftCreated", listener);

        return () => {
          contract.off("GiftCreated", listener);
        };
      } catch (error) {
        console.error("Error setting up event listener:", error);
      }
    };

    setupListener();
  }, [userAddress, isConnected]);

  // Fetch giftIDs from MongoDB
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

      const giftIDPromises = newHashedCodes.map(async (hashedCode) => {
        try {
          const response = await axios.get(`http://localhost:4000/api/gift/${hashedCode}`);
          return { hashedCode, giftID: response.data.giftID };
        } catch (error) {
          console.error(`Error fetching giftID for ${hashedCode}:`, error);
          return { hashedCode, giftID: "N/A" };
        }
      });

      const giftIDPromisesResults = await Promise.all(giftIDPromises);
      const newGiftIDMap = giftIDPromisesResults.reduce(
        (acc, { hashedCode, giftID }) => {
          acc[hashedCode] = giftID;
          return acc;
        },
        {} as { [key: string]: string }
      );

      setGiftIDs((prev) => ({ ...prev, ...newGiftIDMap }));
    };

    if (allGifts.length > 0 || claimedGifts.length > 0 || reclaimedGifts.length > 0) {
      fetchGiftIDs();
    }
  }, [allGifts, claimedGifts, reclaimedGifts]);

  // Compute stats, gift cards, and chart data
  useEffect(() => {
    const computeData = async () => {
      setIsLoading(true);
      try {
        // Compute stats for Overview Cards
        let totalGiftValue = 0;
        let claimedCount = 0;
        let totalCreated = allGifts.length;
        let totalReceived = claimedGifts.length;
        let claimRate = totalCreated > 0 ? (claimedCount / totalCreated) * 100 : 0;

        for (const gift of allGifts) {
          console.log(`Raw gift.amount for gift ${gift.id}:`, gift.amount);
          const decimals = await getTokenDecimals(gift.token);
          const amount = parseFloat(formatUnits(gift.amount, decimals));
          totalGiftValue += amount;
        }
        claimedCount = claimedGifts.length;
        claimRate = totalCreated > 0 ? (claimedCount / totalCreated) * 100 : 0;

        setStats({
          totalCreated,
          totalReceived,
          totalGiftValue: totalGiftValue.toFixed(2),
          claimRate: claimRate.toFixed(0),
        });

        // Compute created gift cards
        const reclaimedGiftIds = new Set(reclaimedGifts.map((r) => r.gift.id.toLowerCase()));
        const newCreatedGiftCards: GiftCard[] = [];
        for (const gift of allGifts) {
          const tokenSymbol = getTokenSymbol(gift.token);
          const decimals = await getTokenDecimals(gift.token);
          const expiryDate = new Date(parseInt(gift.expiry) * 1000);
          const isExpired = expiryDate < new Date();
          const isReclaimed = reclaimedGiftIds.has(gift.id.toLowerCase());
          const formattedAmount = parseFloat(formatUnits(gift.amount, decimals)).toFixed(2);

          newCreatedGiftCards.push({
            id: giftIDs[gift.id.toLowerCase()] || gift.id,
            amount: `${formattedAmount} ${tokenSymbol}`,
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

        // Compute received gift cards
        const newReceivedGiftCards: GiftCard[] = [];
        for (const claimed of claimedGifts) {
          console.log(`Raw claimed.amount for gift ${claimed.gift.id}:`, claimed.amount);
          const tokenSymbol = getTokenSymbol(claimed.gift.token);
          const decimals = await getTokenDecimals(claimed.gift.token);
          const expiryDate = new Date(parseInt(claimed.gift.expiry) * 1000);
          const formattedAmount = parseFloat(formatUnits(claimed.amount, decimals)).toFixed(2);

          newReceivedGiftCards.push({
            id: giftIDs[claimed.gift.id.toLowerCase()] || claimed.gift.id,
            amount: `${formattedAmount} ${tokenSymbol}`,
            recipient: userAddress, // Add recipient (user is the recipient of claimed gift)
            sender: "N/A",
            message: claimed.gift.message || "No message",
            expiryDate: expiryDate.toISOString().split("T")[0],
            status: claimed.gift.status.toLowerCase(),
            createdDate: new Date(parseInt(claimed.gift.timeCreated) * 1000).toISOString().split("T")[0], // Add createdDate
            receivedDate: new Date(parseInt(claimed.gift.timeCreated) * 1000).toISOString().split("T")[0],
            claimedDate: new Date(parseInt(claimed.blockTimestamp) * 1000).toISOString().split("T")[0],
            theme: `theme-${Math.floor(Math.random() * 5) + 1}`,
          });
        }
        setReceivedGiftCards(newReceivedGiftCards);

        // Compute area chart data
        const monthlyData: { [key: string]: number } = {};
        for (const gift of allGifts) {
          const date = new Date(parseInt(gift.timeCreated) * 1000);
          const month = date.toLocaleString("default", { month: "short" });
          const decimals = await getTokenDecimals(gift.token);
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

        // Compute bar chart data
        const tokenCounts: { [key: string]: number } = {};
        allGifts.forEach((gift) => {
          const tokenSymbol = getTokenSymbol(gift.token);
          tokenCounts[tokenSymbol] = (tokenCounts[tokenSymbol] || 0) + 1;
        });
        const newBarChartData = Object.entries(tokenCounts).map(([name, total]) => ({
          name,
          total,
        }));
        setBarChartData(newBarChartData);

        // Compute pie chart data
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
        console.error("Error computing dashboard data:", error);
        setStats({
          totalCreated: 0,
          totalReceived: 0,
          totalGiftValue: "0.00",
          claimRate: "0",
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
    };

    computeData();
  }, [allGifts, claimedGifts, reclaimedGifts, giftIDs]);

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
              +{Math.floor(Math.random() * 20)}% from last month
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
              +{Math.floor(Math.random() * 30)}% from last month
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
              +{Math.floor(Math.random() * 10)}% from last month
            </div>
            <Progress className="mt-3 bg-muted" value={parseFloat(stats.claimRate)} />
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="gradient-text">Gift Card Activity</CardTitle>
                <CardDescription>Monthly gift card creation and claims</CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] w-full">
                <AreaChart
                  data={areaChartData}
                  index="name"
                  categories={["total"]}
                  colors={["#00ddeb", "#39ff14"]}
                  valueFormatter={(value) => `$${value.toFixed(2)}`}
                  className="h-[200px]"
                />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="glass glow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="gradient-text">Currency Distribution</CardTitle>
                  <CardDescription>Gift cards by currency</CardDescription>
                </div>
                <PieChart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <BarChart
                    data={barChartData}
                    index="name"
                    categories={["total"]}
                    colors={["#00b7eb", "#ff69b4"]}
                    valueFormatter={(value) => `${value} cards`}
                    className="h-[200px]"
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="glass glow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="gradient-text">Gift Card Status</CardTitle>
                  <CardDescription>Status distribution</CardDescription>
                </div>
                <LineChart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <PieChartComponent
                    data={pieChartData}
                    index="name"
                    valueFormatter={(value) => `${value}`}
                    category="value"
                    colors={["#00ddeb", "#39ff14", "#ff00ff", "#00b7eb"]}
                    className="h-[200px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
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

      <Tabs defaultValue="created" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger
            value="created"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Created Gift Cards
          </TabsTrigger>
          <TabsTrigger
            value="received"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Received Gift Cards
          </TabsTrigger>
        </TabsList>
        <TabsContent value="created">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {createdGiftCards.map((card) => (
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
        </TabsContent>
        <TabsContent value="received">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {receivedGiftCards.map((card) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}