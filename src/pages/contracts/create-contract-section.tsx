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
  const [isTicketEnabled, setticketsEnabled] = useState(false);
  const [moneyInput, setmoneyInput] = useState("");
  const [venueCanceledBy, setvenueCanceledBy] = useState("");
  const [securitydepositAdd, setsecuritydepositAdd] = useState("");
  const [canceledbyAdd, setcanceledbyAdd] = useState("");
  const [depositbandInput, setdepositbandInput] = useState("");
  const [bandCanceledBy, setbandCanceledBy] = useState("");
  const [guaranteeInput, setguaranteeInput] = useState("");
  const [backendInput, setBackendInput] = useState("");
  const [barsplitInput, setBarsplitInput] = useState("");
  const [merchSplitInput, setMerchSplitInput] = useState("");
  const [cancelParty1DateTime, setCancelParty1DateTime] = useState("");
  const [cancelParty2DateTime, setCancelParty2DateTime] = useState("");
  const [RiderAdd, setRiderAdd] = useState("");
  const [RiderValue, setRiderValue] = useState("");
  const [promotionValue, setPromotionValue] = useState("");
  const [payoutDateTime, setPayoutDateTime] = useState("");
  const [payoutPercentage, setPayoutPercentage] = useState("");
  const [payoutDollarAmount, setPayoutDollarAmount] = useState("");
  const [payout2DateTime, setPayout2DateTime] = useState("");
  const [payout2Percentage, setPayout2Percentage] = useState("");
  const [payout2DollarAmount, setPayout2DollarAmount] = useState("");
  const startTimeInputRef = useRef<HTMLInputElement | null>(null);
  const endTimeInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const ticketsSaleDateInputRef = useRef<HTMLInputElement | null>(null);
  const showDateInputRef = useRef<HTMLInputElement | null>(null);
  const SectionHeader = ({
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
      <div className={`${styles.docContainer} ${isDatesTimeOpen ? styles.open : styles.closed}`}>
          <SectionHeader
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
              <div className={styles.contractInput}>
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
              <div className={styles.contractInput}>
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
              <div className={styles.contractInput}>
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
              <div className={styles.contractInput}>
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
              <div className={styles.contractInput}>
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
              <div className={styles.contractInput}>
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
      <div className={`${styles.docContainer} ${isLocationOpen ? styles.open : styles.closed}`}>
        <SectionHeader
        label="Location"
        isOpen={isLocationOpen}
        onToggle={() => setIsLocationOpen(!isLocationOpen)}
      />

        {isLocationOpen && (
          <>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Venue Name</label>
              <div className={styles.contractInput}>
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
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "venueName" ? null : "venueName")
                  }
                />
                {activeDropdown === "venueName" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setVenueName(option);
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
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Address</label>
              <div className={styles.contractInput}>
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
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "address" ? null : "address")
                  }
                />
                {activeDropdown === "address" && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map((option) => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setAddress(option);
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
      <div className={`${styles.docContainer} ${isTicketsOpen ? styles.open : styles.closed}`}>
        <SectionHeader
        label="Tickets"
        isOpen={isTicketsOpen}
        onToggle={() => setIsTicketsOpen(!isTicketsOpen)}
        />
        {isTicketsOpen && (
          <>
            <div className={styles.ticketsHeaderRow}>
              <div className={styles.toggleContainer}>
                <label className={styles.ticketsLabel}>Tickets</label>
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={isTicketEnabled}
                  onChange={(e) => setticketsEnabled(e.target.checked)}
                />
              </div>
              <div className={styles.ticketInputWrapper}>
                <label className={styles.ticketsLabel}>Total Capacity</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/hash icon.svg"
                      alt="hash"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Total Capacity"
                    value={totalCapacity}
                    onChange={(e) => setTotalCapacity(e.target.value)}
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
                      setActiveDropdown(activeDropdown === "totalCapacity" ? null : "totalCapacity")
                    }
                  />
                  {activeDropdown === "totalCapacity" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setTotalCapacity(option);
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
              <div className={styles.ticketInputWrapper}>
                <label className={styles.ticketsLabel}>Sales Tax</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Percent icon.svg"
                      alt="percent"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Sales Tax %"
                    value={comps}
                    onChange={(e) => setComps(e.target.value)}
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
                      setActiveDropdown(activeDropdown === "salesTax" ? null : "salesTax")
                    }
                  />
                  {activeDropdown === "salesTax" && (
                    <div className={styles.dropdownMenu}>
                      {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                        <div
                          key={num}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setComps(`${num}%`);
                            setActiveDropdown(null);
                          }}
                        >
                          {num}%
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ticket Details Container */}
            <div className={styles.ticketDetailsContainer}>
              <div className={styles.ticketDetailsRow}>
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>Ticket Type</label>
                  <div className={styles.contractInput}>
                    <input
                      type="text"
                      placeholder="General Admission"
                      className={styles.input}
                      required
                    />
                    <Image
                      src="/contracts-Icons/Dropdown.svg"
                      alt="Dropdown"
                      width={20}
                      height={20}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setActiveDropdown(activeDropdown === "ticketType" ? null : "ticketType")
                      }
                    />
                    {activeDropdown === "ticketType" && (
                      <div className={styles.dropdownMenu}>
                        {["Comp", "Presale", "General Admission", "VIP", "Text input"].map((option) => (
                          <div
                            key={option}
                            className={styles.dropdownOption}
                            onClick={() => {
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
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>On Sale Date</label>
                  <div className={styles.contractInput}>
                    <button type="button" className={styles.contracticon}>
                      <Image
                        src="/contracts-Icons/Calendar.svg"
                        alt="Calendar"
                        width={20}
                        height={20}
                      />
                    </button>
                    <input
                      type="text"
                      placeholder="General"
                      value={general}
                      onChange={(e) => setGeneral(e.target.value)}
                      className={styles.input}
                      required
                    />
                    <Image
                      src="/contracts-Icons/Dropdown.svg"
                      alt="Dropdown"
                      width={20}
                      height={20}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setActiveDropdown(activeDropdown === "general" ? null : "general")
                      }
                    />
                    {activeDropdown === "general" && (
                      <div className={styles.dropdownMenu}>
                        {dropdownOptions.map((option) => (
                          <div
                            key={option}
                            className={styles.dropdownOption}
                            onClick={() => {
                              setGeneral(option);
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

              <div className={styles.ticketDetailsRow}>
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>Number of tickets</label>
                  <div className={styles.contractInput}>
                    <button type="button" className={styles.contracticon}>
                      <Image
                        src="/contracts-Icons/hash icon.svg"
                        alt="hash"
                        width={20}
                        height={20}
                      />
                    </button>
                    <input
                      type="text"
                      placeholder="500"
                      className={styles.input}
                      required
                    />
                    <Image
                      src="/contracts-Icons/Dropdown.svg"
                      alt="Dropdown"
                      width={20}
                      height={20}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setActiveDropdown(activeDropdown === "numberOfTickets" ? null : "numberOfTickets")
                      }
                    />
                    {activeDropdown === "numberOfTickets" && (
                      <div className={styles.dropdownMenu}>
                        {dropdownOptions.map((option) => (
                          <div
                            key={option}
                            className={styles.dropdownOption}
                            onClick={() => {
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
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>Ticket price</label>
                  <div className={styles.contractInput}>
                    <button type="button" className={styles.contracticon}>
                      <Image
                        src="/contracts-Icons/Dollar sign.svg"
                        alt="dollar"
                        width={20}
                        height={20}
                      />
                    </button>
                    <input
                      type="text"
                      placeholder="50.00"
                      className={styles.input}
                      required
                    />
                    <Image
                      src="/contracts-Icons/Dropdown.svg"
                      alt="Dropdown"
                      width={20}
                      height={20}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setActiveDropdown(activeDropdown === "ticketPrice" ? null : "ticketPrice")
                      }
                    />
                    {activeDropdown === "ticketPrice" && (
                      <div className={styles.dropdownMenu}>
                        {dropdownOptions.map((option) => (
                          <div
                            key={option}
                            className={styles.dropdownOption}
                            onClick={() => {
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
              </div>
            </div>
            <div className={styles.ticketSummary}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Gross Sub:</span>
                  <span className={styles.summaryValue}>₵25,000</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Taxes:</span>
                  <span className={styles.summaryValue}>₵2,000</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Gas:</span>
                  <span className={styles.summaryValue}>₵500</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Xao's 2%:</span>
                  <span className={styles.summaryValue}>₵500</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Net Sub:</span>
                  <span className={styles.summaryValue}>₵2,200</span>
                </div>
              </div>
          </>
        )}
      </div>
      <div className={`${styles.docContainer} ${isMoneyOpen ? styles.open : styles.closed}`}>
        <SectionHeader
        label="Money"
        isOpen={isMoneyOpen}
        onToggle={() => setIsMoneyOpen(!isMoneyOpen)}
      />
      {isMoneyOpen && (
          <>
          <div className={styles.ticketDetailsContainer}>
            <label className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
              Security deposit Party 1
            </label>
            <div className={styles.ticketDetailsRow}>
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Date & Time</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Calendar.svg"
                      alt="Calendar"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Date and time"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
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
                      setActiveDropdown(
                        activeDropdown === "securityDateTime" ? null : "securityDateTime"
                      )
                    }
                  />
                  {activeDropdown === "securityDateTime" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setDateTime(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Percentage</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Percent icon.svg"
                      alt="Percent"
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
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setActiveDropdown(activeDropdown === "moneyInput" ? null : "moneyInput")
                    }
                  />
                  {activeDropdown === "moneyInput" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setmoneyInput(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Dollar Amount</label>
                <div className={styles.contractInput}>
                  <Image
                    src="/contracts-Icons/Dollar sign.svg"
                    alt="Dollar"
                    width={24}
                    height={24}
                  />
                  <input
                    type="text"
                    placeholder="$ 500"
                    className={styles.input}
                    readOnly
                  />
                </div>
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
          
            <label className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
              Party 1 receives if canceled by:
            </label>
            <div className={styles.ticketDetailsRow}>
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Date & Time</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Calendar.svg"
                      alt="Calendar"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Date and time"
                    value={cancelParty1DateTime}
                    onChange={(e) => setCancelParty1DateTime(e.target.value)}
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
                      setActiveDropdown(
                        activeDropdown === "cancelParty1DateTime" ? null : "cancelParty1DateTime"
                      )
                    }
                  />
                  {activeDropdown === "cancelParty1DateTime" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setCancelParty1DateTime(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Percentage</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Percent icon.svg"
                      alt="Percent"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="30%"
                    onChange={(e) => setvenueCanceledBy(e.target.value)}
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
                      setActiveDropdown(activeDropdown === "venueCanceledBy" ? null : "venueCanceledBy")
                    }
                  />
                  {activeDropdown === "venueCanceledBy" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setvenueCanceledBy(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Dollar Amount</label>
                <div className={styles.contractInput}>
                  <Image
                    src="/contracts-Icons/Dollar sign.svg"
                    alt="Dollar"
                    width={24}
                    height={24}
                  />
                  <input
                    type="text"
                    placeholder="$ 500"
                    className={styles.input}
                    readOnly
                  />
                </div>
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
            </div>
            <div className={styles.ticketDetailsContainer}>
          <label className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
              Security deposit Part 2
            </label>
            <div className={styles.ticketDetailsRow}>
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Date & Time</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Calendar.svg"
                      alt="Calendar"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Date and time"
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Percentage</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Percent icon.svg"
                      alt="Percent"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="30%"
                    onChange={(e) => setdepositbandInput(e.target.value)}
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
                      setActiveDropdown(activeDropdown === "depositbandInput" ? null : "depositbandInput")
                    }
                  />
                  {activeDropdown === "depositbandInput" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setdepositbandInput(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Dollar Amount</label>
                <div className={styles.contractInput}>
                  <Image
                    src="/contracts-Icons/Dollar sign.svg"
                    alt="Dollar"
                    width={24}
                    height={24}
                  />
                  <input
                    type="text"
                    placeholder="$ 500"
                    className={styles.input}
                    readOnly
                  />
                </div>
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
            Party 2 receives if canceled by:
          </label>

            <div className={styles.ticketDetailsRow}>
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Date & Time</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Calendar.svg"
                      alt="Calendar"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="Date and time"
                    value={cancelParty2DateTime}
                    onChange={(e) => setCancelParty2DateTime(e.target.value)}
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
                      setActiveDropdown(
                        activeDropdown === "cancelParty2DateTime" ? null : "cancelParty2DateTime"
                      )
                    }
                  />
                  {activeDropdown === "cancelParty2DateTime" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setCancelParty2DateTime(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Percentage</label>
                <div className={styles.contractInput}>
                  <button type="button" className={styles.contracticon}>
                    <Image
                      src="/contracts-Icons/Percent icon.svg"
                      alt="Percent"
                      width={24}
                      height={24}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="30%"
                    onChange={(e) => setbandCanceledBy(e.target.value)}
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
                      setActiveDropdown(activeDropdown === "bandCanceledBy" ? null : "bandCanceledBy")
                    }
                  />
                  {activeDropdown === "bandCanceledBy" && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map((option) => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            setbandCanceledBy(option);
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
              <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Dollar Amount</label>
                <div className={styles.contractInput}>
                  <Image
                    src="/contracts-Icons/Dollar sign.svg"
                    alt="Dollar"
                    width={24}
                    height={24}
                  />
                  <input
                    type="text"
                    placeholder="$ 500"
                    className={styles.input}
                    readOnly
                  />
                </div>
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
            </div>
            <label
            className={`${styles.LeftLabel} ${isMoneyOpen ? styles.open : ''}`}>
            Guarantee $
          </label>
          <div className={styles.contractRow}>
              <div className={styles.contractInput}>
                  <Image
                    src="/contracts-Icons/calendar.svg"
                    alt="moneyInput"
                    width={24}
                    height={24}
                  />
                
                <input
                  type="text"
                  placeholder="30%"
                  value={guaranteeInput}
                  onChange={(e) => setguaranteeInput(e.target.value)}
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
                  setActiveDropdown(activeDropdown === "guaranteeInput" ? null : "guaranteeInput")
                  }
                />
                {activeDropdown === "guaranteeInput" && (
                <div className={styles.dropdownMenu}>
                  {dropdownOptions.map((option) => (
                    <div
                      key={option}
                      className={styles.dropdownOption}
                      onClick={() => {
                        setguaranteeInput(option);
                        setActiveDropdown(null);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
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
                  value={backendInput}
                  onChange={(e) => setBackendInput(e.target.value)}
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
                  setActiveDropdown(activeDropdown === "backendInput" ? null : "backendInput")
                  }
                />
                {activeDropdown === "backendInput" && (
                <div className={styles.dropdownMenu}>
                  {dropdownOptions.map((option) => (
                    <div
                      key={option}
                      className={styles.dropdownOption}
                      onClick={() => {
                        setBackendInput(option);
                        setActiveDropdown(null);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
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
        <div className={styles.ticketColumn}>
          <label className={styles.ticketColumnLabel}>Bar Split</label>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image
                src="/contracts-Icons/Percent icon.svg"
                alt="percent"
                width={24}
                height={24}
              />
            </button>
            <input
              type="text"
              placeholder="30%"
              onChange={(e) => setBarsplitInput(e.target.value)}
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
                setActiveDropdown(activeDropdown === "barsplitInput" ? null : "barsplitInput")
              }
            />
            {activeDropdown === "barsplitInput" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map((option) => (
                  <div
                    key={option}
                    className={styles.dropdownOption}
                    onClick={() => {
                      setBarsplitInput(option);
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
        <div className={styles.ticketColumn}>
          <label className={styles.ticketColumnLabel}>Merch Split</label>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image
                src="/contracts-Icons/Percent icon.svg"
                alt="percent"
                width={24}
                height={24}
              />
            </button>
            <input
              type="text"
              placeholder="30%"
              onChange={(e) => setMerchSplitInput(e.target.value)}
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
                setActiveDropdown(activeDropdown === "merchSplitInput" ? null : "merchSplitInput")
              }
            />
            {activeDropdown === "merchSplitInput" && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map((option) => (
                  <div
                    key={option}
                    className={styles.dropdownOption}
                    onClick={() => {
                      setMerchSplitInput(option);
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

            <div className={`${styles.docContainer} ${isPaymentsOpen ? styles.open : styles.closed}`}>
            <SectionHeader
            label="Payments"
            isOpen={isPaymentsOpen}
            onToggle={() => setIsPaymentsOpen(!isPaymentsOpen)}
          />

            {isPaymentsOpen && (
              <>
                <label className={`${styles.LeftLabel} ${isPaymentsOpen ? styles.open : ''}`}>Party 1</label>
                
                  <div className={styles.ticketDetailsRow}>
                    <div className={styles.ticketColumn}>
                      <label className={styles.ticketColumnLabel}>Date & Time</label>
                      <div className={styles.contractInput}>
                        <button type="button" className={styles.contracticon}>
                          <Image
                            src="/contracts-Icons/Calendar.svg"
                            alt="Calendar"
                            width={24}
                            height={24}
                          />
                        </button>
                        <input
                          type="text"
                          placeholder="Date and time"
                          value={payoutDateTime}
                          onChange={(e) => setPayoutDateTime(e.target.value)}
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
                            setActiveDropdown(
                              activeDropdown === "payoutDateTime" ? null : "payoutDateTime"
                            )
                          }
                        />
                        {activeDropdown === "payoutDateTime" && (
                          <div className={styles.dropdownMenu}>
                            {dropdownOptions.map((option) => (
                              <div
                                key={option}
                                className={styles.dropdownOption}
                                onClick={() => {
                                  setPayoutDateTime(option);
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
                    <div className={styles.ticketColumn}>
                      <label className={styles.ticketColumnLabel}>Percentage</label>
                      <div className={styles.contractInput}>
                        <button type="button" className={styles.contracticon}>
                          <Image
                            src="/contracts-Icons/Percent icon.svg"
                            alt="percent"
                            width={24}
                            height={24}
                          />
                        </button>
                        <input
                          type="text"
                          placeholder="30%"
                          value={payoutPercentage}
                          onChange={(e) => setPayoutPercentage(e.target.value)}
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
                            setActiveDropdown(
                              activeDropdown === "payoutPercentage" ? null : "payoutPercentage"
                            )
                          }
                        />
                        {activeDropdown === "payoutPercentage" && (
                          <div className={styles.dropdownMenu}>
                            {dropdownOptions.map((option) => (
                              <div
                                key={option}
                                className={styles.dropdownOption}
                                onClick={() => {
                                  setPayoutPercentage(option);
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
                    <div className={styles.ticketColumn}>
                      <label className={styles.ticketColumnLabel}>Dollar Amount</label>
                      <div className={styles.contractInput}>
                        <Image
                          src="/contracts-Icons/Dollar sign.svg"
                          alt="Dollar"
                          width={24}
                          height={24}
                        />
                        <input
                          type="text"
                          placeholder="$ 500"
                          value={payoutDollarAmount}
                          onChange={(e) => setPayoutDollarAmount(e.target.value)}
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
                            setActiveDropdown(
                              activeDropdown === "payoutDollarAmount" ? null : "payoutDollarAmount"
                            )
                          }
                        />
                        {activeDropdown === "payoutDollarAmount" && (
                          <div className={styles.dropdownMenu}>
                            {dropdownOptions.map((option) => (
                              <div
                                key={option}
                                className={styles.dropdownOption}
                                onClick={() => {
                                  setPayoutDollarAmount(option);
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
                        onChange={(e) => setvenueCanceledBy(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                
                <label className={`${styles.LeftLabel} ${isPaymentsOpen ? styles.open : ''}`}>Party 2</label>
                <div className={styles.ticketDetailsRow}>
                  <div className={styles.ticketColumn}>
                    <label className={styles.ticketColumnLabel}>Date & Time</label>
                    <div className={styles.contractInput}>
                      <button type="button" className={styles.contracticon}>
                        <Image
                          src="/contracts-Icons/Calendar.svg"
                          alt="Calendar"
                          width={24}
                          height={24}
                        />
                      </button>
                      <input
                        type="text"
                        placeholder="Date and time"
                        value={payout2DateTime}
                        onChange={(e) => setPayout2DateTime(e.target.value)}
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
                          setActiveDropdown(
                            activeDropdown === "payout2DateTime" ? null : "payout2DateTime"
                          )
                        }
                      />
                      {activeDropdown === "payout2DateTime" && (
                        <div className={styles.dropdownMenu}>
                          {dropdownOptions.map((option) => (
                            <div
                              key={option}
                              className={styles.dropdownOption}
                              onClick={() => {
                                setPayout2DateTime(option);
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
                  <div className={styles.ticketColumn}>
                    <label className={styles.ticketColumnLabel}>Percentage</label>
                    <div className={styles.contractInput}>
                      <button type="button" className={styles.contracticon}>
                        <Image
                          src="/contracts-Icons/Percent icon.svg"
                          alt="percent"
                          width={24}
                          height={24}
                        />
                      </button>
                      <input
                        type="text"
                        placeholder="30%"
                        value={payout2Percentage}
                        onChange={(e) => setPayout2Percentage(e.target.value)}
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
                          setActiveDropdown(
                            activeDropdown === "payout2Percentage" ? null : "payout2Percentage"
                          )
                        }
                      />
                      {activeDropdown === "payout2Percentage" && (
                        <div className={styles.dropdownMenu}>
                          {dropdownOptions.map((option) => (
                            <div
                              key={option}
                              className={styles.dropdownOption}
                              onClick={() => {
                                setPayout2Percentage(option);
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
                  <div className={styles.ticketColumn}>
                    <label className={styles.ticketColumnLabel}>Dollar Amount</label>
                    <div className={styles.contractInput}>
                      <Image
                        src="/contracts-Icons/Dollar sign.svg"
                        alt="Dollar"
                        width={24}
                        height={24}
                      />
                      <input
                        type="text"
                        placeholder="$ 500"
                        value={payout2DollarAmount}
                        onChange={(e) => setPayout2DollarAmount(e.target.value)}
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
                          setActiveDropdown(
                            activeDropdown === "payout2DollarAmount" ? null : "payout2DollarAmount"
                          )
                        }
                      />
                      {activeDropdown === "payout2DollarAmount" && (
                        <div className={styles.dropdownMenu}>
                          {dropdownOptions.map((option) => (
                            <div
                              key={option}
                              className={styles.dropdownOption}
                              onClick={() => {
                                setPayout2DollarAmount(option);
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
                      onChange={(e) => setRiderAdd(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className={`${styles.docContainer} ${isPromotionOpen ? styles.open : styles.closed}`}>
          <SectionHeader
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

        <div className={`${styles.docContainer} ${isRiderOpen ? styles.open : styles.closed}`}>
          <SectionHeader
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

        <div className={`${styles.docContainer} ${isLegalAgreementOpen ? styles.open : styles.closed}`}>
          <SectionHeader
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