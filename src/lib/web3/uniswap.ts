import { base, baseSepolia } from 'wagmi/chains';

// Uniswap v3 + Universal Router addresses.
// Source: https://docs.uniswap.org/contracts/v3/reference/deployments
// Permit2 is the same address on every chain.
export const UNISWAP_ADDRESSES: Record<number, {
  universalRouter: `0x${string}`;
  permit2: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
}> = {
  [base.id]: {
    universalRouter: '0x6fF5693b99212Da76ad316178A184AB56D299b43',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  },
  [baseSepolia.id]: {
    universalRouter: '0x95273d871c8156636e114b63797d78D7E1720d81',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    quoterV2: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
    factory: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
  },
};

export const SUPPORTED_FEE_TIERS = [500, 3000, 10000] as const;
export type FeeTier = (typeof SUPPORTED_FEE_TIERS)[number];

export const SLIPPAGE_BPS = 50; // 0.5%
export const SWAP_DEADLINE_SECONDS = 30 * 60; // 30 minutes
export const PERMIT_EXPIRATION_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const PERMIT_SIG_DEADLINE_SECONDS = 30 * 60;

// Universal Router command bytes.
// https://github.com/Uniswap/universal-router/blob/main/contracts/libraries/Commands.sol
export const UR_COMMANDS = {
  V3_SWAP_EXACT_IN: 0x00,
  PERMIT2_PERMIT: 0x0a,
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
} as const;

export const QUOTER_V2_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable', // technically callable as view via call
    type: 'function',
  },
] as const;

export const FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const POOL_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount0', type: 'int256' },
      { indexed: false, name: 'amount1', type: 'int256' },
      { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
      { indexed: false, name: 'liquidity', type: 'uint128' },
      { indexed: false, name: 'tick', type: 'int24' },
    ],
    name: 'Swap',
    type: 'event',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const PERMIT2_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
      { name: 'nonce', type: 'uint48' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const MAX_UINT160 = (BigInt(1) << BigInt(160)) - BigInt(1);
export const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);

// Permit2 EIP-712 domain (matches official deployment on every chain).
export function permit2Domain(chainId: number) {
  return {
    name: 'Permit2',
    chainId,
    verifyingContract: UNISWAP_ADDRESSES[chainId]?.permit2,
  } as const;
}

export const PERMIT_SINGLE_TYPES = {
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
} as const;
