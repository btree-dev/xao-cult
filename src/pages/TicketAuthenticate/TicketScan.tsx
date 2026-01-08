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


    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      console.log("Validating scanned data:", scannedData);

     
      let url: URL;
      try {
     
        if (/^https?:\/\//i.test(scannedData)) {
          url = new URL(scannedData);
        } else if (/^www\./i.test(scannedData)) {
          url = new URL('https://' + scannedData);
        } else {
       
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

      console.log("Valid website URL - showing success");
      if (onScanSuccess) {
        onScanSuccess(scannedData);
      }
      router.push("/TicketAuthenticate/Access?status=success");

    } catch (error) {

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
