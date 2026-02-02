import { Client, type Signer } from "@xmtp/browser-sdk";
import { ethers } from "ethers";

/**
 * Creates an XMTP signer from a web3 provider
 */
export const createSigner = async (): Promise<Signer> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum as any);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  return {
    type: "EOA",
    getIdentifier: async () => ({
      identifier: address,
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      const sig = await signer.signMessage(message);
      return new Uint8Array(Buffer.from(sig.slice(2), "hex"));
    },
  };
};

/**
 * Initialize XMTP client
 */
export const initializeXMTPClient = async (
  signer: Signer,
  env: "local" | "dev" | "production" = "production"
): Promise<Client<any>> => {
  try {
    const client = await Client.create(signer, {
      env,
      appVersion: "xao-cult/1.0.0",
    });
    return client;
  } catch (error) {
    console.error("Failed to initialize XMTP client:", error);
    throw error;
  }
};

/**
 * Format message content for display
 */
export const formatMessageContent = (content: any): string => {
  if (typeof content === "string") {
    return content;
  }
  if (typeof content === "object") {
    return JSON.stringify(content);
  }
  return String(content);
};

/**
 * Save recipient inbox ID to localStorage
 */
export const saveRecipientInboxId = (inboxId: string): void => {
  localStorage.setItem("chatRecipientInboxId", inboxId);
};

/**
 * Get recipient inbox ID from localStorage
 */
export const getRecipientInboxId = (): string | null => {
  return localStorage.getItem("chatRecipientInboxId");
};

/**
 * Check if a wallet address can receive XMTP messages
 * Requires an initialized client instance
 */
export const canUserReceiveMessages = async (
  client: Client<any>,
  address: string
): Promise<boolean> => {
  try {
    const identifiers = [
      {
        identifier: address,
        identifierKind: "Ethereum" as const,
      },
    ];
    const response = await client.canMessage(identifiers);
    return response.get(address) || false;
  } catch (error) {
    console.error("Error checking if user can receive messages:", error);
    return false;
  }
};
