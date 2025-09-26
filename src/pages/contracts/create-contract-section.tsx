import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";
import { EventDocs } from "../../backend/eventsdata";
const dropdownOptions = ["Option 1", "Option 2", "Option 3"];
const CreateContractsection = ({}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dateTime, setDateTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loadIn, setLoadIn] = useState("");
  const [doors, setDoors] = useState("");
  const [setTime, setSetTime] = useState("");
  const [setLength, setSetLength] = useState("");
  const [ticketsSale, setTicketsSale] = useState("");
  const [showDate, setShowDate] = useState("");
  const [LegalAgreementValue, setLegalAgreementValue] = useState("");
  const [isDatesTimeOpen, setIsDatesTimeOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [isMoneyOpen, setIsMoneyOpen] = useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [isRiderOpen, setIsRiderOpen] = useState(false);
  const [isLegalAgreementOpen, setIsLegalAgreementOpen] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [comps, setComps] = useState("");
  const [general, setGeneral] = useState("");
  const [presale, setPresale] = useState("");
  const [add, setAdd] = useState("");
  const [isAddEnabled, setIsAddEnabled] = useState(false);
  const [moneyInput, setmoneyInput] = useState("");
  const [securitydepositAdd, setsecuritydepositAdd] = useState("");
  const [canceledbyAdd, setcanceledbyAdd] = useState("");
  const [RiderAdd, setRiderAdd] = useState("");
  const [RiderValue, setRiderValue] = useState("");
  const [promotionValue, setPromotionValue] = useState("");
  const startTimeInputRef = useRef<HTMLInputElement | null>(null);
  const endTimeInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const ticketsSaleDateInputRef = useRef<HTMLInputElement | null>(null);
  const showDateInputRef = useRef<HTMLInputElement | null>(null);
  const DocHeader = ({
    label,
    isOpen,
    onToggle,
  }: {
    label: string;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      <label className={`${styles.label} ${isOpen ? styles.open : ''}`}>
        {label}
      </label>
      {!isOpen && (
        <Image
          src="/contracts-Icons/Dropdown.svg"
          alt="Dropdown"
          width={24}
          height={24}
          className={styles.dropdownIcon}
        />
      )}
    </div>
  );
  useEffect(() => {
    const handleClick = () => {
      if (activeDropdown) setActiveDropdown(null);
    };
    if (activeDropdown) {
      window.addEventListener("mousedown", handleClick);
    }
    return () => {
      window.removeEventListener("mousedown", handleClick);
    };
  }, [activeDropdown]);
  return (
    <div className={styles.sectioncontainer}>
      <div className={styles.docContainer}>
          <DocHeader
          label="Dates and Time"
          isOpen={isDatesTimeOpen}
          onToggle={() => setIsDatesTimeOpen(!isDatesTimeOpen)}
        />
        {isDatesTimeOpen && (
          <>
            <div className={styles.inputRow}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={() => dateInputRef.current?.showPicker?.()}
              >
                <Image
                  src="/contracts-Icons/Calendar.svg"
                  alt="Calendar"
                  width={24}
                  height={24}
                />
              </button>
              <input
                type="date"
                placeholder="Event Announcement"
                ref={dateInputRef}
                onClick={() => dateInputRef.current?.showPicker?.()}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.inputRow}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={() => ticketsSaleDateInputRef.current?.showPicker?.()}
              >
                <Image
                  src="/contracts-Icons/Calendar.svg"
                  alt="Calendar"
                  width={24}
                  height={24}
                />
              </button>
              <input
                type="date"
                placeholder="Tickets Go on Sale"
                ref={ticketsSaleDateInputRef}
                onClick={() => ticketsSaleDateInputRef.current?.showPicker?.()}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.inputRow}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={() => showDateInputRef.current?.showPicker?.()} 
              >
                <Image
                  src="/contracts-Icons/Calendar.svg"
                  alt="Calendar"
                  width={24}
                  height={24}
                />
              </button>
              <input
                type="date"
                placeholder="Show Date"
                ref={showDateInputRef}
                onClick={() => showDateInputRef.current?.showPicker?.()}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.contractRow}>
              <div className={styles.dropdownInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Clock.svg"
                    alt="Clock" 
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Load In"
                  onChange={(e) => setLoadIn(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                  setActiveDropdown(activeDropdown === "loadIn" ? null : "loadIn")
                }
              />
              {activeDropdown === "loadIn" && (
                <div className={styles.dropdownMenu}>
                  {dropdownOptions.map((option) => (
                    <div
                      key={option}
                      className={styles.dropdownOption}
                      onClick={() => {
                        setLoadIn(option);
                        setActiveDropdown(null);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
              <div className={styles.dropdownInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Clock.svg"
                    alt="Clock"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Doors"
                  value={doors}
                  onChange={(e) => setDoors(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "doors" ? null : "doors")
                  }
                />
                {activeDropdown === "doors" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setDoors(option);
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
            <div className={styles.contractRow}>
              <div className={styles.dropdownInput}>
                <button
                  type="button"
                  className={styles.contracticon}
                  onClick={() => startTimeInputRef.current?.showPicker?.()}
                >
                  <Image
                    src="/contracts-Icons/Clock.svg"
                    alt="Clock"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="time"
                  ref={startTimeInputRef}
                  placeholder="Start Time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                  setActiveDropdown(activeDropdown === "startTime" ? null : "startTime")
                  }
                />
                {activeDropdown === "startTime" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setStartTime(option);
                          setActiveDropdown(null);
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.dropdownInput}>
                <button
                  type="button"
                  className={styles.contracticon}
                  onClick={() => endTimeInputRef.current?.showPicker?.()}
                >
                  <Image
                    src="/contracts-Icons/Clock.svg"
                    alt="Clock"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="time"
                  placeholder="End Time"
                  ref={endTimeInputRef}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "endTime" ? null : "endTime")
                  }
                />
                {activeDropdown === "endTime" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setEndTime(option);
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
            <div className={styles.contractRow}>
              <div className={styles.dropdownInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Clock.svg"
                    alt="Clock"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Set Time"
                  value={setTime}
                  onChange={(e) => setSetTime(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "setTime" ? null : "setTime")
                  }
                />
                {activeDropdown === "setTime" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setSetTime(option);
                          setActiveDropdown(null);
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.dropdownInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Clock.svg"
                    alt="Clock"
                    width={24}
                    height={24}
                    
                  />
                </button>
                <input
                  type="text"
                  placeholder="Set Length"
                  value={setLength}
                  onChange={(e) => setSetLength(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "setLength" ? null : "setLength")
                  }
                />
                {activeDropdown === "setLength" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
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
          </>
        )}
      </div>
      <div className={styles.docContainer}>
        <DocHeader
        label="Location"
        isOpen={isLocationOpen}
        onToggle={() => setIsLocationOpen(!isLocationOpen)}
      />

        {isLocationOpen && (
          <>
            <div className={styles.inputRow}>
              <button type="button" className={styles.contracticon}>
                <Image
                  src="/contracts-Icons/Building_01.svg"
                  alt="Building"
                  width={24}
                  height={24}
                />
              </button>
              <input
                type="text"
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Venue Name"
                className={styles.input}
                required
              />
              <Image
                src="/contracts-Icons/Dropdown.svg"
                alt="Dropdown"
                width={24}
                height={24}
              />
            </div>
            <div className={styles.inputRow}>
              <button type="button" className={styles.contracticon}>
                <Image
                  src="/contracts-Icons/Map_Pin.svg"
                  alt="Map Pin"
                  width={24}
                  height={24}
                />
              </button>
              <input
                type="text"
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className={styles.input}
                required
              />
              <Image
                src="/contracts-Icons/Dropdown.svg"
                alt="Dropdown"
                width={24}
                height={24}
              />
            </div>
          </>
        )}
      </div>
      <div className={styles.docContainer}>
        <DocHeader
        label="Tickets"
        isOpen={isTicketsOpen}
        onToggle={() => setIsTicketsOpen(!isTicketsOpen)}
      />

        {isTicketsOpen && (
          <>
            <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="Total Capacity"
                  onChange={(e) => setTotalCapacity(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  
                </button>
                <input
                  type="text"
                  placeholder="Comps"
                  onChange={(e) => setComps(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
            </div>
            <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Calendar.svg"
                    alt="general"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="General"
                  onChange={(e) => setGeneral(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Calendar.svg"
                    alt="presale"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Presale"
                  onChange={(e) => setPresale(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
            </div>
            <div className={styles.contractRow}>
              <div className={`${styles.contractInput} ${styles.addInput}`}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Add_Plus.svg"
                    alt="add"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  onChange={(e) => setAdd(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.toggleRow}>
                
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={isAddEnabled}
                  onChange={(e) => setIsAddEnabled(e.target.checked)}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <div className={styles.docContainer}>
        <DocHeader
        label="Money"
        isOpen={isMoneyOpen}
        onToggle={() => setIsMoneyOpen(!isMoneyOpen)}
      />

        {isMoneyOpen && (
          <>
          <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Security deposit Venue
          </label>
            <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
            <div className={styles.contractRow}>
              <div className={`${styles.contractInput} ${styles.addInput}`}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Add_Plus.svg"
                    alt="add"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  onChange={(e) => setsecuritydepositAdd(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            If canceled by
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
            <div className={styles.contractRow}>
              <div className={`${styles.contractInput} ${styles.addInput}`}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Add_Plus.svg"
                    alt="add"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  onChange={(e) => setcanceledbyAdd(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>
          <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Security deposit Band
          </label>
            <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
            <div className={styles.contractRow}>
              <div className={`${styles.contractInput} ${styles.addInput}`}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Add_Plus.svg"
                    alt="add"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  onChange={(e) => setsecuritydepositAdd(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            If canceled by
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
            <div className={styles.contractRow}>
              <div className={`${styles.contractInput} ${styles.addInput}`}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/Add_Plus.svg"
                    alt="add"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  onChange={(e) => setcanceledbyAdd(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>
            <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Guarantee $
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
          <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Advance
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
      <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Backend
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="$ 500"
                  className={styles.input}
                  readOnly
                />
                
              </div>
            </div>
      <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Bar Split
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  onChange={(e) => setmoneyInput(e.target.value)}
                  className={styles.input}
                  required
                />
                <Image
                  src="/contracts-Icons/Dropdown.svg"
                  alt="Dropdown"
                  width={24}
                  height={24}
                />
              </div>
            </div>
            </>
            )}
            </div>

            <div className={styles.docContainer}>
            <DocHeader
            label="Payments"
            isOpen={isPaymentsOpen}
            onToggle={() => setIsPaymentsOpen(!isPaymentsOpen)}
          />

            {isPaymentsOpen && (
              <>
                <label className={`${styles.LeftLabel} ${isPaymentsOpen ? styles.open : ''}`}>Venue</label>
                <div className={styles.contractRow}>
                        <div className={styles.contractInput}>
                          <button type="button" className={styles.contracticon}>
                            <Image
                              src="/contracts-Icons/calendar.svg"
                              alt="moneyInput"
                              width={24}
                              height={24}
                            />
                          </button>
                          <input
                            type="text"
                            placeholder="30%"
                            onChange={(e) => setmoneyInput(e.target.value)}
                            className={styles.input}
                            required
                          />
                          <Image
                            src="/contracts-Icons/Dropdown.svg"
                            alt="Dropdown"
                            width={24}
                            height={24}
                          />
                        </div>
                        <div className={styles.contractInput}>
                          <input
                            type="text"
                            placeholder="$ 500"
                            className={styles.input}
                            readOnly
                          />
                          
                        </div>
                      </div>
                      <div className={`${styles.contractInput} ${styles.addInput}`}>
                    <button type="button" className={styles.contracticon}>
                        <Image
                        src="/contracts-Icons/Add_Plus.svg"
                        alt="add"
                        width={24}
                        height={24}
                        />
                    </button>
                    <input
                        type="text"
                        placeholder="Add"
                        onChange={(e) => setcanceledbyAdd(e.target.value)}
                        className={styles.input}
                        required
                    />
                    </div>

                <label className={`${styles.LeftLabel} ${isPaymentsOpen ? styles.open : ''}`}>Artists</label>
                <div className={styles.contractRow}>
                        <div className={styles.contractInput}>
                          <button type="button" className={styles.contracticon}>
                            <Image
                              src="/contracts-Icons/calendar.svg"
                              alt="moneyInput"
                              width={24}
                              height={24}
                            />
                          </button>
                          <input
                            type="text"
                            placeholder="30%"
                            onChange={(e) => setmoneyInput(e.target.value)}
                            className={styles.input}
                            required
                          />
                          <Image
                            src="/contracts-Icons/Dropdown.svg"
                            alt="Dropdown"
                            width={24}
                            height={24}
                          />
                        </div>
                        <div className={styles.contractInput}>
                          <input
                            type="text"
                            placeholder="$ 500"
                            className={styles.input}
                            readOnly
                          />
                          
                        </div>
                      </div>
                     <div className={`${styles.contractInput} ${styles.addInput}`}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Add_Plus.svg"
                      alt="add"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Add"
                    onChange={(e) => setcanceledbyAdd(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                      </>
                    )}
                  </div>
          <div className={styles.docContainer}>
          <DocHeader
                  label="Promotion"
                  isOpen={isPromotionOpen}
                  onToggle={() => setIsPromotionOpen(!isPromotionOpen)}
                />
          {isPromotionOpen && (
            <>
              <div className={styles.promotionImageContainer}>
                <img
                  src={EventDocs[0].image}
                  alt={EventDocs[0].title}
                  className={styles.promotionImage}
                />
                <div className={styles.promotionDetailsOverlay}>
                  <h2 className={styles.promotionTitle}>{EventDocs[0].title}</h2>
                  <span className={styles.promotionLocation}>
                    <img src="/contracts-Icons/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                    Wembley Stadium London
                  </span>
                  <span className={styles.promotionDate}>
                    <img src="/contracts-Icons/Calendar.svg" alt="Date" className={styles.promotionIcon} />
                    Sat. 19 December
                  </span>
                </div>
              </div>
              <label className={`${styles.LeftLabel}`}>Event Name</label>
              <div className={styles.contractRow}>
                <div className={styles.contractInput}>
                  <input
                    type="text"
                    placeholder="Value"
                    value={promotionValue}
                    onChange={(e) => setPromotionValue(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.docContainer}>
          <DocHeader
                  label="Rider"
                  isOpen={isRiderOpen}
                  onToggle={() => setIsRiderOpen(!isRiderOpen)}
                />
          {isRiderOpen && (
            <>
              <div className={styles.contractRow}>
                <div className={styles.contractInput}>
                  <input
                    type="text"
                    placeholder="Value"
                    onChange={(e) => setRiderValue(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>
              <div className={styles.contractRow}>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Add_Plus.svg"
                      alt="add"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Add"
                    onChange={(e) => setRiderAdd(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.docContainer}>
          <DocHeader
                  label="Legal Agreement"
                  isOpen={isLegalAgreementOpen}
                  onToggle={() => setIsLegalAgreementOpen(!isLegalAgreementOpen)}
                />
          {isLegalAgreementOpen && (
            <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                <input
                  type="text"
                  placeholder="Value"
                  onChange={(e) => setLegalAgreementValue(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>
          )}
</div>
    </div>
  );
};

export default CreateContractsection;