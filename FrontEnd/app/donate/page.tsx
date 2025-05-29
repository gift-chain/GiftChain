"use client"
import React, { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Search, Heart, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";

const searchSchema = z.object({
    code: z.string().length(8, {
        message: "Donation code must be exactly 8 characters.",
    }),
});

const donationSchema = z.object({
    amount: z.coerce.number().positive({
        message: "Amount must be a positive number.",
    }),
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
});

type SearchValues = z.infer<typeof searchSchema>;
type DonationValues = z.infer<typeof donationSchema>;

interface CampaignType {
    id: string;
    name: string;
    description: string;
    targetAmount: number;
    expiryDate: string;
    currentAmount: number;
    donations: Array<{ name: string, amount: number, date: string }>;
    createdAt: string;
}

const DonationForm = () => {
    const [step, setStep] = useState(1);
    const [campaign, setCampaign] = useState<CampaignType | null>(null);

    const searchForm = useForm<SearchValues>({
        resolver: zodResolver(searchSchema),
        defaultValues: {
            code: "",
        },
    });

    const donationForm = useForm<DonationValues>({
        resolver: zodResolver(donationSchema),
        defaultValues: {
            amount: 0,
            name: "",
        },
    });

    const onSearch = (values: SearchValues) => {
        // In a real app, we would fetch this from an API
        const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const foundCampaign = campaigns.find(
            (c: CampaignType) => c.id === values.code.toUpperCase()
        );

        if (foundCampaign) {
            setCampaign(foundCampaign);
            setStep(2);
        } else {
            toast.error("Campaign not found", {
                description: "Please check the code and try again",
            });
        }
    };

    const onDonate = (values: DonationValues) => {
        if (!campaign) return;

        // In a real app, we would send this to an API
        const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const campaignIndex = campaigns.findIndex((c: CampaignType) => c.id === campaign.id);

        if (campaignIndex !== -1) {
            campaigns[campaignIndex].currentAmount += values.amount;
            campaigns[campaignIndex].donations.push({
                name: values.name,
                amount: values.amount,
                date: new Date().toISOString(),
            });

            localStorage.setItem("campaigns", JSON.stringify(campaigns));

            // Update local state
            setCampaign(campaigns[campaignIndex]);
            toast.success("Thank you for your donation!", {
                description: `$${values.amount} has been added to the campaign.`,
            });

            donationForm.reset();
            setStep(3);
        }
    };

    const resetForm = () => {
        searchForm.reset();
        donationForm.reset();
        setCampaign(null);
        setStep(1);
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate progress percentage
    const calculateProgress = () => {
        if (!campaign) return 0;
        const percentage = (campaign.currentAmount / campaign.targetAmount) * 100;
        return Math.min(percentage, 100);
    };

    return (
        <div className="container py-20 max-w-3xl hexagon-bg">
            {/* <div className="space-y-8"> */}
            {step === 1 && (
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl">Make a Donation</CardTitle>
                        <CardDescription>
                            Enter a donation code to contribute to a campaign
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...searchForm}>
                            <form onSubmit={searchForm.handleSubmit(onSearch)} className="space-y-6">
                                <FormField
                                    control={searchForm.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Donation Code</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        className="pl-10"
                                                        placeholder="Enter the 8-character code"
                                                        {...field}
                                                        value={field.value.toUpperCase()}
                                                        onChange={e => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full ">
                                    Find Campaign
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {step === 2 && campaign && (
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl">{campaign.name}</CardTitle>
                        <CardDescription className="text-base">
                            {campaign.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>${campaign.currentAmount} of ${campaign.targetAmount}</span>
                            </div>
                            <Progress value={calculateProgress()} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Expiry Date</p>
                                <p className="font-medium">{formatDate(campaign.expiryDate)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Campaign ID</p>
                                <p className="font-medium">{campaign.id}</p>
                            </div>
                        </div>

                        <Form {...donationForm}>
                            <form onSubmit={donationForm.handleSubmit(onDonate)} className="space-y-6">
                                <FormField
                                    control={donationForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Your Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={donationForm.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Donation Amount ($)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="50" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full ">
                                    Donate Now
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="justify-center pt-0">
                        <Button variant="ghost" size="sm" onClick={resetForm}>
                            Search for another campaign
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && campaign && (
                <Card className="max-w-xl mx-auto text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <Heart className="h-16 w-16 text-red-500 animate-pulse-slow" />
                        </div>
                        <CardTitle className="text-2xl">Thank You!</CardTitle>
                        <CardDescription className="text-lg">
                            Your donation to "{campaign.name}" has been recorded
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Campaign Progress</span>
                                <span>${campaign.currentAmount} of ${campaign.targetAmount}</span>
                            </div>
                            <Progress value={calculateProgress()} className="h-2" />
                        </div>

                        <div className="space-y-4 mt-6">
                            <Button
                                onClick={resetForm}
                                className="w-full "
                            >
                                Make Another Donation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default DonationForm;
