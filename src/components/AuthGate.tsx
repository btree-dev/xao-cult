import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";

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
  const { status } = useAccount(); // connecting | reconnecting | connected | disconnected
  const isPublic = isPublicPath(router.pathname);

  useEffect(() => {
    if (isPublic) return;
    // Wait for wagmi to settle so a persisted session (reconnecting on refresh)
    // isn't mistaken for logged-out and bounced to login.
    if (status === "connecting" || status === "reconnecting") return;
    if (status === "disconnected") {
      try { sessionStorage.setItem(RETURN_TO_KEY, router.asPath); } catch { /* private mode */ }
      router.replace("/");
    }
  }, [isPublic, status, router]);

  // Public routes always render. On a protected route, render children only once
  // connected — so protected content never flashes before the redirect fires for
  // a logged-out user (and a brief blank shows while wagmi is reconnecting).
  if (isPublic) return <>{children}</>;
  if (status === "connected") return <>{children}</>;
  return null;
}
