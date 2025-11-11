import createFreeBundler from "@etherspot/free-bundler";
import {
    decodeFunctionData,
    encodeFunctionData,
    publicActions,
    walletActions,
    type Chain,
    type Hex,
    type TypedData,
    type TypedDataDefinition
} from "viem";
import {
    entryPoint08Abi,
    getUserOperationHash,
    toPackedUserOperation,
    toSmartAccount
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { ambireAccountAbi } from "../abi/ambire";
import { getUserOp712Data } from "../utils/ambire721TypedData";

export type Call = {
    to: Hex
    data?: Hex | undefined
    value?: bigint | undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useAmbireWallet(walletClient: any, chain: Chain) {
    const owner = privateKeyToAccount(import.meta.env.VITE_PRIVATE_KEY);

    const bundlerClient = createFreeBundler({chain})
                            .extend(publicActions)
                            .extend(walletActions);
    
    const toAmbireAccount = () => {
        if (walletClient) {
            return toSmartAccount({
                client: bundlerClient,
                entryPoint: {
                    abi: entryPoint08Abi,
                    address: "0x43370900c8de573dB349BEd8DD53b4Ebd3Cce709",
                    version: "0.8"
                },
                async encodeCalls (calls: readonly Call[]) {
                    return encodeFunctionData({
                        abi: ambireAccountAbi,
                        functionName: "executeBySender",
                        args: [
                            calls.map(call => {
                                return {
                                    data: call.data ?? "0x",
                                    to: call.to,
                                    value: call.value ?? 0n
                                }
                            }),
                        ]
                    })
                },
                async decodeCalls(data: Hex) {
                    const res = decodeFunctionData({
                        abi: ambireAccountAbi,
                        data
                    });
                    if(res.functionName === "executeBySender") {
                        return res.args[0]
                    }
                    throw new Error("unknown call encoded: " + data);
                },
                authorization: {
                    account: walletClient.account,
                    address: "0xE729Be5802E9AF82Ed2B3C1ea2A8fe3D8DD05beF"
                },
                async getAddress() {
                    return owner.address
                },
                async getFactoryArgs() {
                    return { factory: '0x7702', factoryData: '0x' }
                },
                async getStubSignature() {
                    return '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'
                },
                async signMessage(parameters) {
                    const { message } = parameters
                    return await walletClient.signMessage({ message })
                },
                async signTypedData(parameters) {
                    const { domain, types, primaryType, message } =
                        parameters as TypedDataDefinition<TypedData, string>
                    return await walletClient.signTypedData({
                        domain,
                        message,
                        primaryType,
                        types,
                    })
                },
                async signUserOperation(parameters) {
                    const { chainId = bundlerClient.chain!.id, authorization, ...userOperation } = parameters
                    const packedUserOp = toPackedUserOperation({...userOperation, sender: owner.address});
                    const useropHash = getUserOperationHash({
                        userOperation: {
                            ...userOperation,
                            authorization,
                            sender: walletClient.account.address
                        },
                        entryPointAddress: "0x43370900c8de573dB349BEd8DD53b4Ebd3Cce709",
                        entryPointVersion: "0.8",
                        chainId: chainId
                    });
    
                    const res = decodeFunctionData({
                        abi: ambireAccountAbi,
                        data: packedUserOp.callData
                    });
    
                    const calls: [string, string, string][] = (res.args[0] as Call[]).map((call) => {
                        return [call.to, (call.value || 0n).toString(), call.data || "0x"];
                    });
    
                    const typedData = getUserOp712Data(
                        BigInt(chain.id),
                        calls,
                        packedUserOp,
                        useropHash
                    )
                    const signature = await walletClient.signTypedData({
                        message: typedData.value,
                        types: typedData.types,
                        domain: typedData.domain,
                        primaryType: "Ambire4337AccountOp"
                    });
    
                    return signature;
                },
            })
        }
    };

    return {
        bundlerClient,
        owner,
        toAmbireAccount
    }
}
