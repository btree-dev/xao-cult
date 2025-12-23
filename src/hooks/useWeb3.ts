import { useAccount, useChainId } from 'wagmi';

export const useWeb3 = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  return {
    address,
    isConnected,
    chain: { id: chainId },
    isBaseNetwork: chainId === 8453 || chainId === 84532, // Base mainnet or Base Sepolia
  };
};
