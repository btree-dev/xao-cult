import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/ticketAuthenticate.module.css";
import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../wagmi";
import { EVENT_CONTRACT_ABI } from "../../lib/web3/eventcontract";
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

        // Calculate qrbox based on 430px for desktop (when viewport > 530) or actual viewport for mobile
        const viewportWidth = window.innerWidth > 530 ? 430 : window.innerWidth;
        const qrboxSize = Math.floor(viewportWidth * 0.8); // 80% of viewport width, no max limit

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: qrboxSize,
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            console.log("QR Code detected:", decodedText);
            console.log("QR Code length:", decodedText.length);
            console.log("QR Code is empty:", decodedText.trim().length === 0);

            lastDetectionTime = Date.now();
            setScanStatus('detected');
            // Store the data even if it's empty - we'll validate on redeem
            setScannedData(decodedText);
          },
          (errorMessage: string) => {
            // QR Code not detected - reset to idle after a short delay
            const timeSinceLastDetection = Date.now() - lastDetectionTime;
            if (timeSinceLastDetection > 300) { // 300ms threshold
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

      // Parse QR code format: contractAddress:txHash or contractAddress:contractAddress
      const parts = scannedData.split(':');

      // Validate format — must have two parts, first must be a 0x address
      if (parts.length < 2 || !parts[0].startsWith('0x')) {
        console.log("Invalid QR format — not a blockchain ticket");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=invalid_format");
        setIsAuthenticating(false);
        return;
      }

      const contractAddress = parts[0] as `0x${string}`;

      // Check wallet connection
      if (!isConnected || !address) {
        console.log("Wallet not connected");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=wallet_not_connected");
        setIsAuthenticating(false);
        return;
      }

      // Step 1: Get all ticket IDs for the scanned ticket's owner
      // We read totalIssued to know how many tickets exist
      let totalIssued: bigint;
      try {
        totalIssued = await readContract(config, {
          address: contractAddress,
          abi: EVENT_CONTRACT_ABI,
          functionName: 'totalIssued',
        }) as bigint;
      } catch (err) {
        console.error("Failed to read contract:", err);
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=invalid_contract");
        setIsAuthenticating(false);
        return;
      }

      if (totalIssued === BigInt(0)) {
        console.log("No tickets issued on this contract");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=no_tickets");
        setIsAuthenticating(false);
        return;
      }

      // Step 2: Find an unchecked ticket by scanning through registry
      // Look for a ticket that hasn't been checked in yet
      let foundTicketId: bigint | null = null;
      let ticketOwner: string = '';
      let ticketName: string = '';

      for (let i = BigInt(0); i < totalIssued; i++) {
        try {
          const info = await readContract(config, {
            address: contractAddress,
            abi: EVENT_CONTRACT_ABI,
            functionName: 'getTicketInfo',
            args: [i],
          }) as [bigint, string, string, boolean, bigint, bigint];

          const [, owner, name, checkedIn] = info;

          // Find first unchecked ticket (any owner — organizer is scanning)
          if (!checkedIn && owner !== '0x0000000000000000000000000000000000000000') {
            foundTicketId = i;
            ticketOwner = owner;
            ticketName = name;
            break;
          }
        } catch (err) {
          console.error(`Error reading ticket ${i}:`, err);
          continue;
        }
      }

      if (foundTicketId === null) {
        console.log("No valid unchecked tickets found");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error&reason=already_redeemed");
        setIsAuthenticating(false);
        return;
      }

      console.log(`Found valid ticket #${foundTicketId} owned by ${ticketOwner}, type: ${ticketName}`);

      // Step 3: Call checkInTicket on-chain (requires organizer wallet)
      try {
        const txHash = await writeContract(config, {
          address: contractAddress,
          abi: EVENT_CONTRACT_ABI,
          functionName: 'checkInTicket',
          args: [foundTicketId],
        });

        // Wait for transaction confirmation
        await waitForTransactionReceipt(config, { hash: txHash });

        console.log("Check-in successful! Tx:", txHash);

        // Mark ticket as redeemed in localStorage
        try {
          const stored = localStorage.getItem('purchasedTickets');
          if (stored) {
            const purchasedTickets = JSON.parse(stored);
            const updated = purchasedTickets.map((t: any) => {
              if (t.contractAddress?.toLowerCase() === contractAddress.toLowerCase()) {
                return { ...t, redeemed: true };
              }
              return t;
            });
            localStorage.setItem('purchasedTickets', JSON.stringify(updated));
          }
        } catch (e) {
          console.error('Error updating redeemed status in localStorage:', e);
        }

        if (onScanSuccess) {
          onScanSuccess(scannedData);
        }

        router.push(`/TicketAuthenticate/Access?status=success&ticketId=${foundTicketId.toString()}&ticketType=${encodeURIComponent(ticketName)}&owner=${ticketOwner}`);
      } catch (checkInErr: any) {
        console.error("Check-in transaction failed:", checkInErr);

        // Determine the reason for failure
        const errMsg = checkInErr?.message || '';
        if (errMsg.includes('onlyOrg') || errMsg.includes('execution reverted')) {
          router.push("/TicketAuthenticate/Access?status=error&reason=not_organizer");
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

          {/* Corner overlays */}
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
