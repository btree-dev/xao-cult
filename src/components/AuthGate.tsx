import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useWalletReadiness } from "../hooks/useWalletReadiness";
import WalletNotReady from "./WalletNotReady";
import styles from "../styles/Home.module.css";

// Only the login / connect-wallet landing page is reachable without a connected
// wallet. Everything else — including the ticket Authenticate flow — forces login.
const isPublicPath = (pathname: string): boolean => pathname === "/";

// Where to send the user back after they log in (see unlock-chat.tsx).
export const RETURN_TO_KEY = "xao-return-to";

/**
 * Client-side login gate. A user who lands on any protected route without a
 * connected wallet (e.g. by scanning a profile QR that deep-links to a chat) is
 * redirected to the login page; the intended URL is stashed so login can return
 * them straight to it. This is UX gating, not a security boundary — the app's
 * real data is on-chain / wallet-scoped — but it stops the app being wandered
 * through while logged out, per the client's request.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, sdkHasLoaded } = useDynamicContext();
  const { readiness, walletLabel } = useWalletReadiness();
  const isPublic = isPublicPath(router.pathname);

  useEffect(() => {
    if (isPublic) return;
    // "Logged out" is decided by Dynamic, the same signal the login page uses to
    // send the user onward. Using wagmi's status here caused a redirect loop:
    // Dynamic reports the user authenticated a beat before DynamicWagmiConnector
    // connects wagmi, and wagmi sits at "disconnected" (not "connecting") in that
    // gap — so / pushed to /unlock-chat, this gate bounced back to /, repeat.
    if (!sdkHasLoaded || user) return;
    try { sessionStorage.setItem(RETURN_TO_KEY, router.asPath); } catch { /* private mode */ }
    router.replace("/");
  }, [isPublic, sdkHasLoaded, user, router]);

  // Public routes always render. On a protected route, render children only once
  // the wallet is connected — so protected content never flashes before the
  // redirect fires for a logged-out user. A signed-in user whose wallet hasn't
  // reached wagmi gets a spinner, then an explanation instead of a blank page.
  if (isPublic || readiness === "ready") return <>{children}</>;
  if (readiness === "loading" || readiness === "logged-out") return null;
  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <main className={styles.main}>
        {readiness === "connecting" ? (
          <div className={styles.navSpinner} />
        ) : (
          <WalletNotReady readiness={readiness} walletLabel={walletLabel} />
        )}
      </main>
    </div>
  );
}
