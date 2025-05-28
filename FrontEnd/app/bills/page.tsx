"use client"
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AirtimeForm from "./redemption-options/AirtimeForm";
import BankTransferForm from "./redemption-options/BankTransferForm";
import UtilityBillForm from "./redemption-options/UtilityBillForm";
import { Banknote, Phone } from "lucide-react";

interface VerifiedCardData {
    cardNumber: string;
    balance: number;
    expiryDate: string;
}

const GiftCardRedemption = () => {
    const [step, setStep] = useState<"verification" | "redemption">("verification");
    const [pinCode, setPinCode] = useState<string>("");
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [verifiedCard, setVerifiedCard] = useState<VerifiedCardData | null>(null);
    const { toast } = useToast();

    // Mock function to verify gift card pin
    const verifyGiftCardPin = async (pin: string): Promise<VerifiedCardData | null> => {
        // In a real application, this would be an API call to verify the pin
        return new Promise((resolve) => {
            setTimeout(() => {
                // For demo purposes, we'll accept any 16-digit pin
                if (pin.length === 16) {
                    resolve({
                        cardNumber: pin.slice(0, 4) + "-xxxx-xxxx-" + pin.slice(12),
                        balance: 5000, // Sample balance in currency units
                        expiryDate: "2025-12-31",
                    });
                } else {
                    resolve(null);
                }
            }, 1000);
        });
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numbers and limit to 16 characters
        const value = e.target.value.replace(/\D/g, "").slice(0, 16);
        setPinCode(value);
    };

    const handleVerifyPin = async () => {
        if (pinCode.length !== 16) {
            toast({
                title: "Invalid PIN",
                description: "Please enter a valid 16-digit gift card PIN.",
                variant: "destructive",
            });
            return;
        }

        setIsVerifying(true);
        try {
            const result = await verifyGiftCardPin(pinCode);
            if (result) {
                setVerifiedCard(result);
                setStep("redemption");
                toast({
                    title: "PIN Verified",
                    description: `Gift card balance: ₦${result.balance.toLocaleString()}`,
                });
            } else {
                toast({
                    title: "Invalid PIN",
                    description: "The gift card PIN you entered is invalid or expired.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Verification Error",
                description: "An error occurred while verifying your gift card PIN.",
                variant: "destructive",
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleBack = () => {
        setStep("verification");
        setVerifiedCard(null);
        setPinCode("");
    };

    return (
        <div className="container py-20 max-w-3xl hexagon-bg">
            {/* <div className="max-w-md w-full mx-auto animate-fade-in"> */}
            <Card className="border-gift-primary/20 shadow-md">
                <CardHeader className="bg-gradient-to-r from-gift-primary to-gift-accent text-white rounded-t-lg">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Banknote className="h-5 w-5" />
                        Gift Card Redemption
                    </CardTitle>
                    <CardDescription className="text-white/80">
                        Convert your gift card to airtime, bank transfer, or pay bills
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {step === "verification" ? (
                        <div className="space-y-4 animate-slide-in">
                            <div className="space-y-2">
                                <Label htmlFor="pin-code" className="text-sm font-medium">
                                    Enter Gift Card PIN
                                </Label>
                                <Input
                                    id="pin-code"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter 16-digit PIN"
                                    value={pinCode}
                                    onChange={handlePinChange}
                                    className="focus:ring-gift-primary focus:border-gift-primary"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter the 16-digit PIN code from your gift card
                                </p>
                            </div>
                            <Button
                                onClick={handleVerifyPin}
                                disabled={isVerifying || pinCode.length !== 16}
                                className="w-full glow-border text-white" size="lg"
                            >
                                {isVerifying ? "Verifying..." : "Verify PIN"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-slide-in">
                            {verifiedCard && (
                                <div className="bg-gift-background p-3 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700">Card Number: {verifiedCard.cardNumber}</p>
                                    <p className="text-sm font-medium text-gray-700">
                                        Available Balance: <span className="text-gift-primary font-bold">₦{verifiedCard.balance.toLocaleString()}</span>
                                    </p>
                                </div>
                            )}

                            <Tabs defaultValue="airtime" className="w-full">
                                <TabsList className="grid grid-cols-3 mb-4">
                                    <TabsTrigger value="airtime" className="text-xs sm:text-sm">Airtime</TabsTrigger>
                                    <TabsTrigger value="bank" className="text-xs sm:text-sm">Bank Transfer</TabsTrigger>
                                    <TabsTrigger value="utility" className="text-xs sm:text-sm">Utility Bill</TabsTrigger>
                                </TabsList>
                                <TabsContent value="airtime">
                                    <AirtimeForm maxAmount={verifiedCard?.balance || 0} />
                                </TabsContent>
                                <TabsContent value="bank">
                                    <BankTransferForm maxAmount={verifiedCard?.balance || 0} />
                                </TabsContent>
                                <TabsContent value="utility">
                                    <UtilityBillForm maxAmount={verifiedCard?.balance || 0} />
                                </TabsContent>
                            </Tabs>

                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="w-full mt-4 border-gift-primary/30 bg-[#289A67] text-gift-primary hover:bg-gift-primary/5"
                            >
                                Back to Verification
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GiftCardRedemption;
