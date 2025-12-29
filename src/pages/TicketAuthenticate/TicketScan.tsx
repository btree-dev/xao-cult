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
  const [scanStatus, setScanStatus] = useState<'idle' | 'detected' | 'error'>('idle');

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
            console.log("QR Code length:", decodedText.length);
            console.log("QR Code is empty:", decodedText.trim().length === 0);
            // Set status to detected (green corners) for ANY QR code (including empty ones)
            setScanStatus('detected');
            // Store the data even if it's empty - we'll validate on redeem
            setScannedData(decodedText);
          },
          (errorMessage: string) => {
            // QR code not detected - this fires continuously when no QR is in view
            // We don't need to do anything here as we only want to show
            // detected state when a code is actually scanned
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
  }, []); 

  const handleAuthenticate = async () => {
    if (!scannedData) return;

    setIsAuthenticating(true);

    // Simulate authentication delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      console.log("Validating scanned data:", scannedData);

      // Check if it's a valid URL
      let url: URL;
      try {
        // Try to parse as URL directly
        if (/^https?:\/\//i.test(scannedData)) {
          url = new URL(scannedData);
        } else if (/^www\./i.test(scannedData)) {
          url = new URL('https://' + scannedData);
        } else {
          // Not a valid URL format
          console.log("Not a valid URL - showing error");
          setScanStatus('error');
          router.push("/TicketAuthenticate/Access?status=error");
          setIsAuthenticating(false);
          return;
        }
      } catch (urlError) {
        console.log("Invalid URL format - showing error");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error");
        setIsAuthenticating(false);
        return;
      }

      // Check if URL points to a PDF or image file
      const pathname = url.pathname.toLowerCase();
      console.log("URL pathname:", pathname);
      const fileExtensions = /\.(pdf|jpg|jpeg|png|gif|bmp|svg|webp|ico)$/i;
      const isFileUrl = fileExtensions.test(pathname);
      console.log("Is PDF/Image file?", isFileUrl);

      if (isFileUrl) {
        console.log("URL points to PDF or image file - showing error");
        setScanStatus('error');
        router.push("/TicketAuthenticate/Access?status=error");
        setIsAuthenticating(false);
        return;
      }

      // Valid website URL - proceed to success
      console.log("Valid website URL - showing success");
      if (onScanSuccess) {
        onScanSuccess(scannedData);
      }
      router.push("/TicketAuthenticate/Access?status=success");

    } catch (error) {
      // Unexpected error
      console.error("Validation failed:", error);
      setScanStatus('error');
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
