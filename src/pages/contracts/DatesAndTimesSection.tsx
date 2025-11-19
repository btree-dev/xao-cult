import React from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

export interface DatesAndTimesProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  dateInputRef: React.RefObject<HTMLInputElement | null>;
  ticketsSaleDateInputRef: React.RefObject<HTMLInputElement | null>;
  showDateInputRef: React.RefObject<HTMLInputElement | null>;
  startTimeInputRef: React.RefObject<HTMLInputElement | null>;
  endTimeInputRef: React.RefObject<HTMLInputElement | null>;
  loadIn: string;
  setLoadIn: (v: string) => void;
  doors: string;
  setDoors: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  setTime: string;
  setSetTime: (v: string) => void;
  setLength: string;
  setSetLength: (v: string) => void;
}

const DatesAndTimesSection: React.FC<DatesAndTimesProps> = ({
  isOpen,
  onToggle,
  activeDropdown,
  setActiveDropdown,
  dateInputRef,
  ticketsSaleDateInputRef,
  showDateInputRef,
  startTimeInputRef,
  endTimeInputRef,
  loadIn,
  setLoadIn,
  doors,
  setDoors,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  setTime,
  setSetTime,
  setLength,
  setSetLength,
}) => (
  <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      <label className={`${styles.label} ${isOpen ? styles.open : ''}`}>Dates and Time</label>
      {!isOpen && (
        <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
      )}
    </div>
    {isOpen && (
      <>
        <div className={styles.inputRow}>
          <button type="button" className={styles.contracticon} onClick={() => dateInputRef.current?.showPicker?.()}>
            <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
          </button>
          <input type="date" placeholder="Event Announcement" ref={dateInputRef} onClick={() => dateInputRef.current?.showPicker?.()} className={styles.input} required />
        </div>
        <div className={styles.inputRow}>
          <button type="button" className={styles.contracticon} onClick={() => ticketsSaleDateInputRef.current?.showPicker?.()}>
            <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
          </button>
          <input type="date" placeholder="Tickets Go on Sale" ref={ticketsSaleDateInputRef} onClick={() => ticketsSaleDateInputRef.current?.showPicker?.()} className={styles.input} required />
        </div>
        <div className={styles.inputRow}>
          <button type="button" className={styles.contracticon} onClick={() => showDateInputRef.current?.showPicker?.()}>
            <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
          </button>
          <input type="date" placeholder="Show Date" ref={showDateInputRef} onClick={() => showDateInputRef.current?.showPicker?.()} className={styles.input} required />
        </div>
        <div className={styles.contractRow}>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="text" placeholder="Load In" value={loadIn} onChange={e => setLoadIn(e.target.value)} className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "loadIn" ? null : "loadIn")} />
            {activeDropdown === "loadIn" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setLoadIn(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="text" placeholder="Doors" value={doors} onChange={e => setDoors(e.target.value)} className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "doors" ? null : "doors")} />
            {activeDropdown === "doors" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setDoors(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.contractRow}>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => startTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={startTimeInputRef} placeholder="Start Time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "startTime" ? null : "startTime")} />
            {activeDropdown === "startTime" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setStartTime(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => endTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" placeholder="End Time" ref={endTimeInputRef} value={endTime} onChange={e => setEndTime(e.target.value)} className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "endTime" ? null : "endTime")} />
            {activeDropdown === "endTime" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setEndTime(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.contractRow}>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="text" placeholder="Set Time" value={setTime} onChange={e => setSetTime(e.target.value)} className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "setTime" ? null : "setTime")} />
            {activeDropdown === "setTime" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setSetTime(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="text" placeholder="Set Length" value={setLength} onChange={e => setSetLength(e.target.value)} className={styles.input} required />
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setActiveDropdown(activeDropdown === "setLength" ? null : "setLength")} />
            {activeDropdown === "setLength" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div key={option} className={styles.dropdownOption} onClick={() => { setSetLength(option); setActiveDropdown(null); }}>{option}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </div>
);

export default DatesAndTimesSection;