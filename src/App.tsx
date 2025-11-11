// import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import '@relayprotocol/relay-kit-ui/styles.css'
import '@rainbow-me/rainbowkit/styles.css'
import MyComponent from './MyComponent'
import { RelayKitProvider } from '@relayprotocol/relay-kit-ui'
import { WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { optimism } from 'viem/chains'
import { convertViemChainToRelayChain, MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
// import {getFreeBundlerUrl} from "@etherspot/free-bundler/utils"

const queryClient = new QueryClient()

const chains = [convertViemChainToRelayChain(optimism)]

const wagmiConfig = getDefaultConfig({
  appName: 'Relay Demo',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '3a8170812b534d0ff9d794f19a901d64',
  chains: [optimism],
  transports: {
    [optimism.id]: http("https://rpc.erc4337.io/10"),
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RelayKitProvider options={{
        appName: 'Relay Demo',
        appFees: [
          {
            recipient: '0x0000000000000000000000000000000000000000',
            fee: '100'
          }
        ],
        chains,
        baseApiUrl: MAINNET_RELAY_API
      }}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider>
            <MyComponent />
          </RainbowKitProvider>
        </WagmiProvider>
      </RelayKitProvider>
    </QueryClientProvider>
  )
}

export default App
