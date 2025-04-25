// import { Toaster } from "react-hot-toast";

import { config } from "../config/Config";
// import Footer from "./Footer";
import Header from "./Header";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'



const Layout = ({ children }: { children: React.ReactNode }) => {

  const queryClient = new QueryClient()

  return (
    <>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <Header />
          {children}
          {/* <Footer /> */}
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