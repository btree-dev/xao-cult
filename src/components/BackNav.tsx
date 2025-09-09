import React from "react";
import { useRouter } from "next/router";
import styles from "./BackNav.module.css";
import Image from "next/image";
interface BackNavbarProps {
  pageTitle?: string;
  showDownload?: boolean;
  onDownload?: () => void;
  pageIcon?: string;
}

const BackNavbar: React.FC<BackNavbarProps> = ({
  pageTitle = "",
  showDownload = false,
  onDownload,
  pageIcon,
}) => {
  const router = useRouter();


  const goBack = () => {
    router.back();
  };

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
            <button
  className={styles.rightnavButton}
  title="Download"
  onClick={onDownload}
  aria-label="Download"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <g transform="scale(0.9) translate(1.4,1.4)">
      {/* Folder shape */}
      <path
        d="M3 7h5l2 2h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />

      {/* Upload arrow */}
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

          )}
        </div>
      </div>
    </nav>
  );
};

export default BackNavbar;
