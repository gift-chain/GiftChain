"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Zap } from "lucide-react"
import { format } from "date-fns"

export default function CreateBulkCard() {
  const [bulkGifts, setBulkGifts] = useState([{ email: '', token: 'USDT', amount: '', expiry: '', message: '' }]);
  const [previewData, setPreviewData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const tokens = ['USDT', 'USDC', 'DAI'];
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  // Handle change in individual gift row
  const handleBulkGiftChange = (index: number, field: string, value: string) => {
    const updatedBulkGifts = [...bulkGifts];
    updatedBulkGifts[index][field] = value;
    setBulkGifts(updatedBulkGifts);
  };

  // Add new row for multi-field input
  const addBulkGiftRow = () => {
    setBulkGifts([...bulkGifts, { token: 'USDT', amount: '', expiry: '', message: '' }]);
  };

  // Remove row from multi-field input
  const removeBulkGiftRow = (index: number) => {
    const updatedBulkGifts = bulkGifts.filter((_, i) => i !== index);
    setBulkGifts(updatedBulkGifts);
  };

  // Preview gifts
  const previewGifts = () => {
    const hasInvalid = bulkGifts.some(gift => {
      return (
        !gift.amount || Number(gift.amount) <= 0 ||
        !gift.expiry || new Date(gift.expiry).getTime() <= Date.now()
      );
    });

    if (hasInvalid) {
      toast({
        title: "Invalid input",
        description: "Please make sure all gifts have a valid amount and future expiry date.",
        variant: "destructive",
      });
      return;
    }

    const previewList = bulkGifts.map(gift => ({
      giftID: 'temp-id',
      transactionHash: 'temp-hash',
      token: gift.token,
      amount: gift.amount,
      expiry: Math.floor(new Date(gift.expiry).getTime() / 1000),
      message: gift.message,
      creator: "0xYourAddress",
      downloadUrl: '',
    }));

    setPreviewData(previewList);
  };


  // include handler for bulkcreate function

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split('\n').filter(line => line.trim());
      const giftsFromCsv = lines.map((line) => {
        const [email, token, amount, expiry, message] = line.split(',');
        return {
          email: email?.trim() || '',
          token: token?.trim() || 'USDT',
          amount: amount?.trim() || '',
          expiry: expiry?.trim() || '',
          message: message?.trim() || ''
        };
      });

      setBulkGifts(giftsFromCsv);
    };

    reader.readAsText(file);
  };



  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Bulk Gift Section */}
        <div className="space-y-8">
          <div className="space-y-4">
            <Label htmlFor="csv-upload">Upload CSV</Label>
            <Input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={handleCsvUpload}
              className="bg-background/40 border-primary/30"
            />
          </div>

          <div className="space-y-6">
            {bulkGifts.map((gift, index) => (
              <div key={index} className="p-4 border rounded-md space-y-4">
                {/* Fields Container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    className="bg-background/40 border-primary/30 rounded-md px-3 py-2 w-full"
                    value={gift.token}
                    onChange={(e) => handleBulkGiftChange(index, 'token', e.target.value)}
                  >
                    {tokens.map((token) => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>

                  <Input
                    type="number"
                    value={gift.amount}
                    onChange={(e) => handleBulkGiftChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="bg-background/40 border-primary/30 px-4 py-2 rounded-md w-full"
                  />

                  <Input
                    type="datetime-local"
                    value={gift.expiry}
                    onChange={(e) => handleBulkGiftChange(index, 'expiry', e.target.value)}
                    min={minDateTime}
                    placeholder="dd/mm/yyyy --"
                    className="bg-background/40 border-primary/30 px-4 py-2 rounded-md w-full text-sm"
                    style={{ minWidth: '270px' }}
                  />

                  {/* <Textarea
                    placeholder="Message"
                    value={gift.message}
                    onChange={(e) => handleBulkGiftChange(index, 'message', e.target.value)}
                    className="bg-background/40 border-primary/30 px-4 py-2 rounded-md w-full"
                  /> */}
                </div>

                {/* Remove Button */}
                <div className="justify-end mt-2">
                  <Button
                    type="button"
                    onClick={() => removeBulkGiftRow(index)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md"
                    disabled={bulkGifts.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              onClick={addBulkGiftRow}
              className="w-full sm:w-auto gap-2 glow-border"
              size="lg"
            >
              Add More
            </Button>
          </div>

          {/* Preview Section */}
          <div className="mt-8">
            <Button
              className="w-full gap-2 glow-border"
              size="lg"
              onClick={previewGifts}
              disabled={isLoading}
            >
              <Zap className="h-5 w-5" />
              {isLoading ? 'Creating Bulk Gifts...' : 'Preview Gifts'}
            </Button>
          </div>
        </div>

        {/* Preview Display */}
        <div>
          <h3 className="text-lg font-medium mb-4">Preview</h3>
          <Card className="overflow-hidden border-0">
            <CardContent className="p-0">
              {previewData.map((gift, index) => (
                <div key={index} className="p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{gift.amount} {gift.token}</div>
                    {/* <p className="text-sm italic">"{gift.message}"</p> */}
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(gift.expiry * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final Submit */}
      <div className="mt-8">
        <Button
          className="w-full gap-2 glow-border"
          size="lg"
          onClick={() => { }}
          disabled={isLoading}
        >
          <Zap className="h-5 w-5" />
          {isLoading ? 'Creating Bulk Gifts...' : 'Finalize Bulk Creation'}
        </Button>
      </div>
    </div>
  );
}

