import React from "react";
import Image from "next/image";
import styles from "../styles/ContractsNav.module.css";
import { useRouter } from "next/router";

const ContractsNav: React.FC = () => {
  const router = useRouter();

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

  return (
    <nav className={styles.navbar}>
      <div className={styles.iconRow}>
        <span onClick={handleBack} style={{ cursor: "pointer" }}>
          <Image src="/contracts-nav/Back.svg" alt="Back" width={40} height={40} />
        </span>
        <span onClick={handleFileAdd} style={{ cursor: "pointer" }}>
          <Image
            src={
              isCreateContractPage
                ? "/contracts-nav/File_Add_selected.svg"
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