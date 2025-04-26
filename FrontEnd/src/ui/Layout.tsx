// src/components/Layout.tsx
// import { Toaster } from "react-hot-toast";
import { config } from "../config/Config"; // Adjust path if needed
// import Footer from "./Footer";
import Header from "./Header";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client";
import client from "../subgraph/apolloClient";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();

  return (
    <>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={client}>
            <Header />
            {children}
            {/* <Footer /> */}
          </ApolloProvider>
        </QueryClientProvider>
      </WagmiProvider>
      {/* <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        toastOptions={{
          style: {
            backgroundColor: "black",
            color: "white",
          },
        }}
      /> */}
    </>
  );
};

export default Layout;