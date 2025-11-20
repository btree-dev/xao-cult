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
  loadInInputRef: React.RefObject<HTMLInputElement | null>;
  doorsInputRef: React.RefObject<HTMLInputElement | null>;
  setTimeInputRef: React.RefObject<HTMLInputElement | null>;
  setLengthInputRef: React.RefObject<HTMLInputElement | null>;
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
  loadInInputRef,
  doorsInputRef,
  setTimeInputRef,
  setLengthInputRef,
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
        <div className={styles.ticketInputWrapper}>
          <label className={styles.ticketsLabel}>Event Anouncement Date</label>
            <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => dateInputRef.current?.showPicker?.()}>
                <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
            </button>
            <input type="date" placeholder="Event Announcement" ref={dateInputRef} onClick={() => dateInputRef.current?.showPicker?.()} className={styles.input} required />
            </div>
        </div>
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Show Date</label>
            <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => showDateInputRef.current?.showPicker?.()}>
                <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
            </button>
            <input type="date" placeholder="Show Date" ref={showDateInputRef} onClick={() => showDateInputRef.current?.showPicker?.()} className={styles.input} required />
            </div>
        </div>
        <div className={styles.contractRow}>
          <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Load In</label>  
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => loadInInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={loadInInputRef} placeholder="Load In" value={loadIn} onChange={e => setLoadIn(e.target.value)} className={styles.input} required />
            
          </div>
          </div>

          <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Doors</label>  
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => doorsInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={doorsInputRef} placeholder="Doors" value={doors} onChange={e => setDoors(e.target.value)} className={styles.input} required />
            
          </div>
          </div>
        </div>
        <div className={styles.contractRow}>
        <div className={styles.ticketInputWrapper}>
        <label className={styles.ticketsLabel}>Event Start</label> 
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => startTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={startTimeInputRef} placeholder="Start Time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} required />
          </div>
        </div>  
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Event Ends</label> 
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => endTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" placeholder="End Time" ref={endTimeInputRef} value={endTime} onChange={e => setEndTime(e.target.value)} className={styles.input} required />
            
          </div>
          </div>
        </div>
        <div className={styles.contractRow}>
         <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Set Time</label>    
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => setTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={setTimeInputRef} placeholder="Set Time" value={setTime} onChange={e => setSetTime(e.target.value)} className={styles.input} required />
           
          </div>
        </div>
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Set Length</label> 
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon} onClick={() => setLengthInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={setLengthInputRef} placeholder="Set Length" value={setLength} onChange={e => setSetLength(e.target.value)} className={styles.input} required />
            
          </div>
        </div>
        </div>
      </>
    )}
  </div>
);

export default DatesAndTimesSection;