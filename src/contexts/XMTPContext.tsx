import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { Client, type Signer, type Identifier, type ConsentState } from "@xmtp/browser-sdk";
import { useAccount, useSignMessage } from "wagmi";

interface XMTPContextType {
  client: Client<any> | null;
  isLoading: boolean;
  error: string | null;
  walletAddress: string | null;
  showRevokeOption: boolean;
  unreadCount: number;
  clearUnread: () => void;
  retry: () => void;
  handleRevokeAndRetry: () => Promise<void>;
  // Frees XMTP installation slots on the network while keeping the current
  // client/session alive. Fixes "10/10 installations" without full reset.
  revokeOtherInstallations: () => Promise<{ revoked: boolean; error?: string }>;
}

const XMTPContext = createContext<XMTPContextType | null>(null);

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

// Helper to clear XMTP OPFS data.
// Per-entry try/catch: a locked file (from the live WASM worker) must NOT
// abort the rest of the sweep or propagate to React's error boundary.
const clearXmtpOPFS = async (): Promise<{ removed: string[]; skipped: string[] }> => {
  const removed: string[] = [];
  const skipped: string[] = [];
  try {
    const root = await navigator.storage.getDirectory();
    const entries = (root as any).entries?.();
    if (!entries) return { removed, skipped };

    const targets: string[] = [];
    for await (const [name] of entries) {
      if (name.includes("xmtp") || name.includes("libxmtp")) targets.push(name);
    }
    for (const name of targets) {
      try {
        await root.removeEntry(name, { recursive: true });
        removed.push(name);
        console.log(`[XMTP] Deleted OPFS: ${name}`);
      } catch (e: any) {
        skipped.push(name);
        console.warn(`[XMTP] OPFS "${name}" still locked (harmless if IndexedDB was cleared): ${e?.message || e}`);
      }
    }
  } catch (e) {
    console.warn("[XMTP] OPFS cleanup failed:", e);
  }
  return { removed, skipped };
};

// After reload, clear any storage the previous session requested to wipe.
// Runs before Client.create so no OPFS handles are open yet.
const consumePendingReset = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  const pending = window.sessionStorage.getItem("xao-xmtp-reset-pending");
  if (!pending) return false;
  window.sessionStorage.removeItem("xao-xmtp-reset-pending");
  console.log("[XMTP] Consuming pending reset — wiping local database…");
  try {
    const dbs = await findXmtpDatabases();
    for (const dbName of dbs) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => { console.log(`  deleted db: ${dbName}`); resolve(); };
        req.onerror   = () => resolve();
        req.onblocked = () => resolve();
      });
    }
    await new Promise((r) => setTimeout(r, 500));
    const { removed, skipped } = await clearXmtpOPFS();
    console.log(`[XMTP] Reset complete. OPFS: ${removed.length} removed, ${skipped.length} skipped.`);
  } catch (e) {
    console.warn("[XMTP] Reset swallowed error:", e);
  }
  return true;
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

interface XMTPProviderProps {
  children: ReactNode;
}

export function XMTPProvider({ children }: XMTPProviderProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [client, setClient] = useState<Client<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showRevokeOption, setShowRevokeOption] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const streamAbortRef = useRef<AbortController | null>(null);

  const initializingRef = useRef(false);
  const signerRef = useRef<Signer | null>(null);
  const currentAddressRef = useRef<string | null>(null);

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

      // Skip if we already have a client for this address
      if (client && currentAddressRef.current === address.toLowerCase()) {
        console.log("[XMTP] Client already initialized for this address");
        return;
      }

      initializingRef.current = true;

      // If the previous session asked for a reset, wipe the XMTP database
      // BEFORE we open any OPFS handles. Runs at most once per page load.
      await consumePendingReset();

      setIsLoading(true);
      setError(null);
      setShowRevokeOption(false);

      const normalizedAddress = address.toLowerCase();
      setWalletAddress(normalizedAddress);
      currentAddressRef.current = normalizedAddress;

      try {
        // Always use Client.create() which provides a signer for registration.
        // It restores from local DB if it exists, and auto-registers if needed.
        console.log("[XMTP] Creating/restoring client...");
        const signer = createSigner();
        signerRef.current = signer;

        const xmtpClient = await Client.create(signer, {
          env: "dev",
          appVersion: "xao-cult/1.0.0",
        });
        console.log("[XMTP] Client ready, inboxId:", xmtpClient.inboxId);

        // Sync to get latest data
        try {
          await xmtpClient.preferences.sync();
          await xmtpClient.conversations.syncAll(["allowed", "unknown"] as unknown as ConsentState[]);
          console.log("[XMTP] Synced successfully");
        } catch (syncErr) {
          console.log("[XMTP] Initial sync skipped (may be new identity)");
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

        // Count existing unread messages + stream new ones
        if (streamAbortRef.current) {
          streamAbortRef.current.abort();
        }
        const abortController = new AbortController();
        streamAbortRef.current = abortController;

        const myInboxId = xmtpClient.inboxId;

        (async () => {
          try {
            const conversations = await xmtpClient.conversations.list();
            console.log(`[XMTP] Checking ${conversations.length} conversations for unread messages`);

            // Get last-read timestamp from localStorage
            const lastReadKey = `xmtp-last-read-${normalizedAddress}`;
            const lastReadStr = localStorage.getItem(lastReadKey);
            const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;

            let initialUnread = 0;

            // Count unread from existing conversations
            for (const conv of conversations) {
              if (abortController.signal.aborted) break;
              try {
                await conv.sync();
                const messages = await conv.messages({ limit: BigInt(20) });
                for (const msg of messages) {
                  const msgTime = msg.sentAtNs ? Number(msg.sentAtNs) / 1_000_000 : 0; // ns to ms
                  const isFromOther = msg.senderInboxId !== myInboxId;
                  if (isFromOther && msgTime > lastReadTime) {
                    initialUnread++;
                  }
                }
              } catch {
                // Skip errored conversations
              }
            }

            if (!abortController.signal.aborted) {
              console.log(`[XMTP] Initial unread count: ${initialUnread}`);
              setUnreadCount(initialUnread);
            }

            // Stream new incoming messages across all conversations
            for (const conv of conversations) {
              if (abortController.signal.aborted) break;
              (async () => {
                try {
                  const stream = await conv.stream();
                  for await (const message of stream) {
                    if (abortController.signal.aborted) break;
                    if (message.senderInboxId !== myInboxId) {
                      console.log("[XMTP] New message notification");
                      setUnreadCount((prev) => prev + 1);
                    }
                  }
                } catch {
                  // Stream ended
                }
              })();
            }
          } catch (err) {
            console.log("[XMTP] Notification stream setup failed:", err);
          }
        })();
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
    [isConnected, address, client, createSigner]
  );

  // Revoke old installations on the XMTP network while keeping this client
  // alive. Call this to free "10/10" slots without destroying local state.
  const revokeOtherInstallations = useCallback(async (): Promise<{ revoked: boolean; error?: string }> => {
    if (!client) {
      return { revoked: false, error: "XMTP client not initialized" };
    }
    try {
      console.log("[XMTP] Revoking all other installations (keeping current)…");
      await (client as any).revokeAllOtherInstallations();
      console.log("[XMTP] Other installations revoked.");
      return { revoked: true };
    } catch (err: any) {
      console.error("[XMTP] revokeAllOtherInstallations failed:", err);
      return { revoked: false, error: err?.message || String(err) };
    }
  }, [client]);

  // Handle manual reset.
  //
  // Can't delete the XMTP database while the WASM client is holding OPFS
  // handles — that's why in-place cleanup always fails with
  // NoModificationAllowedError. Instead:
  //   1. First, free an installation slot on the XMTP network by calling
  //      revokeAllOtherInstallations() (needs a live client).
  //   2. Set a flag in sessionStorage and reload.
  //   3. On next page load, consumePendingReset() runs before any client is
  //      created, clearing IndexedDB + OPFS cleanly.
  //
  // Without step 1 you'd burn an installation slot each time and eventually
  // hit the hard 10-per-inbox limit.
  const handleRevokeAndRetry = useCallback(async () => {
    if (typeof window === "undefined") return;
    setShowRevokeOption(false);
    setIsLoading(true);
    setError("Resetting — freeing installation slots…");

    try {
      if (client) {
        try {
          await (client as any).revokeAllOtherInstallations();
          console.log("[XMTP] Pre-reset: revoked other installations.");
        } catch (revokeErr: any) {
          // Not fatal — continue with reset. If the cap was already hit, the
          // local reset still makes progress; user may need XMTP CLI to
          // fully recover.
          console.warn("[XMTP] Pre-reset revoke failed:", revokeErr?.message || revokeErr);
        }
      }
    } finally {
      setError("Resetting — reloading to clear local XMTP database…");
      window.sessionStorage.setItem("xao-xmtp-reset-pending", "1");
      setTimeout(() => window.location.reload(), 200);
    }
  }, [client]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    // Save last-read timestamp so we don't recount on next load
    if (walletAddress) {
      localStorage.setItem(`xmtp-last-read-${walletAddress}`, new Date().toISOString());
    }
  }, [walletAddress]);

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

  // Reset when wallet disconnects or changes
  useEffect(() => {
    if (!isConnected) {
      setClient(null);
      setWalletAddress(null);
      setError(null);
      setShowRevokeOption(false);
      setUnreadCount(0);
      currentAddressRef.current = null;
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
    } else if (address && currentAddressRef.current && address.toLowerCase() !== currentAddressRef.current) {
      // Wallet changed, reset client
      console.log("[XMTP] Wallet changed, resetting client");
      setClient(null);
      currentAddressRef.current = null;
    }
  }, [isConnected, address]);

  // Dev-friendly globals for the browser console.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__xaoResetXMTP = handleRevokeAndRetry;
    (window as any).__xaoRevokeOtherInstallations = revokeOtherInstallations;
    return () => {
      delete (window as any).__xaoResetXMTP;
      delete (window as any).__xaoRevokeOtherInstallations;
    };
  }, [handleRevokeAndRetry, revokeOtherInstallations]);

  const value: XMTPContextType = {
    client,
    isLoading,
    error,
    walletAddress,
    showRevokeOption,
    unreadCount,
    clearUnread,
    retry,
    handleRevokeAndRetry,
    revokeOtherInstallations,
  };

  return <XMTPContext.Provider value={value}>{children}</XMTPContext.Provider>;
}

export function useXMTPClient(): XMTPContextType {
  const context = useContext(XMTPContext);
  if (!context) {
    throw new Error("useXMTPClient must be used within an XMTPProvider");
  }
  return context;
}
