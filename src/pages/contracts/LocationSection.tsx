import React from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

const radiusDistanceOptions = Array.from({ length: 20 }, (_, i) => `${(i + 1) * 10} miles`);
const daysOptions = Array.from({ length: 10 }, (_, i) => `${(i + 1) * 10}`);

export interface LocationProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  venueName: string;
  setVenueName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  radiusDistance: string;
  setRadiusDistance: (v: string) => void;
  days: string;
  setDays: (v: string) => void;
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
  radiusDistance,
  setRadiusDistance,
  days,
  setDays,
}) => (
  <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      {isOpen ? (
        <div className={styles.infoLabelRow}>
          <label className={`${styles.centeredLabel} ${styles.open}`}>Location</label>
          <Image
            src="/contracts-Icons/Info.svg"
            alt="Info"
            width={20}
            height={20}
            className={styles.infoIcon}
          />
        </div>
      ) : (
        <>
          <label className={`${styles.label} ${styles.open}`}>Location</label>
          <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
        </>
      )}
    </div>
    {isOpen && (
      <>
        <div className={styles.ticketInputWrapper}>
          <label className={styles.ticketsLabel}>Venue Name</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Building_01.svg" alt="Building" width={24} height={24} />
            </button>
            <input type="text" onChange={e => setVenueName(e.target.value)} value={venueName} placeholder="Venue Name" className={styles.input} required />

          </div>
        </div>
        <div className={styles.ticketInputWrapper}>
          <label className={styles.ticketsLabel}>Address</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Map_Pin.svg" alt="Map Pin" width={24} height={24} />
            </button>
            <input type="text" onChange={e => setAddress(e.target.value)} value={address} placeholder="Address" className={styles.input} required />

          </div>
        </div>
        <div className={styles.ticketInputWrapper}>
          <div className={styles.contractRow}>
            <label className={styles.ticketsLabel}>Radius Clause Distance</label>
            <label className={styles.ticketsLabel}>Days</label>
          </div>
          <div className={styles.contractRow}>
            <div className={styles.inputRow} style={{ position: "relative", cursor: "pointer", flex: 1 }} onClick={() => setActiveDropdown(activeDropdown === "radiusDistance" ? null : "radiusDistance")}>
              <Image src="/contracts-Icons/Compass.svg" alt="Map Pin" width={24} height={24} style={{ marginLeft: "8px" }} />
              <input
                type="text"
                className={styles.input}
                placeholder="50 Miles"
                value={radiusDistance}
                readOnly
                style={{ cursor: "pointer", border: "none", background: "transparent", color: "white", flex: 1 }}
              />
              <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ marginRight: "8px" }} />
              {activeDropdown === "radiusDistance" && (
                <div
                  className={styles.dropdownMenu}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {radiusDistanceOptions.map(option => (
                    <div
                      key={option}
                      className={styles.dropdownOption}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRadiusDistance(option);
                        setActiveDropdown(null);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.inputRow} style={{ position: "relative", cursor: "pointer", flex: 1 }} onClick={() => setActiveDropdown(activeDropdown === "days" ? null : "days")}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} style={{ marginLeft: "8px" }} />
              <input
                type="text"
                className={styles.input}
                placeholder="90"
                value={days}
                readOnly
                style={{ cursor: "pointer", border: "none", background: "transparent", color: "white", flex: 1 }}
              />
              <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ marginRight: "8px" }} />
              {activeDropdown === "days" && (
                <div
                  className={styles.dropdownMenu}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {daysOptions.map(option => (
                    <div
                      key={option}
                      className={styles.dropdownOption}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDays(option);
                        setActiveDropdown(null);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )}
  </div>
);

export default LocationSection;