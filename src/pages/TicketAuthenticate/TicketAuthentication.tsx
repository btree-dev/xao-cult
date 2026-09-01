import { useState } from "react";
import styles from "../../styles/ticketAuthenticate.module.css";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { XAO_TICKET_ABI } from "../../lib/web3/eventcontract";
import TicketScan from "./TicketScan";

// Standalone read-only client over the public RPC — deliberately NOT the wagmi
// wallet config, so verifying a ticket never touches MetaMask (no connect /
// chain-switch prompt). Anyone can check a ticket, connected or not.
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

// READ-ONLY ticket check — anyone can verify a ticket here (no SCANNER_ROLE, no
// wallet needed): it only READS the chain to report whether the ticket exists,
// which tier it is, and whether it's been redeemed. Actually checking someone in
// (the on-chain scan/redeem) is the Scan tab, which needs SCANNER_ROLE.
interface CheckResult {
  ok: boolean;        // ticket exists
  redeemed: boolean;  // already scanned/redeemed
  tier: string;
  message: string;
}

export default function TicketAuthentication() {
  const [collection, setCollection] = useState("");
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  // Reuse the Scan tab's scanner (fill-only) — a decoded QR ("collection:tokenId")
  // fills the fields; the check below is read-only.
  const handleFill = (code: string) => {
    const [c, t] = code.split(":");
    if (c) setCollection(c.trim());
    if (t) setTokenIdInput(t.trim());
    setError("");
    setResult(null);
    setScanning(false);
  };

  const handleCheck = async () => {
    setError("");
    setResult(null);
    const coll = collection.trim();
    if (!coll.startsWith("0x") || coll.length !== 42) {
      setError("Enter a valid ticket collection address (0x…, 42 characters).");
      return;
    }
    if (!/^\d+$/.test(tokenIdInput.trim())) {
      setError("Enter a valid ticket number (digits only).");
      return;
    }

    const ticketCollectionAddr = coll as `0x${string}`;
    const tokenId = BigInt(tokenIdInput.trim());
    setBusy(true);

    try {
      // Does the ticket exist? Tokens mint sequentially 0..totalSold-1.
      const totalSold = (await publicClient.readContract({
        address: ticketCollectionAddr,
        abi: XAO_TICKET_ABI as any,
        functionName: "totalSold",
        args: [],
      })) as bigint;

      if (tokenId >= totalSold) {
        setResult({ ok: false, redeemed: false, tier: "", message: "Ticket not found — this number hasn't been sold on this collection." });
        return;
      }

      const scanned = (await publicClient.readContract({
        address: ticketCollectionAddr,
        abi: XAO_TICKET_ABI as any,
        functionName: "scanned",
        args: [tokenId],
      })) as boolean;

      // Tier name (non-critical).
      let tier = "Ticket";
      try {
        const tierId = (await publicClient.readContract({
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: "tokenToTier",
          args: [tokenId],
        })) as bigint;
        const t = (await publicClient.readContract({
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: "getTier",
          args: [tierId],
        })) as any;
        const typeEnum = Number(t.ticketType ?? t[0] ?? 0);
        const names = ["Comp", "Presale", "General Admission", "VIP", "Custom"];
        tier = typeEnum === 4 ? t.customName ?? t[1] ?? "Custom" : names[typeEnum] || "Ticket";
      } catch {
        /* keep default */
      }

      setResult({
        ok: true,
        redeemed: scanned,
        tier,
        message: scanned ? "Already redeemed — this ticket has been checked in." : "Valid ticket — not yet redeemed.",
      });
    } catch (err) {
      console.warn("[Authenticate] check failed:", err);
      setError("Couldn't check this ticket — double-check the collection address and number.");
    } finally {
      setBusy(false);
    }
  };

  const resultColor = result ? (!result.ok ? "#ff5f6d" : result.redeemed ? "#C4791A" : "#35C08A") : undefined;

  return (
    <div className={styles.authenticateContainer}>
      <div className={styles.authenticateContent}>
        <h2 className={styles.authenticateTitle}>Check Ticket</h2>
        <p className={styles.authenticateDescription}>
          Anyone can verify a ticket here — no permission needed. Scan or enter the details to see if
          it&apos;s valid and whether it&apos;s been redeemed. (Checking someone in is done from the Scan tab.)
        </p>

        {/* Scan-to-fill: reuses the Scan tab's exact scanner UI. */}
        <button
          type="button"
          className={styles.authenticateButton}
          onClick={() => setScanning((s) => !s)}
          style={{ marginBottom: 14 }}
        >
          {scanning ? "Stop camera" : "Scan QR to fill"}
        </button>
        {scanning && <TicketScan fillOnly onScanSuccess={handleFill} />}

        <div className={styles.authenticateForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ticket Collection Address</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="0x…"
              value={collection}
              onChange={(e) => { setCollection(e.target.value); setResult(null); }}
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
              onChange={(e) => { setTokenIdInput(e.target.value); setResult(null); }}
            />
          </div>

          {error && <p style={{ color: "#ff5f6d", fontSize: 13, margin: "4px 0 0" }}>{error}</p>}

          {result && (
            <div
              style={{
                margin: "6px 0 0",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${resultColor}`,
                color: resultColor,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <strong>
                {!result.ok ? "✗ Invalid" : result.redeemed ? "⚠ Redeemed" : "✓ Valid"}
                {result.ok && result.tier ? ` · ${result.tier}` : ""}
              </strong>
              <div style={{ opacity: 0.9, marginTop: 2 }}>{result.message}</div>
            </div>
          )}

          <button
            className={styles.authenticateButton}
            onClick={handleCheck}
            disabled={busy}
            style={busy ? { opacity: 0.6 } : undefined}
          >
            {busy ? "Checking…" : "Check Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
