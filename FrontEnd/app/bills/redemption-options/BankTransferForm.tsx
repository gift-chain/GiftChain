
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote } from "lucide-react";

interface BankTransferFormProps {
  maxAmount: number;
}

const BankTransferForm: React.FC<BankTransferFormProps> = ({ maxAmount }) => {
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const { toast } = useToast();

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 10 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(value);

    // Reset account name when account number changes
    if (accountName) {
      setAccountName("");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, "");
    if (value === "" || (Number(value) > 0 && Number(value) <= maxAmount)) {
      setAmount(value);
    }
  };

  const handleBankChange = (value: string) => {
    setBank(value);
    // Reset account name when bank changes
    if (accountName) {
      setAccountName("");
    }
  };

  const verifyAccount = async () => {
    if (accountNumber.length !== 10 || !bank) {
      toast({
        title: "Verification Error",
        description: "Please enter a valid account number and select a bank.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingAccount(true);

    // Simulate API call to verify account
    setTimeout(() => {
      // Mock account verification success
      const mockNames = [
        "John Doe",
        "Jane Smith",
        "Michael Johnson",
        "Sarah Williams",
        "Robert Brown"
      ];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      setAccountName(randomName);
      setIsVerifyingAccount(false);
      toast({
        title: "Account Verified",
        description: `Account holder: ${randomName}`,
      });
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountNumber || !bank || !accountName || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and verify the account.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Transfer Successful!",
        description: `You have successfully transferred ₦${Number(amount).toLocaleString()} to ${accountName}.`,
      });
      // Reset form
      setAccountNumber("");
      setAccountName("");
      setBank("");
      setAmount("");
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bank">Select Bank</Label>
        <Select
          value={bank}
          onValueChange={handleBankChange}
        >
          <SelectTrigger id="bank" className="w-full">
            <SelectValue placeholder="Select bank" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="access">Access Bank</SelectItem>
            <SelectItem value="gtb">Guaranty Trust Bank</SelectItem>
            <SelectItem value="first">First Bank</SelectItem>
            <SelectItem value="zenith">Zenith Bank</SelectItem>
            <SelectItem value="uba">UBA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-number">Account Number</Label>
        <div className="flex space-x-2">
          <Input
            id="account-number"
            type="text"
            inputMode="numeric"
            placeholder="Enter 10-digit account number"
            value={accountNumber}
            onChange={handleAccountNumberChange}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={verifyAccount}
            disabled={isVerifyingAccount || accountNumber.length !== 10 || !bank}
            className="whitespace-nowrap border-gift-primary/50 text-gift-primary hover:bg-gift-primary/5"
          >
            {isVerifyingAccount ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>

      {accountName && (
        <div className="p-2 bg-gift-background/50 rounded-md border border-gift-primary/20">
          <p className="text-sm font-medium">Account Name: {accountName}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="transfer-amount">Amount (₦)</Label>
        <Input
          id="transfer-amount"
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
        disabled={isProcessing || !accountNumber || !amount || !bank || !accountName}
        className="w-full text-white flex items-center gap-2"
      >
        <Banknote className="h-4 w-4" />
        {isProcessing ? "Processing..." : "Transfer Funds"}
      </Button>
    </form>
  );
};

export default BankTransferForm;
