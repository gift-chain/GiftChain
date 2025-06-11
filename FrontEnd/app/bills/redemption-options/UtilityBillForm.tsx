
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";

interface UtilityBillFormProps {
  maxAmount: number;
}

const UtilityBillForm: React.FC<UtilityBillFormProps> = ({ maxAmount }) => {
  const [billType, setBillType] = useState("");
  const [provider, setProvider] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Mapped providers based on bill type
  const providerOptions: Record<string, string[]> = {
    electricity: ["EKEDC", "IKEDC", "AEDC", "PHEDC", "KEDCO"],
    cable: ["DSTV", "GOTV", "StarTimes"],
    internet: ["Spectranet", "Smile", "Swift", "iPNX"]
  };

  const handleMeterNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    setMeterNumber(value);

    // Reset customer name when meter number changes
    if (customerName) {
      setCustomerName("");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, "");
    if (value === "" || (Number(value) > 0 && Number(value) <= maxAmount)) {
      setAmount(value);
    }
  };

  const handleBillTypeChange = (value: string) => {
    setBillType(value);
    setProvider("");
    setCustomerName("");
  };

  const verifyDetails = async () => {
    if (!meterNumber || !provider || !billType) {
      toast({
        title: "Verification Error",
        description: "Please fill all required fields first.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    // Simulate API call to verify meter
    setTimeout(() => {
      // Mock meter verification success
      const customerNames = [
        "Alex Thompson",
        "Jamie Wilson",
        "Casey Morgan",
        "Taylor Jordan",
        "Jordan Riley"
      ];
      const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
      setCustomerName(randomName);
      setIsVerifying(false);
      toast({
        title: "Details Verified",
        description: `Customer: ${randomName}`,
      });
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meterNumber || !provider || !billType || !customerName || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and verify customer details.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Payment Successful!",
        description: `You have successfully paid ₦${Number(amount).toLocaleString()} for ${billType} bill.`,
      });
      // Reset form
      setMeterNumber("");
      setCustomerName("");
      setBillType("");
      setProvider("");
      setAmount("");
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bill-type">Bill Type</Label>
        <Select
          value={billType}
          onValueChange={handleBillTypeChange}
        >
          <SelectTrigger id="bill-type" className="w-full">
            <SelectValue placeholder="Select bill type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="electricity">Electricity</SelectItem>
            <SelectItem value="cable">Cable TV</SelectItem>
            <SelectItem value="internet">Internet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {billType && (
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select
            value={provider}
            onValueChange={setProvider}
          >
            <SelectTrigger id="provider" className="w-full">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions[billType]?.map((option) => (
                <SelectItem key={option} value={option.toLowerCase()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="meter-number">
          {billType === 'electricity' ? 'Meter Number' :
            billType === 'cable' ? 'IUC/Smart Card Number' :
              'Account ID'}
        </Label>
        <div className="flex space-x-2">
          <Input
            id="meter-number"
            type="text"
            placeholder={`Enter ${billType === 'electricity' ? 'meter number' :
              billType === 'cable' ? 'smart card number' :
                'account ID'}`}
            value={meterNumber}
            onChange={handleMeterNumberChange}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={verifyDetails}
            disabled={isVerifying || !meterNumber || !provider || !billType}
            className="whitespace-nowrap border-gift-primary/50 text-gift-primary hover:bg-gift-primary/5"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>

      {customerName && (
        <div className="p-2 bg-gift-background/50 rounded-md border border-gift-primary/20">
          <p className="text-sm font-medium">Customer Name: {customerName}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="utility-amount">Amount (₦)</Label>
        <Input
          id="utility-amount"
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
        disabled={isProcessing || !meterNumber || !amount || !provider || !customerName}
        className="w-full text-white flex items-center gap-2"
      >
        <Phone className="h-4 w-4" />
        {isProcessing ? "Processing..." : "Pay Bill"}
      </Button>
    </form>
  );
};

export default UtilityBillForm;
