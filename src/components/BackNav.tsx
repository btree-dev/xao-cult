import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "./BackNav.module.css";
import Image from "next/image";
import { InfotipContent } from "../backend/tax-services/InfotipContent";
interface BackNavbarProps {
  pageTitle?: string;
  showDownload?: boolean;
  pageIcon?: string;
  showRectangleRight?: boolean;
}

const BackNavbar: React.FC<BackNavbarProps> = ({
  pageTitle = "",
  showDownload = false,
  pageIcon,
  showRectangleRight = false,
}) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const goBack = () => {
    router.back();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          id: file.name + Date.now(),
          name: file.name.replace(/\.pdf$/i, ""),
          fileName: file.name,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          uploadDate: new Date().toLocaleDateString(),
          dataUrl: reader.result as string,
        };
        // Save to localStorage
        const stored = JSON.parse(localStorage.getItem("taxDocs") || "[]");
        stored.push(fileData);
        localStorage.setItem("taxDocs", JSON.stringify(stored));
        window.dispatchEvent(new Event("files-updated"));
      };
      reader.readAsDataURL(file);
    });
    alert("Files stored locally!");
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInfo]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <div className={styles.navSection}>
          <button
            className={styles.navButton}
            title="Back"
            onClick={goBack}
            aria-label="Go back"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 12H5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 19L5 12L12 5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Center Section */}
        <div className={styles.centerSection}>
          {pageIcon && (
            <Image
              src={pageIcon}
              alt="Page Icon"
              width={40}
              height={40}
              className={styles.pageIcon}
            />
          )}
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
        </div>

      
        <div className={styles.navSection}>
          {showDownload && (
            <div className={styles.infoWrapper} ref={infoRef}>
           
              <button
                className={styles.rightnavButton}
                title="Info"
                onClick={() => setShowInfo((prev) => !prev)}
                aria-label="Info"
              >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="12"
                      y1="5"
                      x2="12"
                      y2="19"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

              </button>

         
              {showInfo && (
                <div className={styles.tooltipBox}>
                <h4>{InfotipContent.title}</h4>
                <ol>
                  {InfotipContent.steps.map((step, index) => (
                    <li key={index}>
                      <strong>{step.heading}</strong>
                      <br />
                      {step.description}
                    </li>
                  ))}
                </ol>
              </div>
              )}
            </div>
          )}

          {showDownload && (
            <>
             
              <button
                className={styles.rightnavButton}
                title="Select PDF"
                onClick={triggerFileInput}
                aria-label="Select PDF"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <g transform="scale(0.9) translate(1.4,1.4)">
                    <path
                      d="M3 7h5l2 2h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="12"
                      y1="16"
                      x2="12"
                      y2="10"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="9 13 12 10 15 13"
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              </button>

             
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelect}
                multiple
              />
            </>
          )}
          {showRectangleRight && (
          <Image
            src="/contracts-Icons/Rectangle 428.svg"
            alt="Rectangle 428"
            width={40}
            height={40}
            className={styles.pageIcon}
            style={{ marginLeft: "12px" }}
          />
        )}
        </div>
      </div>
    </nav>
  );
};

export default BackNavbar;
