import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
    chains: [mainnet, sepolia],
    multiInjectedProviderDiscovery: true,
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
})