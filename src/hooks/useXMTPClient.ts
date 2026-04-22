import { useState, useEffect, useRef, useCallback } from "react";
import { Client, type Signer, type Identifier, type ConsentState } from "@xmtp/browser-sdk";
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

// Helper to clear XMTP OPFS data.
//
// Uses per-entry try/catch because the WASM worker may still hold locks on
// some files during a page-reload transition — throwing would abort the rest
// of the cleanup (and break the app via Next's error overlay).
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
        // NoModificationAllowedError = file still held by XMTP wasm worker.
        // Harmless for the reset flow — IndexedDB is the authoritative store;
        // leftover OPFS files will be overwritten on next identity registration.
        console.warn(`[XMTP] Could not delete OPFS "${name}" (likely locked by worker): ${e?.message || e}`);
      }
    }
  } catch (e) {
    console.warn("[XMTP] OPFS cleanup failed:", e);
  }
  return { removed, skipped };
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

  // If a previous session requested a reset, clear XMTP storage BEFORE the
  // WASM client opens any OPFS file handles. Doing this after the client is
  // alive fails with NoModificationAllowedError because OPFS sync access
  // handles are held exclusively by the running XMTP wasm worker.
  const consumedResetFlagRef = useRef(false);
  const consumePendingReset = useCallback(async () => {
    if (consumedResetFlagRef.current) return;
    if (typeof window === "undefined") return;
    const pending = window.sessionStorage.getItem("xao-xmtp-reset-pending");
    if (!pending) return;
    consumedResetFlagRef.current = true;
    window.sessionStorage.removeItem("xao-xmtp-reset-pending");
    console.log("[XMTP] Consuming pending reset — wiping local database…");

    // All steps wrapped in try/catch — a partial reset is still progress, and
    // we never want this to throw up to the React error boundary.
    try {
      // IndexedDB holds XMTP's primary MLS state; clearing it is the most
      // important part of the reset. Always attempt this first.
      const dbs = await findXmtpDatabases();
      for (const dbName of dbs) {
        try {
          await new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => { console.log(`  deleted db: ${dbName}`); resolve(); };
            req.onerror   = () => { console.warn(`  db delete error: ${dbName}`); resolve(); };
            req.onblocked = () => { console.warn(`  db delete blocked: ${dbName}`); resolve(); };
          });
        } catch (err) {
          console.warn(`[XMTP] Failed to delete db ${dbName}:`, err);
        }
      }

      // Brief settle so any surviving worker / open handle from the previous
      // session has a chance to release OPFS locks before we try removeEntry.
      await new Promise((r) => setTimeout(r, 750));

      const { removed, skipped } = await clearXmtpOPFS();
      console.log(`[XMTP] Reset complete. OPFS: ${removed.length} removed, ${skipped.length} skipped (locked).`);
    } catch (e) {
      console.warn("[XMTP] Reset swallowed error:", e);
    }
  }, []);

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

      // Must run before any Client.build/create that opens OPFS handles.
      await consumePendingReset();

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
              await builtClient.conversations.syncAll(["allowed", "unknown"] as unknown as ConsentState[]);
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
                    await builtClient.conversations.syncAll(["allowed", "unknown"] as unknown as ConsentState[]);
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
            await xmtpClient.conversations.syncAll(["allowed", "unknown"] as unknown as ConsentState[]);
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

  // Handle manual revoke and retry.
  //
  // Can't delete the XMTP database while the WASM client is holding OPFS
  // file handles (fails with NoModificationAllowedError). Instead: stash a
  // flag in sessionStorage, reload, and `consumePendingReset()` will wipe
  // the storage cleanly on the next session before anything opens OPFS.
  const handleRevokeAndRetry = useCallback(async () => {
    if (typeof window === "undefined") return;
    setShowRevokeOption(false);
    setError("Resetting — reloading to clear local XMTP database…");
    setIsLoading(true);
    window.sessionStorage.setItem("xao-xmtp-reset-pending", "1");
    // Give React a tick to paint the message before we navigate away.
    setTimeout(() => window.location.reload(), 150);
  }, []);

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

  // Expose a dev-friendly global reset. Same flag-and-reload dance as the
  // UI button — OPFS handles can't be released while the WASM client is alive,
  // so we reset on the next page load before anything opens the database.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__xaoResetXMTP = () => {
      console.log("[XMTP] Reset requested — reloading to wipe local database.");
      window.sessionStorage.setItem("xao-xmtp-reset-pending", "1");
      window.location.reload();
    };
    return () => {
      delete (window as any).__xaoResetXMTP;
    };
  }, []);

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
