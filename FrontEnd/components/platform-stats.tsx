"use client";

import { useState, useEffect } from "react";
import { Users, Gift, Wallet, TrendingUp } from "lucide-react";

interface StatProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

const StatCard = ({ icon, value, label, prefix = "", suffix = "", duration = 2000 }: StatProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = Date.now();
    
    const animateCount = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = Math.floor(progress * value);
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setCount(value); // Ensure we end at exactly the target value
      }
    };
    
    requestAnimationFrame(animateCount);
    
    return () => {
      setCount(value); // Set to final value on cleanup
    };
  }, [value, duration]);

  return (
    <div className="stat-card flex flex-col items-center p-6 bg-card rounded-lg border glow-border">
      <div className="stat-icon mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-primary bg-opacity-20">
        {icon}
      </div>
      <div className="stat-value text-3xl font-bold mb-2">
        {prefix}
        <span className="counter">{count.toLocaleString()}</span>
        {suffix}
      </div>
      <div className="stat-label text-muted-foreground text-sm">{label}</div>
    </div>
  );
};

export default function PlatformStats() {
  return (
    <section className="py-16 mesh-bg w-full">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 gradient-text">Platform Statistics</h2>
          <p className="text-muted-foreground md:w-2/3 mx-auto">
            Join thousands of users already creating and sharing blockchain gift on our platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Gift className="h-6 w-6 text-white" />} value={12458} label="Gift Created" />
          <StatCard icon={<Users className="h-6 w-6 text-white" />} value={5723} label="Active Users" />
          <StatCard icon={<Wallet className="h-6 w-6 text-white" />} value={9845} label="Gifts Claimed" />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            value={2456}
            label="ETH Transferred"
            prefix=""
            suffix="+"
          />
        </div>
      </div>
    </section>
  );
}