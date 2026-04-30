import { readContract } from '@wagmi/core';
import { config } from '../../wagmi';
import { USDC_ADDRESS_TESTNET, USDC_ADDRESS_MAINNET } from './chains';

export const USDC_DECIMALS = 6;

export const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function usdcAddressForChain(chainId?: number): `0x${string}` {
  return (chainId === 8453 ? USDC_ADDRESS_MAINNET : USDC_ADDRESS_TESTNET) as `0x${string}`;
}

export async function readUsdcBalance(
  account: `0x${string}`,
  chainId?: number,
): Promise<bigint> {
  const address = usdcAddressForChain(chainId);
  const balance = await readContract(config, {
    address,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [account],
  });
  return balance as bigint;
}

export interface WaitForBalanceOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onTick?: (balance: bigint) => void;
}

export async function waitForUsdcBalance(
  account: `0x${string}`,
  target: bigint,
  chainId?: number,
  opts: WaitForBalanceOptions = {},
): Promise<bigint> {
  const { intervalMs = 5_000, timeoutMs = 5 * 60_000, signal, onTick } = opts;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new Error('cancelled');
    }
    const balance = await readUsdcBalance(account, chainId);
    onTick?.(balance);
    if (balance >= target) {
      return balance;
    }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error('cancelled'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
  throw new Error('timeout');
}
