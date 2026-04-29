import { useAccount } from 'wagmi';

export const useWeb3 = () => {
  const { address, isConnected, chain } = useAccount();

  return {
    address,
    isConnected,
    chain: chain ?? { id: 0 },
    isBaseNetwork: chain?.id === 8453 || chain?.id === 84532, // Base mainnet or Base Sepolia
  };
};
