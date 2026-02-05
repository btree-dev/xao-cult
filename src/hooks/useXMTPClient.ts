import { useState, useEffect, useRef, useCallback } from "react";
import { Client, type Signer, type Identifier } from "@xmtp/browser-sdk";
import { useAccount, useSignMessage } from "wagmi";

interface UseXMTPClientResult {
  client: Client<any> | null;
  isLoading: boolean;
  error: string | null;
  walletAddress: string | null;
  showRevokeOption: boolean;
  retry: () => void;
  handleRevokeAndRetry: () => Promise<void>;
}

// Helper to find all XMTP IndexedDB databases
const findXmtpDatabases = async (): Promise<string[]> => {
  try {
    if ("databases" in indexedDB) {
      const dbs = await indexedDB.databases();
      return dbs
        .map((db) => db.name)
        .filter((name): name is string => !!name && name.includes("xmtp"));
    }
  } catch (e) {
    console.error("[XMTP] Failed to list databases:", e);
  }
  return [];
};

// Helper to clear XMTP OPFS data
const clearXmtpOPFS = async (): Promise<void> => {
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) {
      if (name.includes("xmtp") || name.includes("libxmtp")) {
        try {
          await root.removeEntry(name, { recursive: true });
          console.log(`[XMTP] Deleted OPFS: ${name}`);
        } catch (e) {
          console.error(`[XMTP] Failed to delete ${name}:`, e);
        }
      }
    }
  } catch (e) {
    console.error("[XMTP] Failed to clear OPFS:", e);
  }
};

// Show CLI instructions for manual cleanup
const showCliInstructions = () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  XMTP Installation Limit Reached - Manual Cleanup Required     ║
╠════════════════════════════════════════════════════════════════╣
║  Your wallet has 10/10 XMTP installations registered.          ║
║                                                                ║
║  Options:                                                      ║
║  1. Use a different wallet address                             ║
║  2. Use XMTP CLI:                                              ║
║     npm install -g @xmtp/cli                                   ║
║     xmtp auth && xmtp installations revoke-all-other           ║
║  3. Wait for installations to expire (30 days)                 ║
╚════════════════════════════════════════════════════════════════╝
  `);
};

/**
 * Hook for initializing XMTP client with wagmi wallet connection.
 *
 * Flow:
 * 1. Try Client.build() to restore existing client from local database
 * 2. If client is not registered, call registerIdentity() with signature
 * 3. If build fails, fall back to Client.create() (requires signature)
 */
export function useXMTPClient(): UseXMTPClientResult {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [client, setClient] = useState<Client<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showRevokeOption, setShowRevokeOption] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const initializingRef = useRef(false);
  const signerRef = useRef<Signer | null>(null);

  // Create XMTP signer using wagmi's signMessage
  const createSigner = useCallback((): Signer => {
    if (!address) throw new Error("No wallet address available");

    const normalizedAddress = address.toLowerCase();
    return {
      type: "EOA",
      getIdentifier: async () => ({
        identifier: normalizedAddress,
        identifierKind: "Ethereum",
      }),
      signMessage: async (message: string): Promise<Uint8Array> => {
        const sig = await signMessageAsync({ message });
        return new Uint8Array(Buffer.from(sig.slice(2), "hex"));
      },
    };
  }, [address, signMessageAsync]);

  // Initialize XMTP client
  const initializeXMTP = useCallback(
    async (forceRevoke = false) => {
      if (!isConnected || !address) return;
      if (initializingRef.current) return;
      initializingRef.current = true;

      setIsLoading(true);
      setError(null);
      setShowRevokeOption(false);

      const normalizedAddress = address.toLowerCase();
      setWalletAddress(normalizedAddress);

      try {
        const identifier: Identifier = {
          identifier: normalizedAddress,
          identifierKind: "Ethereum",
        };

        let xmtpClient: Client<any> | null = null;

        // Try to restore existing client from database
        try {
          console.log("[XMTP] Attempting to restore client...");
          const builtClient = await Client.build(identifier, {
            env: "dev",
            appVersion: "xao-cult/1.0.0",
          });

          if (builtClient.inboxId) {
            console.log("[XMTP] Client.build() succeeded, inboxId:", builtClient.inboxId);

            // Try to sync - if it fails, the identity may need registration
            try {
              await builtClient.preferences.sync();
              await builtClient.conversations.syncAll(["allowed", "unknown"]);
              xmtpClient = builtClient;
              console.log("[XMTP] Client restored and synced successfully");
            } catch (syncErr: any) {
              console.log("[XMTP] Sync failed:", syncErr.message);

              // Try to register identity if sync failed due to uninitialized identity
              if (syncErr.message?.includes("Uninitialized") || syncErr.message?.includes("identity")) {
                console.log("[XMTP] Attempting to register identity...");
                try {
                  const signatureRequest = (builtClient as any).createInboxSignatureRequest?.();
                  if (signatureRequest) {
                    const signer = createSigner();
                    signerRef.current = signer;
                    await (builtClient as any).registerIdentity(signer, signatureRequest);
                    console.log("[XMTP] Identity registered, retrying sync...");

                    // Retry sync after registration
                    await builtClient.preferences.sync();
                    await builtClient.conversations.syncAll(["allowed", "unknown"]);
                    xmtpClient = builtClient;
                    console.log("[XMTP] Client restored after registration");
                  }
                } catch (regErr: any) {
                  console.log("[XMTP] Registration failed:", regErr.message);
                }
              }
            }
          }
        } catch (buildErr: any) {
          console.log("[XMTP] Client.build() failed:", buildErr.message);
        }

        // Create new client if build/restore failed
        if (!xmtpClient) {
          console.log("[XMTP] Creating new client (signature required)...");
          const signer = createSigner();
          signerRef.current = signer;

          xmtpClient = await Client.create(signer, {
            env: "dev",
            appVersion: "xao-cult/1.0.0",
          });
          console.log("[XMTP] Client created, inboxId:", xmtpClient.inboxId);

          // Sync to get latest data
          try {
            await xmtpClient.preferences.sync();
            await xmtpClient.conversations.syncAll(["allowed", "unknown"]);
          } catch (syncErr) {
            // Non-critical - may fail if no data exists yet
          }
        }

        // Revoke old installations if requested
        if (forceRevoke && xmtpClient) {
          try {
            console.log("[XMTP] Revoking old installations...");
            await xmtpClient.revokeAllOtherInstallations();
            console.log("[XMTP] Old installations revoked");
          } catch (revokeErr) {
            console.error("[XMTP] Failed to revoke:", revokeErr);
          }
        }

        setClient(xmtpClient);
        setError(null);
      } catch (err: any) {
        console.error("[XMTP] Initialization failed:", err);

        // Handle installation limit error
        if (err.message?.includes("installations") || err.message?.includes("10/10")) {
          if (!forceRevoke) {
            setError("Too many devices registered. Attempting cleanup...");

            try {
              const existingDbs = await findXmtpDatabases();
              for (const dbName of existingDbs) {
                try {
                  await new Promise<void>((resolve) => {
                    const req = indexedDB.deleteDatabase(dbName);
                    req.onsuccess = () => resolve();
                    req.onerror = () => resolve();
                    req.onblocked = () => resolve();
                  });
                } catch (e) {
                  // Ignore
                }
              }

              await new Promise((resolve) => setTimeout(resolve, 500));
              initializingRef.current = false;
              await initializeXMTP(true);
              return;
            } catch (retryErr) {
              console.error("[XMTP] Auto-cleanup failed:", retryErr);
            }
          }

          showCliInstructions();
          setError("Too many devices (10/10 limit). See console for cleanup options.");
          setShowRevokeOption(true);
        } else {
          setError("Failed to initialize chat. Please try again.");
        }
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    },
    [isConnected, address, createSigner]
  );

  // Handle manual revoke and retry
  const handleRevokeAndRetry = useCallback(async () => {
    if (!address) {
      setError("No wallet connected. Please refresh.");
      return;
    }

    setShowRevokeOption(false);
    setError("Clearing installations...");
    setIsLoading(true);

    try {
      // Clear IndexedDB
      const existingDbs = await findXmtpDatabases();
      for (const dbName of existingDbs) {
        try {
          await new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          });
        } catch (e) {
          // Ignore
        }
      }

      // Clear OPFS
      await clearXmtpOPFS();

      await new Promise((resolve) => setTimeout(resolve, 500));
      setError(null);
      await initializeXMTP(true);
    } catch (err: any) {
      console.error("[XMTP] Cleanup failed:", err);
      setError("Cleanup failed. See console for CLI instructions.");
      setIsLoading(false);
      showCliInstructions();
    }
  }, [address, initializeXMTP]);

  // Retry function
  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // Initialize on mount and when wallet changes
  useEffect(() => {
    if (isConnected && address && !client) {
      initializeXMTP();
    }
  }, [isConnected, address, client, retryCount, initializeXMTP]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setClient(null);
      setWalletAddress(null);
      setError(null);
      setShowRevokeOption(false);
    }
  }, [isConnected]);

  return {
    client,
    isLoading,
    error,
    walletAddress,
    showRevokeOption,
    retry,
    handleRevokeAndRetry,
  };
}
