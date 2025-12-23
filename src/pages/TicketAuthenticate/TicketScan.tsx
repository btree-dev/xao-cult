import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/ticketAuthenticate.module.css";

interface TicketScanProps {
  onScanSuccess?: (decodedText: string) => void;
}

export default function TicketScan({ onScanSuccess }: TicketScanProps) {
  const router = useRouter();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Initialize QR code scanner
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMounted) return; // Don't start if component already unmounted

        html5QrCode = new Html5Qrcode("reader");

        // Start scanning with camera
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            console.log("QR Code detected:", decodedText);
            // Set detecting to true (green corners) and store the scanned data
            setIsDetecting(true);
            setScannedData(decodedText);
          },
          (errorMessage: string) => {
            // QR code not detected, keep red corners
            setIsDetecting(false);
          }
        );

      } catch (error) {
        console.error("Error starting scanner:", error);
      }
    };

    startScanner();

    // Cleanup: Stop camera when component unmounts (user switches tabs)
    return () => {
      isMounted = false;
      if (html5QrCode) {
        html5QrCode.stop()
          .then(() => {
            console.log("Camera stopped successfully");
            html5QrCode.clear();
          })
          .catch((err: any) => console.error("Error stopping scanner:", err));
      }
    };
  }, []); // Empty dependency array - runs once on mount, cleans up on unmount

  const handleAuthenticate = async () => {
    if (!scannedData) return;

    setIsAuthenticating(true);

    // Simulate authentication API call - in production, validate against your backend
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if the scanned data contains a valid URL/link
    const urlPattern = /^(https?:\/\/|www\.)/i;
    const isValidTicket = urlPattern.test(scannedData);

    if (isValidTicket) {
      if (onScanSuccess) {
        onScanSuccess(scannedData);
      }
      // Redirect to Access page with success status
      router.push("/TicketAuthenticate/Access?status=success");
    } else {
      // Redirect to Access page with error status
      router.push("/TicketAuthenticate/Access?status=error");
    }

    setIsAuthenticating(false);
  };

  return (
    <div className={styles.scanContainer}>
      <div className={styles.scanContent}>
        <h2 className={styles.scanTitle}>Authenticate Ticket</h2>

        <div className={styles.scannerFrame}>
          <div id="reader" className={styles.qrReaderContainer}></div>

          <div className={styles.scannerOverlay}>
            <div className={`${styles.cornerTopLeft} ${!isDetecting ? styles.errorCorner : ''}`}></div>
            <div className={`${styles.cornerTopRight} ${!isDetecting ? styles.errorCorner : ''}`}></div>
            <div className={`${styles.cornerBottomLeft} ${!isDetecting ? styles.errorCorner : ''}`}></div>
            <div className={`${styles.cornerBottomRight} ${!isDetecting ? styles.errorCorner : ''}`}></div>
          </div>
        </div>

        <p className={styles.scanInstruction}>
          {isDetecting ? "QR Code detected! Press Authenticate to verify" : "Align the QR code within the frame to scan"}
        </p>

        <button
          className={styles.authenticateButton}
          onClick={handleAuthenticate}
          disabled={isAuthenticating || !scannedData}
        >
          {isAuthenticating ? "Authenticating..." : "Authenticate"}
        </button>
      </div>
    </div>
  );
}
