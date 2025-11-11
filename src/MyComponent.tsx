import { SwapWidget, type Token } from '@relayprotocol/relay-kit-ui'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import { useConnections, useWalletClient } from 'wagmi'
import { adaptViemWallet } from '@relayprotocol/relay-sdk'
import useAmbireWallet, { type Call } from './hooks/useAmbireWallet'
import { optimism } from 'viem/chains'
import type { SignAuthorizationReturnType } from 'viem'

export default function MyComponent() {
  const { openConnectModal } = useConnectModal()
  // console.log("openConnectModal:: ", openConnectModal);
  // console.log("connectModalOpen:: ", connectModalOpen);
  const [fromToken, setFromToken] = useState<Token | undefined>(undefined)
  const [toToken, setToToken] = useState<Token | undefined>(undefined)
  const [waitingForSignature, setWaitingForSignature] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quote, setQuote] = useState<any|undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userOpHash, setUserOpHash] = useState<string | undefined>(undefined)
  const [txHash, setTxHash] = useState<string | undefined>(undefined)
  const connections = useConnections();
  // console.log('Connections', connections);
  const { data: walletClient } = useWalletClient({ connector: connections[0]?.connector })
  // console.log('Wallet Client', walletClient);

  const {bundlerClient, owner, toAmbireAccount} = useAmbireWallet(walletClient, optimism)

  // console.log("from token:: ", fromToken);
  // console.log("to token:: ", toToken);

  const handle7702Tx = async () => {
    setWaitingForSignature(true);
    if(!walletClient || !quote) {
      return;
    }
    
    const ambireAccount = await toAmbireAccount();

    if(!ambireAccount) {
      return;
    }

    const code = await bundlerClient.getCode({address: walletClient.account.address});
    const delegateAddress = ambireAccount.authorization?.address;

    let authorization: SignAuthorizationReturnType | undefined;
    if(delegateAddress && code !== `0xef0100${delegateAddress.toLowerCase().substring(2)}`) {
        authorization = await bundlerClient.signAuthorization({
            account: owner,
            contractAddress: delegateAddress
        })
    }

    console.log("authorization:: ", authorization);
    const calls: Call[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote.steps.map((step: any) => {
      for(const item of step.items) {
        const {to, data, value} = item.data;
        calls.push({
          to,
          data,
          value: BigInt(value)
        })
      }
    })

    console.log("calls:: ", calls);

    let userOpHashValue;
    try {
      userOpHashValue = await bundlerClient.sendUserOperation({
        account: ambireAccount,
        authorization,
        factory: authorization ? "0x7702" : undefined,
        calls,
      });
    } catch(err) {
      console.log(err)
      setWaitingForSignature(false)
      return;
    }

    console.log("userOpHash:: ", userOpHashValue);
    // Open modal immediately with placeholder data
    setWaitingForSignature(false)
    setIsModalOpen(true)
    setTxHash(undefined)
    setUserOpHash(userOpHashValue)

    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHashValue
    });

    console.log("receipt:: ", receipt);
    
    // Extract tx hash from receipt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receiptTxHash = (receipt as any)?.receipt?.transactionHash || (receipt as any)?.transactionHash;
    if(receiptTxHash) {
      setTxHash(receiptTxHash)
    }
  }

  const truncateHash = (hash: string | undefined) => {
    if (!hash) return 'Loading...'
    if (hash.length <= 10) return hash
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
  }

  return (
    <>
    <SwapWidget
      wallet={walletClient ? adaptViemWallet(walletClient) : undefined}
      fromToken={fromToken}
      setFromToken={setFromToken}
      toToken={toToken}
      setToToken={setToToken}
      defaultAmount={'0'}
      supportedWalletVMs={['evm']}
      onConnectWallet={() => openConnectModal?.()}
      onAnalyticEvent={(eventName, data) => {
        if(eventName === "QUOTE_REQUESTED") {
          setQuote(undefined);
        }
        if(eventName === "QUOTE_RECEIVED") {
          setQuote(data);
        }
        console.log('Analytic Event', eventName, data)
      }}
    />
    <button
      style={{
        marginTop: 10,
        backgroundColor: quote ? "#3a00b4" : "#C7C7C7",
        color: quote && fromToken && toToken ? "white" : "#6F6F6F",
        width: 408,
        height: 44,
        borderRadius: 10,
        fontWeight: "bolder"
      }}
      disabled={!fromToken || !toToken || !quote}
      onClick={handle7702Tx}
    >
      {waitingForSignature ? `Waiting for signtaure...` : !fromToken || !toToken ? `Select a token` : `Swap using 7702⚡️` }
    </button>

    {/* Transaction Modal */}
    {isModalOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '480px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#000'
            }}>Transaction Details</h2>
            <button
              onClick={() => {
                setIsModalOpen(false)
                setQuote(undefined)
                setFromToken(undefined)
                setToToken(undefined)
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: 0,
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Success Icon */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#3a00b4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                border: '3px solid #f5f5f5'
              }}>
                <span style={{ color: 'white', fontSize: '24px' }}>✓</span>
              </div>
              <span style={{ color: 'white', fontSize: '40px' }}>★</span>
            </div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#000'
            }}>Transaction Completed</h3>
          </div>

          {/* Transaction Details Box */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: '500'
                }}>UserOp Hash:</span>
                <span style={{
                  fontSize: '14px',
                  color: '#000',
                  fontFamily: 'monospace'
                }}>{truncateHash(userOpHash)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: '500'
                }}>Tx Hash:</span>
                <span style={{
                  fontSize: '14px',
                  color: '#000',
                  fontFamily: 'monospace'
                }}>{truncateHash(txHash)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              onClick={() => {
                // View details action - could open explorer links
                if (userOpHash) {
                  window.open(`https://jiffyscan.xyz/userOpHash/${userOpHash}`, '_blank')
                }
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#e9d5ff',
                color: '#3a00b4',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              VIEW DETAILS
            </button>
            <button
              onClick={() => {
                setIsModalOpen(false)
                setQuote(undefined)
                setFromToken(undefined)
                setToToken(undefined)
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#3a00b4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
