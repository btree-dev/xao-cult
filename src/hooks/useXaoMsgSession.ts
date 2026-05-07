import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import {
  createSessionKeypair,
  loadSession,
  mintSessionCert,
  saveSession,
  SESSION_DURATION_MS,
  type PersistedSession,
} from '../lib/xaomsg/session';

export interface UseXaoMsgSessionResult {
  session: PersistedSession | null;
  isUnlocking: boolean;
  error: string | null;
  unlock: () => Promise<void>;
}

export function useXaoMsgSession(): UseXaoMsgSessionResult {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [session, setSession] = useState<PersistedSession | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore from sessionStorage on mount/wallet change.
  useEffect(() => {
    if (!address) {
      setSession(null);
      return;
    }
    setSession(loadSession(address));
  }, [address]);

  const unlock = useCallback(async () => {
    if (!walletClient || !address || !chainId) return;
    setIsUnlocking(true);
    setError(null);
    try {
      const { privateKey, publicKey } = await createSessionKeypair();
      const expiresAtUnixMs = Date.now() + SESSION_DURATION_MS;
      const cert = await mintSessionCert({
        walletAddress: address,
        sessionPublicKeyHex: publicKey,
        expiresAtUnixMs,
        chainId,
        signMessage: async (message) => walletClient.signMessage({ account: address, message }),
      });
      const persisted: PersistedSession = { cert, privateKeyHex: privateKey };
      saveSession(address, persisted);
      setSession(persisted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUnlocking(false);
    }
  }, [walletClient, address, chainId]);

  return { session, isUnlocking, error, unlock };
}
