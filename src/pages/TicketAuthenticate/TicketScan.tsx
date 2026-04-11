import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/ticketAuthenticate.module.css";
import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../wagmi";
import { XAO_TICKET_ABI } from "../../lib/web3/eventcontract";
import { useWeb3 } from "../../hooks/useWeb3";

interface TicketScanProps {
  onScanSuccess?: (decodedText: string) => void;
}

export default function TicketScan({ onScanSuccess }: TicketScanProps) {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'detected' | 'error'>('idle');

  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;
    let lastDetectionTime = 0;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMounted) return;

        html5QrCode = new Html5Qrcode("reader");

        const viewportWidth = window.innerWidth > 530 ? 430 : window.innerWidth;
        const qrboxSize = Math.floor(viewportWidth * 0.8);

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: qrboxSize,
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            console.log("QR Code detected:", decodedText);
            lastDetectionTime = Date.now();
            setScanStatus('detected');
            setScannedData(decodedText);
          },
          (errorMessage: string) => {
            const timeSinceLastDetection = Date.now() - lastDetectionTime;
            if (timeSinceLastDetection > 300) {
              setScanStatus('idle');
            }
          }
        );

      } catch (error) {
        console.error("Error starting scanner:", error);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCode) {
        html5QrCode.stop().catch((err: any) => {
          console.error("Error stopping scanner:", err);
        });
      }
    };
  }, []);

  const handleAuthenticate = async () => {
    if (!scannedData) return;

    setIsAuthenticating(true);

    try {
      console.log("Validating scanned data:", scannedData);

      // QR code format: ticketCollectionAddress:tokenId
      const parts = scannedData.split(':');

      if (parts.length < 2 || !parts[0].startsWith('0x')) {
        console.log("Invalid QR format");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=invalid_format");
        setIsAuthenticating(false);
        return;
      }

      const ticketCollectionAddr = parts[0] as `0x${string}`;
      const tokenId = BigInt(parts[1]);

      if (!isConnected || !address) {
        console.log("Wallet not connected");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=wallet_not_connected");
        setIsAuthenticating(false);
        return;
      }

      // Step 1: Check if ticket is already scanned
      let isScanned: boolean;
      try {
        isScanned = await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: 'scanned',
          args: [tokenId],
        }) as boolean;
      } catch (err) {
        console.error("Failed to read ticket:", err);
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=invalid_contract");
        setIsAuthenticating(false);
        return;
      }

      if (isScanned) {
        console.log("Ticket already redeemed");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=already_redeemed");
        setIsAuthenticating(false);
        return;
      }

      // Step 2: Get tier info for display
      let tierName = 'Ticket';
      try {
        const tierId = await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: 'tokenToTier',
          args: [tokenId],
        }) as bigint;

        const tier = await readContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: 'getTier',
          args: [tierId],
        }) as any;

        const ticketTypeEnum = Number(tier.ticketType ?? tier[0] ?? 0);
        const customName = tier.customName ?? tier[1] ?? '';
        const typeNames = ['Comp', 'Presale', 'General Admission', 'VIP', 'Custom'];
        tierName = ticketTypeEnum === 4 ? customName : (typeNames[ticketTypeEnum] || `Tier ${Number(tierId)}`);
      } catch {
        // Non-critical — continue with default name
      }

      console.log(`Scanning ticket #${tokenId}, type: ${tierName}`);

      // Step 3: Call scanTicket on XAOTicket (requires SCANNER_ROLE)
      // Before doorsTime → TicketAuthenticated event (auth only, not redeemed)
      // After doorsTime → TicketRedeemed event (marks scanned = true)
      try {
        const txHash = await writeContract(config, {
          address: ticketCollectionAddr,
          abi: XAO_TICKET_ABI as any,
          functionName: 'scanTicket',
          args: [tokenId],
          gas: BigInt(200_000),
        });

        await waitForTransactionReceipt(config, { hash: txHash });

        console.log("Scan successful! Tx:", txHash);

        if (onScanSuccess) {
          onScanSuccess(scannedData);
        }

        router.push(`/TicketAuthenticate/Access?status=success&ticketId=${tokenId.toString()}&ticketType=${encodeURIComponent(tierName)}`);
      } catch (scanErr: any) {
        console.error("Scan transaction failed:", scanErr);

        const errMsg = scanErr?.message || '';
        if (errMsg.includes('SCANNER_ROLE') || errMsg.includes('AccessControl')) {
          router.push("/TicketAuthenticate/Access?status=error&reason=not_organizer");
        } else if (errMsg.includes('Already redeemed')) {
          router.push("/TicketAuthenticate/Access?status=error&reason=already_redeemed");
        } else {
          router.push("/TicketAuthenticate/Access?status=error&reason=checkin_failed");
        }
        setScanStatus('error');
        setIsAuthenticating(false);
        return;
      }

    } catch (error) {
      console.error("Validation failed:", error);
      setScanStatus('error');
      router.push("/TicketAuthenticate/Access?status=error&reason=unknown");
    }

    setIsAuthenticating(false);
  };

  return (
    <div className={styles.scanContainer}>
      <div className={styles.scanContent}>
        <h2 className={styles.scanTitle}>Authenticate Ticket</h2>

        <div className={styles.scannerFrame}>
          <div id="reader" className={styles.qrReaderContainer}></div>

          <div className={`${styles.scannerOverlay} ${scanStatus === 'detected' ? styles.successCorner : scanStatus === 'error' ? styles.errorCorner : styles.neutralCorner}`}>
            <div className={`${styles.cornerTopLeft} ${scanStatus === 'detected' ? styles.successCorner : scanStatus === 'error' ? styles.errorCorner : styles.neutralCorner}`}></div>
            <div className={`${styles.cornerTopRight} ${scanStatus === 'detected' ? styles.successCorner : scanStatus === 'error' ? styles.errorCorner : styles.neutralCorner}`}></div>
            <div className={`${styles.cornerBottomLeft} ${scanStatus === 'detected' ? styles.successCorner : scanStatus === 'error' ? styles.errorCorner : styles.neutralCorner}`}></div>
            <div className={`${styles.cornerBottomRight} ${scanStatus === 'detected' ? styles.successCorner : scanStatus === 'error' ? styles.errorCorner : styles.neutralCorner}`}></div>
          </div>
        </div>

        <p className={styles.scanInstruction}>
          {scanStatus === 'detected' ? "QR Code detected! Press Redeem to verify" : "Align the QR code within the frame to scan"}
        </p>

        <button
          className={styles.authenticateButton}
          onClick={handleAuthenticate}
          disabled={isAuthenticating || !scannedData}
        >
          {isAuthenticating ? "Redeeming..." : "Redeem"}
        </button>
      </div>
    </div>
  );
}
