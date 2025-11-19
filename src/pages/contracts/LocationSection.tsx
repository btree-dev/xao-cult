import React from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

export interface LocationProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  venueName: string;
  setVenueName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
}

const LocationSection: React.FC<LocationProps> = ({
  isOpen,
  onToggle,
  activeDropdown,
  setActiveDropdown,
  venueName,
  setVenueName,
  address,
  setAddress,
}) => (
  <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      <label className={`${styles.label} ${isOpen ? styles.open : ''}`}>Location</label>
      {!isOpen && (
        <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
      )}
    </div>
    {isOpen && (
      <>
        <div className={styles.ticketInputWrapper}>
          <label className={styles.ticketsLabel}>Venue Name</label>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Building_01.svg" alt="Building" width={24} height={24} />
            </button>
            <input type="text" onChange={e => setVenueName(e.target.value)} value={venueName} placeholder="Venue Name" className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "venueName" ? null : "venueName")} />
            {activeDropdown === "venueName" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setVenueName(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.ticketInputWrapper}>
          <label className={styles.ticketsLabel}>Address</label>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Map_Pin.svg" alt="Map Pin" width={24} height={24} />
            </button>
            <input type="text" onChange={e => setAddress(e.target.value)} value={address} placeholder="Address" className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "address" ? null : "address")} />
            {activeDropdown === "address" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setAddress(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </div>
);

export default LocationSection;