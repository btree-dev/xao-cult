import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import DatesAndTimesSection from "./DatesAndTimesSection";
import LocationSection from "./LocationSection";
import TicketsSection, { TicketRow } from "./TicketsSection";
import MoneySection, { SecurityDepositRow, CancelPartyRow } from "./MoneySection";
import PaymentsSection, { PaymentRow } from "./PaymentsSection";
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

  // Add ticket rows state
  const [ticketRows, setTicketRows] = useState<TicketRow[]>([
    { ticketType: "", onSaleDate: "", numberOfTickets: "", ticketPrice: "" }
  ]);

  const [securityDepositRows, setSecurityDepositRows] = useState<SecurityDepositRow[]>([
  { dateTime: "", percentage: "", dollarAmount: "" }
]);

const [cancelParty1Rows, setCancelParty1Rows] = useState<CancelPartyRow[]>([
  { dateTime: "", percentage: "", dollarAmount: "" }
]);
const addCancelParty1Row = () => setCancelParty1Rows([...cancelParty1Rows, { dateTime: "", percentage: "", dollarAmount: "" }]);
const updateCancelParty1Row = (index: number, field: keyof CancelPartyRow, value: string) => {
  const updated = [...cancelParty1Rows];
  updated[index][field] = value;
  setCancelParty1Rows(updated);
};
const [securityDeposit2Rows, setSecurityDeposit2Rows] = useState<SecurityDepositRow[]>([
  { dateTime: "", percentage: "", dollarAmount: "" }
]);
const addSecurityDeposit2Row = () => setSecurityDeposit2Rows([...securityDeposit2Rows, { dateTime: "", percentage: "", dollarAmount: "" }]);
const updateSecurityDeposit2Row = (index: number, field: keyof SecurityDepositRow, value: string) => {
  const updated = [...securityDeposit2Rows];
  updated[index][field] = value;
  setSecurityDeposit2Rows(updated);
};

const [cancelParty2Rows, setCancelParty2Rows] = useState<CancelPartyRow[]>([
  { dateTime: "", percentage: "", dollarAmount: "" }
]);
const addCancelParty2Row = () => setCancelParty2Rows([...cancelParty2Rows, { dateTime: "", percentage: "", dollarAmount: "" }]);
const updateCancelParty2Row = (index: number, field: keyof CancelPartyRow, value: string) => {
  const updated = [...cancelParty2Rows];
  updated[index][field] = value;
  setCancelParty2Rows(updated);
};

// Payment rows state for Party 1
const [payoutRows, setPayoutRows] = useState<PaymentRow[]>([
  { dateTime: "", percentage: "", dollarAmount: "" }
]);
const addPayoutRow = () => setPayoutRows([...payoutRows, { dateTime: "", percentage: "", dollarAmount: "" }]);
const updatePayoutRow = (index: number, field: keyof PaymentRow, value: string) => {
  const updated = [...payoutRows];
  updated[index][field] = value;
  setPayoutRows(updated);
};

// Payment rows state for Party 2
const [payout2Rows, setPayout2Rows] = useState<PaymentRow[]>([
  { dateTime: "", percentage: "", dollarAmount: "" }
]);
const addPayout2Row = () => setPayout2Rows([...payout2Rows, { dateTime: "", percentage: "", dollarAmount: "" }]);
const updatePayout2Row = (index: number, field: keyof PaymentRow, value: string) => {
  const updated = [...payout2Rows];
  updated[index][field] = value;
  setPayout2Rows(updated);
};

  const startTimeInputRef = useRef<HTMLInputElement | null>(null);
  const endTimeInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const ticketsSaleDateInputRef = useRef<HTMLInputElement | null>(null);
  const showDateInputRef = useRef<HTMLInputElement | null>(null);

  // Add ticket row function
  const addTicketRow = () => {
    setTicketRows([
      ...ticketRows,
      { ticketType: "", onSaleDate: "", numberOfTickets: "", ticketPrice: "" }
    ]);
  };

  // Update ticket row function
  const updateTicketRow = (index: number, field: keyof TicketRow, value: string) => {
    const updatedRows = [...ticketRows];
    updatedRows[index][field] = value;
    setTicketRows(updatedRows);
  };

  // Add security deposit row function
  const addSecurityDepositRow = () => {
    setSecurityDepositRows([...securityDepositRows, { dateTime: "", percentage: "", dollarAmount: "" }]);
  };

  // Update security deposit row function
  const updateSecurityDepositRow = (index: number, field: keyof SecurityDepositRow, value: string) => {
    const updatedRows = [...securityDepositRows];
    updatedRows[index][field] = value;
    setSecurityDepositRows(updatedRows);
  };

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
      <DatesAndTimesSection
        isOpen={isDatesTimeOpen}
        onToggle={() => setIsDatesTimeOpen(!isDatesTimeOpen)}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        dateInputRef={dateInputRef}
        ticketsSaleDateInputRef={ticketsSaleDateInputRef}
        showDateInputRef={showDateInputRef}
        startTimeInputRef={startTimeInputRef}
        endTimeInputRef={endTimeInputRef}
        loadIn={loadIn}
        setLoadIn={setLoadIn}
        doors={doors}
        setDoors={setDoors}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        setTime={setTime}
        setSetTime={setSetTime}
        setLength={setLength}
        setSetLength={setSetLength}
      />
      <LocationSection
        isOpen={isLocationOpen}
        onToggle={() => setIsLocationOpen(!isLocationOpen)}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        venueName={venueName}
        setVenueName={setVenueName}
        address={address}
        setAddress={setAddress}
      />
      <TicketsSection
        isOpen={isTicketsOpen}
        onToggle={() => setIsTicketsOpen(!isTicketsOpen)}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        isTicketEnabled={isTicketEnabled}
        setticketsEnabled={setticketsEnabled}
        totalCapacity={totalCapacity}
        setTotalCapacity={setTotalCapacity}
        comps={comps}
        setComps={setComps}
        ticketRows={ticketRows}
        addTicketRow={addTicketRow}
        updateTicketRow={updateTicketRow}
      />
      <MoneySection
        isOpen={isMoneyOpen}
        onToggle={() => setIsMoneyOpen(!isMoneyOpen)}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        securityDepositRows={securityDepositRows}
        addSecurityDepositRow={addSecurityDepositRow}
        updateSecurityDepositRow={updateSecurityDepositRow}
        cancelParty1Rows={cancelParty1Rows}
        addCancelParty1Row={addCancelParty1Row}
        updateCancelParty1Row={updateCancelParty1Row}
        depositbandInput={depositbandInput}
        setdepositbandInput={setdepositbandInput}
        bandCanceledBy={bandCanceledBy}
        setbandCanceledBy={setbandCanceledBy}
        guaranteeInput={guaranteeInput}
        setguaranteeInput={setguaranteeInput}
        backendInput={backendInput}
        setBackendInput={setBackendInput}
        barsplitInput={barsplitInput}
        setBarsplitInput={setBarsplitInput}
        merchSplitInput={merchSplitInput}
        setMerchSplitInput={setMerchSplitInput}
        cancelParty2DateTime={cancelParty2DateTime}
        setCancelParty2DateTime={setCancelParty2DateTime}
        securitydepositAdd={securitydepositAdd}
        setsecuritydepositAdd={setsecuritydepositAdd}
        securityDeposit2Rows={securityDeposit2Rows}
        addSecurityDeposit2Row={addSecurityDeposit2Row}
        updateSecurityDeposit2Row={updateSecurityDeposit2Row}
        cancelParty2Rows={cancelParty2Rows}
        addCancelParty2Row={addCancelParty2Row}
        updateCancelParty2Row={updateCancelParty2Row}
      />
      <PaymentsSection
        isOpen={isPaymentsOpen}
        onToggle={() => setIsPaymentsOpen(!isPaymentsOpen)}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        party1Rows={payoutRows}
        addParty1Row={addPayoutRow}
        updateParty1Row={updatePayoutRow}
        party2Rows={payout2Rows}
        addParty2Row={addPayout2Row}
        updateParty2Row={updatePayout2Row}
      />
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