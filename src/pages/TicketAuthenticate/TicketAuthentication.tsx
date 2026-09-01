import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/ticketAuthenticate.module.css";
import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../wagmi";
import { XAO_TICKET_ABI } from "../../lib/web3/eventcontract";
import { useWeb3 } from "../../hooks/useWeb3";

// Manual counterpart to the camera-based Scan tab: type in the ticket's
// collection address + number and run the same on-chain scanTicket flow (auth
// before doors, redeem at/after doors). Useful when the QR can't be scanned.
export default function TicketAuthentication() {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const [collection, setCollection] = useState("");
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  // Optional camera QR reader that FILLS the fields (it doesn't scan on-chain —
  // the user reviews and taps Authenticate). The QR encodes "collection:tokenId".
  useEffect(() => {
    if (!scanning) return;
    let html5QrCode: any = null;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("auth-reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            const [c, t] = decodedText.split(":");
            if (c) setCollection(c.trim());
            if (t) setTokenIdInput(t.trim());
            setError("");
            setScanning(false); // stop after one successful read
          },
          () => {},
        );
      } catch (err) {
        console.warn("[Authenticate] QR camera failed:", err);
        if (!cancelled) {
          setError("Couldn't open the camera — enter the details manually.");
          setScanning(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (html5QrCode) html5QrCode.stop().catch(() => {});
    };
  }, [scanning]);

  const handleAuthenticate = async () => {
    setError("");
    const coll = collection.trim();
    if (!coll.startsWith("0x") || coll.length !== 42) {
      setError("Enter a valid ticket collection address (0x…, 42 characters).");
      return;
    }
    if (!/^\d+$/.test(tokenIdInput.trim())) {
      setError("Enter a valid ticket number (digits only).");
      return;
    }
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }

    const ticketCollectionAddr = coll as `0x${string}`;
    const tokenId = BigInt(tokenIdInput.trim());
    setBusy(true);

    try {
      // Pre-check: already redeemed?
      let isScanned = false;
      try {
        isScanned = (await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: "scanned",
          args: [tokenId],
        })) as boolean;
      } catch {
        setError("Couldn't read this ticket — double-check the collection address and number.");
        setBusy(false);
        return;
      }
      if (isScanned) {
        router.push("/TicketAuthenticate/Access?status=error&reason=already_redeemed");
        return;
      }

      // Tier name for the result screen (non-critical).
      let tierName = "Ticket";
      try {
        const tierId = (await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: "tokenToTier",
          args: [tokenId],
        })) as bigint;
        const tier = (await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: "getTier",
          args: [tierId],
        })) as any;
        const typeEnum = Number(tier.ticketType ?? tier[0] ?? 0);
        const names = ["Comp", "Presale", "General Admission", "VIP", "Custom"];
        tierName = typeEnum === 4 ? tier.customName ?? tier[1] ?? "Custom" : names[typeEnum] || "Ticket";
      } catch {
        /* keep default */
      }

      // Scan on-chain (requires SCANNER_ROLE).
      const txHash = await writeContract(config, {
        address: ticketCollectionAddr,
        abi: XAO_TICKET_ABI as any,
        functionName: "scanTicket",
        args: [tokenId],
        gas: BigInt(200_000),
      });
      await waitForTransactionReceipt(config, { hash: txHash });

      // Redeemed (scanned at/after doors) vs authenticated (before doors)?
      let wasRedeemed = false;
      try {
        wasRedeemed = (await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: "scanned",
          args: [tokenId],
        })) as boolean;
      } catch {
        /* treat as authenticated */
      }
      const mode = wasRedeemed ? "redeemed" : "authenticated";
      router.push(
        `/TicketAuthenticate/Access?status=success&mode=${mode}&ticketId=${tokenId.toString()}&ticketType=${encodeURIComponent(tierName)}`,
      );
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("SCANNER_ROLE") || msg.includes("AccessControl")) {
        router.push("/TicketAuthenticate/Access?status=error&reason=not_organizer");
      } else if (msg.includes("Already redeemed")) {
        router.push("/TicketAuthenticate/Access?status=error&reason=already_redeemed");
      } else {
        setError("Authentication failed. " + (msg ? String(msg).slice(0, 120) : "Please try again."));
        setBusy(false);
      }
    }
  };

  return (
    <div className={styles.authenticateContainer}>
      <div className={styles.authenticateContent}>
        <h2 className={styles.authenticateTitle}>Authenticate Ticket</h2>
        <p className={styles.authenticateDescription}>
          Scan the QR to fill the fields, or enter the ticket details manually, then check in.
        </p>

        {/* Scan-to-fill: reads a QR into the fields; the on-chain check-in still
            happens on the Authenticate button below. */}
        <button
          type="button"
          className={styles.authenticateButton}
          onClick={() => setScanning((s) => !s)}
          style={{ marginBottom: 14 }}
        >
          {scanning ? "Stop camera" : "Scan QR to fill"}
        </button>
        {scanning && (
          <div className={styles.scannerFrame}>
            <div id="auth-reader" className={styles.qrReaderContainer}></div>
            <div className={`${styles.scannerOverlay} ${styles.neutralCorner}`}>
              <div className={`${styles.cornerTopLeft} ${styles.neutralCorner}`}></div>
              <div className={`${styles.cornerTopRight} ${styles.neutralCorner}`}></div>
              <div className={`${styles.cornerBottomLeft} ${styles.neutralCorner}`}></div>
              <div className={`${styles.cornerBottomRight} ${styles.neutralCorner}`}></div>
            </div>
          </div>
        )}

        <div className={styles.authenticateForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ticket Collection Address</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="0x…"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ticket Number</label>
            <input
              type="text"
              inputMode="numeric"
              className={styles.formInput}
              placeholder="e.g. 0"
              value={tokenIdInput}
              onChange={(e) => setTokenIdInput(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: "#ff5f6d", fontSize: 13, margin: "4px 0 0" }}>{error}</p>
          )}

          <button
            className={styles.authenticateButton}
            onClick={handleAuthenticate}
            disabled={busy}
            style={busy ? { opacity: 0.6 } : undefined}
          >
            {busy ? "Authenticating…" : "Authenticate Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
