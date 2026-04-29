import React from "react";
import Image from "next/image";
import styles from "../styles/ContractsNav.module.css";
import { useRouter } from "next/router";
import { useWeb3 } from "../hooks/useWeb3";
import { useReadContract } from "wagmi";
import { USDC_ADDRESS_TESTNET, USDC_ADDRESS_MAINNET } from "../lib/web3/chains";

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ContractsNav: React.FC = () => {
  const router = useRouter();
  const { address, isConnected, chain } = useWeb3();
  const usdcAddress = chain?.id === 8453 ? USDC_ADDRESS_MAINNET : USDC_ADDRESS_TESTNET;

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const formattedUSDC = usdcBalance != null ? (Number(usdcBalance) / 1e6).toFixed(2) : '0.00';

  const handleBack = () => {
    router.push("/dashboard");
  };

  const handleFileAdd = () => {
    router.push("/contracts/create-contract");
  };

  const handleChat = () => {
    router.push("/contracts/Negotiation");
  };

  const handleCheck = () => {
    router.push("/contracts/current-contract");
  };

  const handleRemoveMinus = () => {
    router.push("/contracts/past-contracts");
  };

  const isCreateContractPage = router.pathname === "/contracts/create-contract";
  const isNegotiationPage = router.pathname === "/contracts/Negotiation";
  const isCurrentContractPage = router.pathname === "/contracts/current-contract";
  const isPastContractsPage = router.pathname === "/contracts/past-contracts";

  const networkName = chain?.id === 84532 ? "Base Sepolia" : chain?.id === 8453 ? "Base" : chain?.id === 1 ? "Ethereum" : `Chain ${chain?.id}`;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <nav className={styles.navbar}>
      {isConnected && (
        <div className={styles.walletInfo}>
          <span className={styles.walletNetwork}>{networkName}</span>
          <span className={styles.walletAddress}>{shortAddress}</span>
          <span className={styles.walletBalance}>${formattedUSDC}</span>
        </div>
      )}
      <div className={styles.iconRow}>
        <span onClick={handleBack} style={{ cursor: "pointer" }}>
          <Image src="/contracts-nav/Back.svg" alt="Back" width={40} height={40} />
        </span>
        <span onClick={handleFileAdd} style={{ cursor: "pointer" }}>
          <Image
            src={
              isCreateContractPage
                ? "/contracts-nav/File_Add_Selected.svg"
                : "/contracts-nav/File_Add.svg"
            }
            alt="Add"
            width={40}
            height={40}
          />
        </span>
        <span onClick={handleChat} style={{ cursor: "pointer" }}>
          <Image
            src={
              isNegotiationPage
                ? "/contracts-nav/Chat_Conversation_Circle_Selected.svg"
                : "/contracts-nav/Chat_Conversation_Circle.svg"
            }
            alt="Chat"
            width={40}
            height={40}
          />
        </span>
        <span onClick={handleCheck} style={{ cursor: "pointer" }}>
          <Image
            src={
              isCurrentContractPage
                ? "/contracts-nav/Checkbox_Check_Selected.svg"
                : "/contracts-nav/Checkbox_Check.svg"
            }
            alt="Check"
            width={40}
            height={40}
          />
        </span>
        <span onClick={handleRemoveMinus} style={{ cursor: "pointer" }}>
          <Image
            src={
              isPastContractsPage
                ? "/contracts-nav/Remove_Minus_Circle_Selected.svg"
                : "/contracts-nav/Remove_Minus_Circle.svg"
            }
            alt="Minus"
            width={40}
            height={40}
          />
        </span>
      </div>
    </nav>
  );
};

export default ContractsNav;