import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SHOW_CONTRACT_ABI } from "../lib/web3/eventcontract";

export const useSignEventContract = () => {
  const {
    writeContractAsync,
    isPending,
    error,
    data: hash,
  } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // ShowContract.sign() takes no arguments — msg.sender is used on-chain
  const signContractAsync = async (
    contractAddress: `0x${string}`,
    _username: string, // kept for backward compat with callers, not sent to chain
  ) => {
    console.log("~ signing ShowContract ~", contractAddress);

    return writeContractAsync({
      address: contractAddress,
      abi: SHOW_CONTRACT_ABI,
      functionName: "sign",
      args: [],
    });
  };

  return {
    signContractAsync,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
  };
};
