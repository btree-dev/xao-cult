import { useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { signTypedData, writeContract, waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { encodeAbiParameters, encodePacked, type Hash } from 'viem';
import { TokenInfo, SwapChainId } from '../lib/web3/tokens';
import {
  ERC20_ABI,
  MAX_UINT160,
  MAX_UINT256,
  PERMIT2_ABI,
  PERMIT_EXPIRATION_SECONDS,
  PERMIT_SIG_DEADLINE_SECONDS,
  PERMIT_SINGLE_TYPES,
  SLIPPAGE_BPS,
  SWAP_DEADLINE_SECONDS,
  UNISWAP_ADDRESSES,
  UNIVERSAL_ROUTER_ABI,
  UR_COMMANDS,
  permit2Domain,
  type FeeTier,
} from '../lib/web3/uniswap';
import { config } from '../wagmi';

export type SwapState =
  | 'idle'
  | 'approving'
  | 'signing'
  | 'swapping'
  | 'success'
  | 'error';

export interface SwapResult {
  txHash: Hash;
}

interface SwapInput {
  chainId: SwapChainId;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: bigint;
  amountOutQuoted: bigint;
  feeTier: FeeTier;
}

function applySlippage(amountOut: bigint): bigint {
  return (amountOut * BigInt(10000 - SLIPPAGE_BPS)) / BigInt(10000);
}

function encodeV3Path(tokenIn: `0x${string}`, fee: FeeTier, tokenOut: `0x${string}`): `0x${string}` {
  return encodePacked(['address', 'uint24', 'address'], [tokenIn, fee, tokenOut]);
}

export function useUniswapSwap() {
  const { address } = useAccount();
  const [state, setState] = useState<SwapState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setTxHash(null);
  }, []);

  const swap = useCallback(
    async (input: SwapInput): Promise<SwapResult> => {
      reset();
      setError(null);
      try {
        if (!address) throw new Error('Wallet not connected');

        const { chainId, tokenIn, tokenOut, amountIn, amountOutQuoted, feeTier } = input;
        const deployment = UNISWAP_ADDRESSES[chainId];
        if (!deployment) throw new Error('Uniswap not deployed on this chain');

        const { universalRouter, permit2 } = deployment;
        // 1. Ensure ERC20 → Permit2 allowance is sufficient. One-time per token.
        setState('approving');
        const erc20Allowance = (await readContract(config, {
          address: tokenIn.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, permit2],
          chainId,
        })) as bigint;

        if (erc20Allowance < amountIn) {
          const approveHash = await writeContract(config, {
            address: tokenIn.address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [permit2, MAX_UINT256],
            chainId,
          });
          await waitForTransactionReceipt(config, { hash: approveHash, chainId });
        }

        // 2. Read current Permit2 nonce for this (owner, token, spender) triple.
        setState('signing');
        const allowanceResult = await readContract(config, {
          address: permit2,
          abi: PERMIT2_ABI,
          functionName: 'allowance',
          args: [address, tokenIn.address, universalRouter],
          chainId,
        });
        // viem may return either a tuple or a named-object depending on ABI shape.
        const rawNonce = Array.isArray(allowanceResult)
          ? allowanceResult[2]
          : (allowanceResult as unknown as { nonce: number | bigint }).nonce;
        const nonce = Number(rawNonce ?? 0);

        const now = Math.floor(Date.now() / 1000);
        const permitSingle = {
          details: {
            token: tokenIn.address,
            amount: MAX_UINT160,
            expiration: now + PERMIT_EXPIRATION_SECONDS,
            nonce,
          },
          spender: universalRouter,
          sigDeadline: BigInt(now + PERMIT_SIG_DEADLINE_SECONDS),
        };

        console.log('[uniswap-swap] signing PermitSingle', {
          domain: permit2Domain(chainId),
          message: permitSingle,
          allowanceResult,
          nonceRaw: rawNonce,
        });

        let signature: `0x${string}`;
        try {
          signature = await signTypedData(config, {
            domain: permit2Domain(chainId),
            types: PERMIT_SINGLE_TYPES,
            primaryType: 'PermitSingle',
            message: permitSingle,
          });
        } catch (signErr) {
          console.error('[uniswap-swap] signTypedData failed', signErr, {
            message: permitSingle,
            types: PERMIT_SINGLE_TYPES,
          });
          throw signErr;
        }

        // 3. Encode Universal Router execute() call.
        const amountOutMin = applySlippage(amountOutQuoted);
        const path = encodeV3Path(tokenIn.address, feeTier, tokenOut.address);

        const permitInput = encodeAbiParameters(
          [
            {
              type: 'tuple',
              components: [
                {
                  name: 'details',
                  type: 'tuple',
                  components: [
                    { name: 'token', type: 'address' },
                    { name: 'amount', type: 'uint160' },
                    { name: 'expiration', type: 'uint48' },
                    { name: 'nonce', type: 'uint48' },
                  ],
                },
                { name: 'spender', type: 'address' },
                { name: 'sigDeadline', type: 'uint256' },
              ],
            },
            { type: 'bytes' },
          ],
          [permitSingle, signature] as never,
        );

        const swapInput = encodeAbiParameters(
          [
            { type: 'address' },
            { type: 'uint256' },
            { type: 'uint256' },
            { type: 'bytes' },
            { type: 'bool' },
          ],
          [address, amountIn, amountOutMin, path, true],
        );

        const commands = encodePacked(
          ['uint8', 'uint8'],
          [UR_COMMANDS.PERMIT2_PERMIT, UR_COMMANDS.V3_SWAP_EXACT_IN],
        );
        const deadline = BigInt(now + SWAP_DEADLINE_SECONDS);

        setState('swapping');
        const hash = await writeContract(config, {
          address: universalRouter,
          abi: UNIVERSAL_ROUTER_ABI,
          functionName: 'execute',
          args: [commands, [permitInput, swapInput], deadline],
          chainId,
        });
        setTxHash(hash);
        await waitForTransactionReceipt(config, { hash, chainId });
        setState('success');
        return { txHash: hash };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Swap failed';
        setError(message);
        setState('error');
        throw e;
      }
    },
    [address, reset],
  );

  return { swap, state, error, txHash, reset };
}
