import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import {
  deriveSessionKeypair,
  loadSession,
  saveSession,
  clearSession,
  verifySessionCert,
  type PersistedSession,
} from '../lib/xaomsg/session';

export interface UseXaoMsgSessionResult {
  session: PersistedSession | null;
  isUnlocking: boolean;
  error: string | null;
  unlock: () => Promise<void>;
  /** True once wagmi's wallet client has hydrated for the connected account.
   *  `useWalletClient()` resolves asynchronously — `address`/`chainId` can be
   *  populated a render or two before this flips true, so callers that need
   *  to know unlock() will actually attempt a signature (rather than silently
   *  no-op on a not-yet-ready client) should gate on this instead of just
   *  `address`. */
  isWalletReady: boolean;
  /** 0 = not unlocking; 1/2 = which of the two wallet signatures unlock() is
   *  currently waiting on, so callers can tell the user which prompt to
   *  expect ("signature 1 of 2" / "2 of 2") instead of a single opaque
   *  "signing…" state. */
  signStep: 0 | 1 | 2;
}

export function useXaoMsgSession(): UseXaoMsgSessionResult {
  const { address } = useAccount();
  // Called only to preserve a re-render when the connected chain changes,
  // matching this hook's prior behavior — its return value is discarded and
  // is not otherwise used by this file (chainId is no longer part of the
  // signed session-derivation or cert messages; chat identity is
  // chain-independent).
  useChainId();
  const { data: walletClient } = useWalletClient();
  const [session, setSession] = useState<PersistedSession | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signStep, setSignStep] = useState<0 | 1 | 2>(0);

  // Restore from localStorage on mount/wallet change, but only trust it once
  // it re-verifies under the current (deterministic) cert format — a cached
  // entry from before this change, or otherwise corrupted, must not be used
  // silently. An invalid cached session is cleared outright so the rest of
  // the app's existing "no session yet" path (prompt unlock()) handles it,
  // rather than adding a second not-quite-ready state.
  useEffect(() => {
    if (!address) {
      setSession(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = loadSession(address);
      const stillValid =
        !!cached &&
        cached.cert?.walletAddress?.toLowerCase?.() === address.toLowerCase() &&
        (await verifySessionCert(cached.cert));
      if (cancelled) return;
      if (stillValid) {
        setSession(cached);
      } else {
        if (cached) clearSession(address);
        setSession(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const unlock = useCallback(async () => {
    if (!walletClient || !address) return;
    setIsUnlocking(true);
    setError(null);
    let signaturesRequested = 0;
    try {
      const { privateKey, cert } = await deriveSessionKeypair(address, async (message) => {
        signaturesRequested += 1;
        setSignStep(signaturesRequested === 1 ? 1 : 2);
        return walletClient.signMessage({ account: address, message });
      });
      if (!(await verifySessionCert(cert))) {
        setError(
          "This wallet type isn't compatible with XaoMsg chat (signature couldn't be verified).",
        );
        return;
      }
      const persisted: PersistedSession = { cert, privateKeyHex: privateKey };
      saveSession(address, persisted);
      setSession(persisted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUnlocking(false);
      setSignStep(0);
    }
  }, [walletClient, address]);

  return { session, isUnlocking, error, unlock, isWalletReady: !!walletClient, signStep };
}
