import React from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

const setLengthOptions = Array.from({ length: 24 }, (_, i) => {
  const totalMinutes = (i + 1) * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
    : `${minutes}m`;
});

export interface DatesAndTimesProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  dateInputRef: React.RefObject<HTMLInputElement | null>;
  ticketsSaleDateInputRef: React.RefObject<HTMLInputElement | null>;
  showDateInputRef: React.RefObject<HTMLInputElement | null>;
  eventEndDateInputRef: React.RefObject<HTMLInputElement | null>;
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
  // Date values
  eventAnnouncementDate: string;
  setEventAnnouncementDate: (v: string) => void;
  eventStartDate: string;
  setEventStartDate: (v: string) => void;
  eventEndDate: string;
  setEventEndDate: (v: string) => void;
}

const DatesAndTimesSection: React.FC<DatesAndTimesProps> = ({
  isOpen,
  onToggle,
  activeDropdown,
  setActiveDropdown,
  dateInputRef,
  ticketsSaleDateInputRef,
  showDateInputRef,
  eventEndDateInputRef,
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
  eventAnnouncementDate,
  setEventAnnouncementDate,
  eventStartDate,
  setEventStartDate,
  eventEndDate,
  setEventEndDate,
}) => (
  <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      {isOpen ? (
        <div className={styles.infoLabelRow}>
          <label className={`${styles.centeredLabel} ${styles.open}`}>Dates & Time</label>
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
          <label className={`${styles.label} ${styles.open}`}>Dates & Time</label>
          <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
        </>
      )}
    </div>
    {isOpen && (
      <>
        <div className={styles.ticketInputWrapper}>
          <label className={styles.ticketsLabel}>Event Announcement Date</label>
            <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => dateInputRef.current?.showPicker?.()}>
                <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
            </button>
            <input type="datetime-local" placeholder="Event Announcement" ref={dateInputRef} value={eventAnnouncementDate} onChange={e => setEventAnnouncementDate(e.target.value)} onClick={() => dateInputRef.current?.showPicker?.()} className={styles.input} required />
            </div>
        </div>
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Event Start Date</label>
            <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => showDateInputRef.current?.showPicker?.()}>
                <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
            </button>
            <input type="datetime-local" placeholder="Event Start Date" ref={showDateInputRef} value={eventStartDate} onChange={e => setEventStartDate(e.target.value)} onClick={() => showDateInputRef.current?.showPicker?.()} className={styles.input} required />
            </div>
        </div>
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Event End Date</label>
            <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => eventEndDateInputRef.current?.showPicker?.()}>
                <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
            </button>
            <input type="datetime-local" placeholder="Event End Date" ref={eventEndDateInputRef} value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} onClick={() => eventEndDateInputRef.current?.showPicker?.()} className={styles.input} required />
            </div>
        </div>
        <div className={styles.contractRow}>
          <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Load In</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => loadInInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={loadInInputRef} placeholder="Load In" value={loadIn} onChange={e => setLoadIn(e.target.value)} className={styles.input} step="60" required />

          </div>
          </div>

          <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Doors</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => doorsInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={doorsInputRef} placeholder="Doors" value={doors} onChange={e => setDoors(e.target.value)} className={styles.input} step="60" required />

          </div>
          </div>
        </div>
        <div className={styles.contractRow}>
        <div className={styles.ticketInputWrapper}>
        <label className={styles.ticketsLabel}>Event Start Time</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => startTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={startTimeInputRef} placeholder="Start Time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} step="60" required />
          </div>
        </div>
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Event End Time</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => endTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" placeholder="End Time" ref={endTimeInputRef} value={endTime} onChange={e => setEndTime(e.target.value)} className={styles.input} step="60" required />

          </div>
          </div>
        </div>
        <div className={styles.contractRow}>
         <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Set Time</label>
          <div className={styles.inputRow}>
            <button type="button" className={styles.contracticon} onClick={() => setTimeInputRef.current?.showPicker?.()}>
              <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
            </button>
            <input type="time" ref={setTimeInputRef} placeholder="Set Time" value={setTime} onChange={e => setSetTime(e.target.value)} className={styles.input} step="60" required />

          </div>
        </div>
        <div className={styles.ticketInputWrapper}>
            <label className={styles.ticketsLabel}>Set Length</label>
            <div className={styles.inputRow} style={{ position: "relative" }}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "setLength" ? null : "setLength"
                  )
                }
              >
                <Image src="/contracts-Icons/Clock.svg" alt="Clock" width={24} height={24} />
              </button>
              <input
                type="text"
                className={styles.input}
                placeholder="Select Length"
                value={setLength}
                readOnly
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "setLength" ? null : "setLength"
                  )
                }
                style={{ cursor: "pointer" }}
              />
              {activeDropdown === "setLength" && (
                <div
                  className={styles.dropdownMenu}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {setLengthOptions.map(option => (
                    <div
                      key={option}
                      className={styles.dropdownOption}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSetLength(option);
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

export default DatesAndTimesSection;