
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";

interface AirtimeFormProps {
  maxAmount: number;
}

const AirtimeForm: React.FC<AirtimeFormProps> = ({ maxAmount }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 11 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhoneNumber(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, "");
    if (value === "" || (Number(value) > 0 && Number(value) <= maxAmount)) {
      setAmount(value);
    }
  };

  const handleNetworkChange = (value: string) => {
    setNetwork(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || !amount || !network) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (phoneNumber.length !== 11) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 11-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Airtime Purchase Successful!",
        description: `You have successfully purchased ₦${Number(amount).toLocaleString()} airtime for ${phoneNumber}.`,
      });
      // Reset form
      setPhoneNumber("");
      setAmount("");
      setNetwork("");
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="network">Network Provider</Label>
        <Select
          value={network}
          onValueChange={handleNetworkChange}
        >
          <SelectTrigger id="network" className="w-full">
            <SelectValue placeholder="Select network provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mtn">MTN</SelectItem>
            <SelectItem value="airtel">Airtel</SelectItem>
            <SelectItem value="glo">Glo</SelectItem>
            <SelectItem value="9mobile">9Mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone-number">Phone Number</Label>
        <Input
          id="phone-number"
          type="text"
          inputMode="numeric"
          placeholder="Enter 11-digit phone number"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₦)</Label>
        <Input
          id="amount"
          type="text"
          inputMode="numeric"
          placeholder="Enter amount"
          value={amount}
          onChange={handleAmountChange}
        />
        <p className="text-xs text-muted-foreground">
          Available balance: ₦{maxAmount.toLocaleString()}
        </p>
      </div>

      <Button
        type="submit"
        disabled={isProcessing || !phoneNumber || !amount || !network}
        className="w-full text-white flex items-center gap-2"
      >
        <Phone className="h-4 w-4" />
        {isProcessing ? "Processing..." : "Purchase Airtime"}
      </Button>
    </form>
  );
};

export default AirtimeForm;
