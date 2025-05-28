import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask} from 'wagmi/connectors'

export const config = createConfig({
    chains: [mainnet, sepolia],
    connectors: [
        injected(), // This handles MetaMask and other injected wallets
        metaMask(), // Specifically for MetaMask
         // Only if you want WalletConnect support
    ],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(""),
    },
})