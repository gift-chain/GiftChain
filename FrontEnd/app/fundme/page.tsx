'use client'
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const formSchema = z.object({
    name: z.string().min(3, {
        message: "Campaign name must be at least 3 characters.",
    }),
    description: z.string().min(10, {
        message: "Description must be at least 10 characters.",
    }),
    targetAmount: z.coerce.number().positive({
        message: "Amount must be a positive number.",
    }),
    expiryDate: z.date({
        required_error: "Please select an expiry date for your campaign."
    }).refine((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    }, {
        message: "Expiry date cannot be in the past."
    }),
});

type FormValues = z.infer<typeof formSchema>;

const generateDonationCode = () => {
    return nanoid(8).toUpperCase();
};

const CreateDonationForm = () => {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [isCodeGenerated, setIsCodeGenerated] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            targetAmount: 0,
            expiryDate: undefined,
        },
    });

    const onSubmit = (values: FormValues) => {
        const donationCode = generateDonationCode();
        setCode(donationCode);

        // Here we would typically save to a database
        // For now, we'll save to localStorage
        const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const newCampaign = {
            id: donationCode,
            name: values.name,
            description: values.description,
            targetAmount: values.targetAmount,
            expiryDate: values.expiryDate.toISOString(),
            currentAmount: 0,
            donations: [],
            createdAt: new Date().toISOString(),
        };

        campaigns.push(newCampaign);
        localStorage.setItem("campaigns", JSON.stringify(campaigns));

        setIsCodeGenerated(true);
        toast.success("Campaign created successfully!", {
            description: "Your donation code has been generated.",
        });
    };

    return (
        <div className="container py-20 max-w-3xl hexagon-bg">
            {/* <div className="space-y-8"> */}
            {!isCodeGenerated ? (
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl">Create a Donation Campaign</CardTitle>
                        <CardDescription>
                            Fill out the form below to generate a unique donation code
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Campaign Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., Help Build a School"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                This will be the name of your donation campaign
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your campaign and how the funds will be used"
                                                    className="min-h-[120px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="targetAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Amount ($)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="1000"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="expiryDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Expiry Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => {
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            return date < today;
                                                        }}
                                                        initialFocus
                                                        className={cn("p-3 pointer-events-auto")}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                Your campaign will be active until this date
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full ">
                                    Generate Donation Code
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="max-w-xl mx-auto text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl">Donation Campaign Created!</CardTitle>
                        <CardDescription className="text-lg">
                            Your campaign "{form.getValues("name")}" has been created successfully
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-donation/10 rounded-lg p-6">
                            <h3 className="text-sm font-medium mb-2">Your unique donation code is:</h3>
                            <p className="text-3xl font-bold font-mono tracking-wider mb-4 gradient-text">{code}</p>
                            <p className="text-sm text-muted-foreground">
                                Share this code with potential donors so they can contribute to your campaign
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Button
                                onClick={() => router.push("/donate")}
                                className="w-full bg-donation hover:bg-donation-dark"
                            >
                                Go to Donation Page
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsCodeGenerated(false);
                                    form.reset();
                                }}
                            >
                                Create Another Campaign
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default CreateDonationForm;
