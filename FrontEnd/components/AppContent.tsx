// components/AppContent.tsx
"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme-provider";

// Dynamically import ApolloWrapper to ensure ApolloProvider runs only on the client
const ApolloWrapper = dynamic(() => import("./ApolloWrapper"), {
  ssr: false,
});

export default function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      disableTransitionOnChange={true}
    >
      <ApolloWrapper>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </ApolloWrapper>
    </ThemeProvider>
  );
}