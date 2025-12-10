import React, { useRef } from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

export interface SecurityDepositRow {
  dateTime: string;
  percentage: string;
  dollarAmount: string;
}

export interface CancelPartyRow {
  dateTime: string;
  percentage: string;
  dollarAmount: string;
}

export interface MoneyProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  securityDepositRows: SecurityDepositRow[];
  addSecurityDepositRow: () => void;
  updateSecurityDepositRow: (index: number, field: keyof SecurityDepositRow, value: string) => void;
  cancelParty1Rows: CancelPartyRow[];
  addCancelParty1Row: () => void;
  updateCancelParty1Row: (index: number, field: keyof CancelPartyRow, value: string) => void;
  depositbandInput: string;
  setdepositbandInput: (v: string) => void;
  bandCanceledBy: string;
  setbandCanceledBy: (v: string) => void;
  cancelParty2DateTime: string;
  setCancelParty2DateTime: (v: string) => void;
  securitydepositAdd: string;
  setsecuritydepositAdd: (v: string) => void;
  guaranteeInput: string;
  setguaranteeInput: (v: string) => void;
  backendInput: string;
  setBackendInput: (v: string) => void;
  barsplitInput: string;
  setBarsplitInput: (v: string) => void;
  merchSplitInput: string;
  setMerchSplitInput: (v: string) => void;
  securityDeposit2Rows: SecurityDepositRow[];
  addSecurityDeposit2Row: () => void;
  updateSecurityDeposit2Row: (index: number, field: keyof SecurityDepositRow, value: string) => void;
  cancelParty2Rows: CancelPartyRow[];
  addCancelParty2Row: () => void;
  updateCancelParty2Row: (index: number, field: keyof CancelPartyRow, value: string) => void;
  
}

const MoneySection: React.FC<MoneyProps> = ({
  isOpen,
  onToggle,
  activeDropdown,
  setActiveDropdown,
  securityDepositRows,
  addSecurityDepositRow,
  updateSecurityDepositRow,
  cancelParty1Rows,
  addCancelParty1Row,
  updateCancelParty1Row,
  depositbandInput,
  setdepositbandInput,
  bandCanceledBy,
  setbandCanceledBy,
  cancelParty2DateTime,
  setCancelParty2DateTime,
  securitydepositAdd,
  setsecuritydepositAdd,
  guaranteeInput,
  setguaranteeInput,
  backendInput,
  setBackendInput,
  barsplitInput,
  setBarsplitInput,
  merchSplitInput,
  setMerchSplitInput,
  securityDeposit2Rows,
  addSecurityDeposit2Row,
  updateSecurityDeposit2Row,
  cancelParty2Rows,
  addCancelParty2Row,
  updateCancelParty2Row,
}) => {
  // Refs for Security deposit Party 1
  const securityDepositDateRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Refs for Party 1 receives if canceled by
  const cancelParty1DateRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Refs for Security deposit Part 2
  const securityDeposit2DateRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Refs for Party 2 receives if canceled by
  const cancelParty2DateRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate total percentage for each section
  const calculateTotalPercentage = (rows: SecurityDepositRow[] | CancelPartyRow[]) => {
    if (!rows || !Array.isArray(rows)) return 0;
    return rows.reduce((total, row) => {
      const percentage = parseFloat(row.percentage) || 0;
      return total + percentage;
    }, 0);
  };

  const securityDeposit1Total = calculateTotalPercentage(securityDepositRows);
  const cancelParty1Total = calculateTotalPercentage(cancelParty1Rows);
  const securityDeposit2Total = calculateTotalPercentage(securityDeposit2Rows);
  const cancelParty2Total = calculateTotalPercentage(cancelParty2Rows);

  const isSecurityDeposit1Maxed = securityDeposit1Total >= 100;
  const isCancelParty1Maxed = cancelParty1Total >= 100;
  const isSecurityDeposit2Maxed = securityDeposit2Total >= 100;
  const isCancelParty2Maxed = cancelParty2Total >= 100;

  return (
    <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
      <div
        className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        {isOpen ? (
          <div className={styles.infoLabelRow}>
            <label className={`${styles.centeredLabel} ${styles.open}`}>Pay In&apos;s</label>
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
            <label className={`${styles.label} ${styles.open}`}>Pay In&apos;s</label>
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
          </>
        )}
      </div>
      {isOpen && (
        <>
          
          <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
            Guarantee $
          </label>
          <div className={styles.contractRow}>
            <div className={styles.contractInput} style={{ opacity: depositbandInput && depositbandInput !== "0" && depositbandInput !== "0.00" ? 0.5 : 1 }}>
              <Image src="/contracts-Icons/percent icon.svg" alt="moneyInput" className={styles.contracticon} width={20} height={20} />
              <input
                type="text"
                placeholder="0"
                value={guaranteeInput || "0"}
                disabled={!!(depositbandInput && depositbandInput !== "0" && depositbandInput !== "0.00")}
                onChange={e => {
                  const value = e.target.value;
                  // Remove all non-digit characters except decimal point
                  const cleaned = value.replace(/[^\d.]/g, '');

                  // Split by decimal point
                  const parts = cleaned.split('.');

                  // Only allow one decimal point
                  if (parts.length > 2) return;

                  // Get integer and decimal parts
                  let integerPart = parts[0] || '0';
                  let decimalPart = parts[1] || '';

                  // Remove leading zeros
                  integerPart = integerPart.replace(/^0+/, '') || '0';

                  // Limit to 2 decimal places
                  if (decimalPart.length > 2) {
                    decimalPart = decimalPart.slice(0, 2);
                  }

                  // Construct the value
                  let formattedValue = integerPart;
                  if (parts.length > 1) {
                    formattedValue += '.' + decimalPart;
                  }

                  // Parse and check if value is between 0-100
                  const numericValue = parseFloat(formattedValue);
                  if (numericValue > 100) {
                    return; // Don't update if over 100
                  }

                  setguaranteeInput(formattedValue);
                }}
                onBlur={e => {
                  // Ensure proper format on blur
                  const value = e.target.value || "0";
                  const cleaned = value.replace(/[^\d.]/g, '');
                  const numericValue = parseFloat(cleaned) || 0;

                  // Clamp between 0 and 100
                  const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                  setguaranteeInput(clampedValue.toString());
                }}
                className={styles.input}
                required
              />
              {/* Dropdown removed */}
            </div>
            <div className={styles.contractInput} style={{ opacity: guaranteeInput && guaranteeInput !== "0" ? 0.5 : 1 }}>
              <Image src="/contracts-Icons/Dollar sign.svg" alt="dollar" className={styles.contracticon} width={20} height={20} />
              <input
                type="text"
                placeholder="0.00"
                value={depositbandInput || "0.00"}
                disabled={!!(guaranteeInput && guaranteeInput !== "0")}
                onChange={e => {
                  const value = e.target.value;
                  // Remove all non-digit characters except decimal point
                  const cleaned = value.replace(/[^\d.]/g, '');

                  // Split by decimal point
                  const parts = cleaned.split('.');

                  // Only allow one decimal point
                  if (parts.length > 2) return;

                  // Format the integer part with commas
                  let integerPart = parts[0] || '0';
                  // Remove leading zeros but keep at least one zero
                  integerPart = integerPart.replace(/^0+/, '') || '0';

                  // Add commas for thousands
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                  // Handle decimal part (limit to 2 digits)
                  let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '00';

                  // Ensure always 2 decimal places
                  if (parts.length === 1 && !value.includes('.')) {
                    // User hasn't typed decimal yet
                    decimalPart = '00';
                  } else {
                    // Pad with zeros if needed
                    decimalPart = decimalPart.padEnd(2, '0');
                  }

                  const formatted = `${formattedInteger}.${decimalPart}`;
                  setdepositbandInput(formatted);
                }}
                onBlur={e => {
                  // Ensure proper format on blur
                  const value = e.target.value || "0.00";
                  const cleaned = value.replace(/[^\d.]/g, '');
                  const parts = cleaned.split('.');

                  let integerPart = parts[0] || '0';
                  integerPart = integerPart.replace(/^0+/, '') || '0';
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                  let decimalPart = parts[1] || '00';
                  decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                  const formatted = `${formattedInteger}.${decimalPart}`;
                  setdepositbandInput(formatted);
                }}
                className={styles.input}
              />
            </div>
          </div>
          <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
            Backend
          </label>
          <div className={styles.contractRow}>
            <div className={styles.contractInput} style={{ opacity: securitydepositAdd && securitydepositAdd !== "0" && securitydepositAdd !== "0.00" ? 0.5 : 1 }}>
              <Image src="/contracts-Icons/percent icon.svg" alt="moneyInput" className={styles.contracticon} width={20} height={20} />
              <input
                type="text"
                placeholder="0"
                value={backendInput || "0"}
                disabled={!!(securitydepositAdd && securitydepositAdd !== "0" && securitydepositAdd !== "0.00")}
                onChange={e => {
                  const value = e.target.value;
                  // Remove all non-digit characters except decimal point
                  const cleaned = value.replace(/[^\d.]/g, '');

                  // Split by decimal point
                  const parts = cleaned.split('.');

                  // Only allow one decimal point
                  if (parts.length > 2) return;

                  // Get integer and decimal parts
                  let integerPart = parts[0] || '0';
                  let decimalPart = parts[1] || '';

                  // Remove leading zeros
                  integerPart = integerPart.replace(/^0+/, '') || '0';

                  // Limit to 2 decimal places
                  if (decimalPart.length > 2) {
                    decimalPart = decimalPart.slice(0, 2);
                  }

                  // Construct the value
                  let formattedValue = integerPart;
                  if (parts.length > 1) {
                    formattedValue += '.' + decimalPart;
                  }

                  // Parse and check if value is between 0-100
                  const numericValue = parseFloat(formattedValue);
                  if (numericValue > 100) {
                    return; // Don't update if over 100
                  }

                  setBackendInput(formattedValue);
                }}
                onBlur={e => {
                  // Ensure proper format on blur
                  const value = e.target.value || "0";
                  const cleaned = value.replace(/[^\d.]/g, '');
                  const numericValue = parseFloat(cleaned) || 0;

                  // Clamp between 0 and 100
                  const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                  setBackendInput(clampedValue.toString());
                }}
                className={styles.input}
                required
              />
            
            </div>
            <div className={styles.contractInput} style={{ opacity: backendInput && backendInput !== "0" ? 0.5 : 1 }}>
              <Image src="/contracts-Icons/Dollar sign.svg" alt="dollar" className={styles.contracticon} width={20} height={20} />
              <input
                type="text"
                placeholder="0.00"
                value={securitydepositAdd || "0.00"}
                disabled={!!(backendInput && backendInput !== "0")}
                onChange={e => {
                  const value = e.target.value;
                  // Remove all non-digit characters except decimal point
                  const cleaned = value.replace(/[^\d.]/g, '');

                  // Split by decimal point
                  const parts = cleaned.split('.');

                  // Only allow one decimal point
                  if (parts.length > 2) return;

                  // Format the integer part with commas
                  let integerPart = parts[0] || '0';
                  // Remove leading zeros but keep at least one zero
                  integerPart = integerPart.replace(/^0+/, '') || '0';

                  // Add commas for thousands
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                  // Handle decimal part (limit to 2 digits)
                  let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '00';

                  // Ensure always 2 decimal places
                  if (parts.length === 1 && !value.includes('.')) {
                    // User hasn't typed decimal yet
                    decimalPart = '00';
                  } else {
                    // Pad with zeros if needed
                    decimalPart = decimalPart.padEnd(2, '0');
                  }

                  const formatted = `${formattedInteger}.${decimalPart}`;
                  setsecuritydepositAdd(formatted);
                }}
                onBlur={e => {
                 
                  const value = e.target.value || "0.00";
                  const cleaned = value.replace(/[^\d.]/g, '');
                  const parts = cleaned.split('.');

                  let integerPart = parts[0] || '0';
                  integerPart = integerPart.replace(/^0+/, '') || '0';
                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                  let decimalPart = parts[1] || '00';
                  decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                  const formatted = `${formattedInteger}.${decimalPart}`;
                  setsecuritydepositAdd(formatted);
                }}
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.contractRow}>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Bar Split</label>
              <div className={styles.inputRow}>
                <Image src="/contracts-Icons/percent icon.svg" alt="percent" className={styles.contracticon} width={20} height={20} />
                <input
                  type="text"
                  placeholder="0"
                  value={barsplitInput || "0"}
                  onChange={e => {
                    const value = e.target.value;
                    // Remove all non-digit characters except decimal point
                    const cleaned = value.replace(/[^\d.]/g, '');

                    // Split by decimal point
                    const parts = cleaned.split('.');

                    // Only allow one decimal point
                    if (parts.length > 2) return;

                    // Get integer and decimal parts
                    let integerPart = parts[0] || '0';
                    let decimalPart = parts[1] || '';

                    // Remove leading zeros
                    integerPart = integerPart.replace(/^0+/, '') || '0';

                    // Limit to 2 decimal places
                    if (decimalPart.length > 2) {
                      decimalPart = decimalPart.slice(0, 2);
                    }

                    // Construct the value
                    let formattedValue = integerPart;
                    if (parts.length > 1) {
                      formattedValue += '.' + decimalPart;
                    }

                    // Parse and check if value is between 0-100
                    const numericValue = parseFloat(formattedValue);
                    if (numericValue > 100) {
                      return; // Don't update if over 100
                    }

                    setBarsplitInput(formattedValue);
                  }}
                  onBlur={e => {
                    // Ensure proper format on blur
                    const value = e.target.value || "0";
                    const cleaned = value.replace(/[^\d.]/g, '');
                    const numericValue = parseFloat(cleaned) || 0;

                    // Clamp between 0 and 100
                    const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                    setBarsplitInput(clampedValue.toString());
                  }}
                  className={styles.input}
                  required
                />
              </div>
            </div>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Merch Split</label>
              <div className={styles.inputRow}>
                <Image src="/contracts-Icons/percent icon.svg" alt="percent" className={styles.contracticon} width={20} height={20} />
                <input
                  type="text"
                  placeholder="0"
                  value={merchSplitInput || "0"}
                  onChange={e => {
                    const value = e.target.value;
                    // Remove all non-digit characters except decimal point
                    const cleaned = value.replace(/[^\d.]/g, '');

                    // Split by decimal point
                    const parts = cleaned.split('.');

                    // Only allow one decimal point
                    if (parts.length > 2) return;

                    // Get integer and decimal parts
                    let integerPart = parts[0] || '0';
                    let decimalPart = parts[1] || '';

                    // Remove leading zeros
                    integerPart = integerPart.replace(/^0+/, '') || '0';

                    // Limit to 2 decimal places
                    if (decimalPart.length > 2) {
                      decimalPart = decimalPart.slice(0, 2);
                    }

                    // Construct the value
                    let formattedValue = integerPart;
                    if (parts.length > 1) {
                      formattedValue += '.' + decimalPart;
                    }

                    // Parse and check if value is between 0-100
                    const numericValue = parseFloat(formattedValue);
                    if (numericValue > 100) {
                      return; // Don't update if over 100
                    }

                    setMerchSplitInput(formattedValue);
                  }}
                  onBlur={e => {
                    // Ensure proper format on blur
                    const value = e.target.value || "0";
                    const cleaned = value.replace(/[^\d.]/g, '');
                    const numericValue = parseFloat(cleaned) || 0;

                    // Clamp between 0 and 100
                    const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                    setMerchSplitInput(clampedValue.toString());
                  }}
                  className={styles.input}
                  required
                />
              </div>
            </div>
          </div>
          <div className={styles.ticketDetailsContainer}>
            <div className={styles.infoLabelRow}>
            <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
              Security deposit Party 1
            </label>
            <Image
                src="/contracts-Icons/Info.svg"
                alt="Info"
                width={20}
                height={20}
                className={styles.infoIcon}
              />
            </div>
            {securityDepositRows?.map((row, index) => (
              <div key={index}>
                <div className={styles.ticketDetailsRow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Date & Time</label>
                    <div className={styles.inputRow}>
                      <button
                        type="button"
                        className={styles.contracticon}
                        onClick={() => securityDepositDateRefs.current[index]?.showPicker?.()}
                      >
                        <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                      </button>
                      <input
                        type="datetime-local"
                        ref={el => { securityDepositDateRefs.current[index] = el; }}
                        value={row.dateTime}
                        onChange={e => updateSecurityDepositRow(index, "dateTime", e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.securityDepositrow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Percentage</label>
                    <div className={styles.inputRow} style={{ opacity: row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00" ? 0.5 : 1 }}>
                      <button type="button" className={styles.contracticon}>
                        <Image src="/contracts-Icons/percent icon.svg" alt="Percent" width={20} height={20} />
                      </button>
                      <input
                        type="text"
                        placeholder="0"
                        value={row.percentage || "0"}
                        disabled={!!(row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00")}
                        onChange={e => {
                          const value = e.target.value;
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const parts = cleaned.split('.');
                          if (parts.length > 2) return;

                          let integerPart = parts[0] || '0';
                          let decimalPart = parts[1] || '';
                          integerPart = integerPart.replace(/^0+/, '') || '0';

                          if (decimalPart.length > 2) {
                            decimalPart = decimalPart.slice(0, 2);
                          }

                          let formattedValue = integerPart;
                          if (parts.length > 1) {
                            formattedValue += '.' + decimalPart;
                          }

                          const numericValue = parseFloat(formattedValue);
                          if (numericValue > 100) return;

                          updateSecurityDepositRow(index, "percentage", formattedValue);
                        }}
                        onBlur={e => {
                          const value = e.target.value || "0";
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const numericValue = parseFloat(cleaned) || 0;
                          const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                          updateSecurityDepositRow(index, "percentage", clampedValue.toString());
                        }}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Dollar Amount</label>
                    <div className={styles.inputRow} style={{ opacity: row.percentage && row.percentage !== "0" ? 0.5 : 1 }}>
                            <Image src="/contracts-Icons/Dollar sign.svg" alt="Dollar" width={24} height={24} />
                            <input
                                type="text"
                                placeholder="0.00"
                                value={row.dollarAmount || "0.00"}
                                disabled={!!(row.percentage && row.percentage !== "0")}
                                onChange={e => {
                                  const value = e.target.value;
                                  const cleaned = value.replace(/[^\d.]/g, '');
                                  const parts = cleaned.split('.');
                                  if (parts.length > 2) return;

                                  let integerPart = parts[0] || '0';
                                  integerPart = integerPart.replace(/^0+/, '') || '0';
                                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                                  let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '00';
                                  if (parts.length === 1 && !value.includes('.')) {
                                    decimalPart = '00';
                                  } else {
                                    decimalPart = decimalPart.padEnd(2, '0');
                                  }

                                  const formatted = `${formattedInteger}.${decimalPart}`;
                                  updateSecurityDepositRow(index, "dollarAmount", formatted);
                                }}
                                onBlur={e => {
                                  const value = e.target.value || "0.00";
                                  const cleaned = value.replace(/[^\d.]/g, '');
                                  const parts = cleaned.split('.');

                                  let integerPart = parts[0] || '0';
                                  integerPart = integerPart.replace(/^0+/, '') || '0';
                                  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                                  let decimalPart = parts[1] || '00';
                                  decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                                  const formatted = `${formattedInteger}.${decimalPart}`;
                                  updateSecurityDepositRow(index, "dollarAmount", formatted);
                                }}
                                className={styles.input}
                                required
                            />
                    </div>
                  </div>
                </div>
              </div>
              ))}
              <div className={styles.contractRow}>
                <div className={`${styles.contractInput} ${styles.addInput}`} style={{ opacity: isSecurityDeposit1Maxed ? 0.5 : 1 }}>
                  <button
                    type="button"
                    className={styles.contracticon}
                    onClick={addSecurityDepositRow}
                    disabled={isSecurityDeposit1Maxed}
                  >
                    <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
                  </button>
                  <input
                    type="text"
                    placeholder="Add"
                    className={styles.input}
                    readOnly
                    disabled={isSecurityDeposit1Maxed}
                  />
                </div>
              </div>
            
            <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
              Party 1 receives if canceled by:
            </label>
            {cancelParty1Rows?.map((row, index) => (
              <div key={index}>
                <div className={styles.ticketDetailsRow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Date & Time</label>
                    <div className={styles.inputRow}>
                      <button
                        type="button"
                        className={styles.contracticon}
                        onClick={() => cancelParty1DateRefs.current[index]?.showPicker?.()}
                      >
                        <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                      </button>
                      <input
                        type="datetime-local"
                        ref={el => { cancelParty1DateRefs.current[index] = el; }}
                        value={row.dateTime}
                        onChange={e => updateCancelParty1Row(index, "dateTime", e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.securityDepositrow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Percentage</label>
                    <div className={styles.inputRow} style={{ opacity: row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00" ? 0.5 : 1 }}>
                      <button type="button" className={styles.contracticon}>
                        <Image src="/contracts-Icons/percent icon.svg" alt="Percent" width={24} height={24} />
                      </button>
                      <input
                        type="text"
                        placeholder="0"
                        value={row.percentage || "0"}
                        disabled={!!(row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00")}
                        onChange={e => {
                          const value = e.target.value;
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const parts = cleaned.split('.');
                          if (parts.length > 2) return;

                          let integerPart = parts[0] || '0';
                          let decimalPart = parts[1] || '';
                          integerPart = integerPart.replace(/^0+/, '') || '0';

                          if (decimalPart.length > 2) {
                            decimalPart = decimalPart.slice(0, 2);
                          }

                          let formattedValue = integerPart;
                          if (parts.length > 1) {
                            formattedValue += '.' + decimalPart;
                          }

                          const numericValue = parseFloat(formattedValue);
                          if (numericValue > 100) return;

                          updateCancelParty1Row(index, "percentage", formattedValue);
                        }}
                        onBlur={e => {
                          const value = e.target.value || "0";
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const numericValue = parseFloat(cleaned) || 0;
                          const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                          updateCancelParty1Row(index, "percentage", clampedValue.toString());
                        }}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Dollar Amount</label>
                    <div className={styles.inputRow} style={{ opacity: row.percentage && row.percentage !== "0" ? 0.5 : 1 }}>
                            <Image src="/contracts-Icons/Dollar sign.svg" alt="Dollar" width={24} height={24} />
                              <input
                                  type="text"
                                  placeholder="0.00"
                                  value={row.dollarAmount || "0.00"}
                                  disabled={!!(row.percentage && row.percentage !== "0")}
                                  onChange={e => {
                                    const value = e.target.value;
                                    const cleaned = value.replace(/[^\d.]/g, '');
                                    const parts = cleaned.split('.');
                                    if (parts.length > 2) return;

                                    let integerPart = parts[0] || '0';
                                    integerPart = integerPart.replace(/^0+/, '') || '0';
                                    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                                    let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '00';
                                    if (parts.length === 1 && !value.includes('.')) {
                                      decimalPart = '00';
                                    } else {
                                      decimalPart = decimalPart.padEnd(2, '0');
                                    }

                                    const formatted = `${formattedInteger}.${decimalPart}`;
                                    updateCancelParty1Row(index, "dollarAmount", formatted);
                                  }}
                                  onBlur={e => {
                                    const value = e.target.value || "0.00";
                                    const cleaned = value.replace(/[^\d.]/g, '');
                                    const parts = cleaned.split('.');

                                    let integerPart = parts[0] || '0';
                                    integerPart = integerPart.replace(/^0+/, '') || '0';
                                    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                                    let decimalPart = parts[1] || '00';
                                    decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                                    const formatted = `${formattedInteger}.${decimalPart}`;
                                    updateCancelParty1Row(index, "dollarAmount", formatted);
                                  }}
                                  className={styles.input}
                                  required
                              />
                            </div>
                        </div>
                </div>
              </div>
              ))}
              <div className={styles.contractRow}>
                <div className={`${styles.contractInput} ${styles.addInput}`} style={{ opacity: isCancelParty1Maxed ? 0.5 : 1 }}>
                  <button
                    type="button"
                    className={styles.contracticon}
                    onClick={addCancelParty1Row}
                    disabled={isCancelParty1Maxed}
                  >
                    <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
                  </button>
                  <input
                    type="text"
                    placeholder="Add"
                    className={styles.input}
                    readOnly
                    disabled={isCancelParty1Maxed}
                  />
                </div>
              </div>
              </div>
              <div className={styles.ticketDetailsContainer}>
                  <div className={styles.infoLabelRow}>
                  <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
                  Security deposit Part 2
                  </label>
                  <Image
                      src="/contracts-Icons/Info.svg"
                      alt="Info"
                      width={20}
                      height={20}
                      className={styles.infoIcon}
                    />
                    </div>
                  {securityDeposit2Rows?.map((row, index) => (
                  <div key={index}>
                    <div className={styles.ticketDetailsRow}>
                      <div className={styles.datetime}>
                        <label className={styles.ticketsLabel}>Date & Time</label>
                        <div className={styles.inputRow}>
                            <button
                              type="button"
                              className={styles.contracticon}
                              onClick={() => securityDeposit2DateRefs.current[index]?.showPicker?.()}
                            >
                              <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                            </button>
                            <input
                              type="datetime-local"
                              ref={el => { securityDeposit2DateRefs.current[index] = el; }}
                              value={row.dateTime}
                              onChange={e => updateSecurityDeposit2Row(index, "dateTime", e.target.value)}
                              className={styles.input}
                              required
                            />
                        </div>
                      </div>
                    </div>
                    <div className={styles.securityDepositrow}>
                      <div className={styles.datetime}>
                        <label className={styles.ticketsLabel}>Percentage</label>
                        <div className={styles.inputRow} style={{ opacity: row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00" ? 0.5 : 1 }}>
                            <button type="button" className={styles.contracticon}>
                              <Image src="/contracts-Icons/percent icon.svg" alt="Percent" width={24} height={24} />
                            </button>
                            <input
                              type="text"
                              placeholder="0"
                              value={row.percentage || "0"}
                              disabled={!!(row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00")}
                              onChange={e => {
                                const value = e.target.value;
                                const cleaned = value.replace(/[^\d.]/g, '');
                                const parts = cleaned.split('.');
                                if (parts.length > 2) return;

                                let integerPart = parts[0] || '0';
                                let decimalPart = parts[1] || '';
                                integerPart = integerPart.replace(/^0+/, '') || '0';

                                if (decimalPart.length > 2) {
                                  decimalPart = decimalPart.slice(0, 2);
                                }

                                let formattedValue = integerPart;
                                if (parts.length > 1) {
                                  formattedValue += '.' + decimalPart;
                                }

                                const numericValue = parseFloat(formattedValue);
                                if (numericValue > 100) return;

                                updateSecurityDeposit2Row(index, "percentage", formattedValue);
                              }}
                              onBlur={e => {
                                const value = e.target.value || "0";
                                const cleaned = value.replace(/[^\d.]/g, '');
                                const numericValue = parseFloat(cleaned) || 0;
                                const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                                updateSecurityDeposit2Row(index, "percentage", clampedValue.toString());
                              }}
                              className={styles.input}
                              required
                            />
                        </div>
                      </div>
                      <div className={styles.datetime}>
                        <label className={styles.ticketsLabel}>Dollar Amount</label>
                        <div className={styles.inputRow} style={{ opacity: row.percentage && row.percentage !== "0" ? 0.5 : 1 }}>
                         <Image src="/contracts-Icons/Dollar sign.svg" alt="Dollar" width={24} height={24} />
                        <input
                        type="text"
                        placeholder="0.00"
                        value={row.dollarAmount || "0.00"}
                        disabled={!!(row.percentage && row.percentage !== "0")}
                        onChange={e => {
                          const value = e.target.value;
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const parts = cleaned.split('.');
                          if (parts.length > 2) return;

                          let integerPart = parts[0] || '0';
                          integerPart = integerPart.replace(/^0+/, '') || '0';
                          const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                          let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '00';
                          if (parts.length === 1 && !value.includes('.')) {
                            decimalPart = '00';
                          } else {
                            decimalPart = decimalPart.padEnd(2, '0');
                          }

                          const formatted = `${formattedInteger}.${decimalPart}`;
                          updateSecurityDeposit2Row(index, "dollarAmount", formatted);
                        }}
                        onBlur={e => {
                          const value = e.target.value || "0.00";
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const parts = cleaned.split('.');

                          let integerPart = parts[0] || '0';
                          integerPart = integerPart.replace(/^0+/, '') || '0';
                          const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                          let decimalPart = parts[1] || '00';
                          decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                          const formatted = `${formattedInteger}.${decimalPart}`;
                          updateSecurityDeposit2Row(index, "dollarAmount", formatted);
                        }}
                        className={styles.input}
                        required
                            />
                        </div>
                      </div>
                    </div>
                  </div>
          ))}
          <div className={styles.contractRow}>
            <div className={`${styles.contractInput} ${styles.addInput}`} style={{ opacity: isSecurityDeposit2Maxed ? 0.5 : 1 }}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={addSecurityDeposit2Row}
                disabled={isSecurityDeposit2Maxed}
              >
                <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
              </button>
              <input
                type="text"
                placeholder="Add"
                className={styles.input}
                readOnly
                disabled={isSecurityDeposit2Maxed}
              />
            </div>
          </div>
          <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
            Party 2 receives if canceled by:
          </label>
          {cancelParty2Rows?.map((row, index) => (
            <div key={index}>
              <div className={styles.ticketDetailsRow}>
                <div className={styles.datetime}>
                  <label className={styles.ticketsLabel}>Date & Time</label>
                  <div className={styles.inputRow}>
                    <button
                      type="button"
                      className={styles.contracticon}
                      onClick={() => cancelParty2DateRefs.current[index]?.showPicker?.()}
                    >
                      <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                    </button>
                    <input
                      type="datetime-local"
                      ref={el => { cancelParty2DateRefs.current[index] = el; }}
                      value={row.dateTime}
                      onChange={e => updateCancelParty2Row(index, "dateTime", e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className={styles.securityDepositrow}>
                <div className={styles.datetime}>
                  <label className={styles.ticketsLabel}>Percentage</label>
                  <div className={styles.inputRow} style={{ opacity: row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00" ? 0.5 : 1 }}>
                    <button type="button" className={styles.contracticon}>
                      <Image src="/contracts-Icons/percent icon.svg" alt="Percent" width={24} height={24} />
                    </button>
                    <input
                      type="text"
                      placeholder="0"
                      value={row.percentage || "0"}
                      disabled={!!(row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00")}
                      onChange={e => {
                        const value = e.target.value;
                        const cleaned = value.replace(/[^\d.]/g, '');
                        const parts = cleaned.split('.');
                        if (parts.length > 2) return;

                        let integerPart = parts[0] || '0';
                        let decimalPart = parts[1] || '';
                        integerPart = integerPart.replace(/^0+/, '') || '0';

                        if (decimalPart.length > 2) {
                          decimalPart = decimalPart.slice(0, 2);
                        }

                        let formattedValue = integerPart;
                        if (parts.length > 1) {
                          formattedValue += '.' + decimalPart;
                        }

                        const numericValue = parseFloat(formattedValue);
                        if (numericValue > 100) return;

                        updateCancelParty2Row(index, "percentage", formattedValue);
                      }}
                      onBlur={e => {
                        const value = e.target.value || "0";
                        const cleaned = value.replace(/[^\d.]/g, '');
                        const numericValue = parseFloat(cleaned) || 0;
                        const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                        updateCancelParty2Row(index, "percentage", clampedValue.toString());
                      }}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>
                <div className={styles.datetime}>
                  <label className={styles.ticketsLabel}>Dollar Amount</label>
                  <div className={styles.inputRow} style={{ opacity: row.percentage && row.percentage !== "0" ? 0.5 : 1 }}>
                    <Image src="/contracts-Icons/Dollar sign.svg" alt="Dollar" width={24} height={24} />
                    <input
                    type="text"
                    placeholder="0.00"
                    value={row.dollarAmount || "0.00"}
                    disabled={!!(row.percentage && row.percentage !== "0")}
                    onChange={e => {
                      const value = e.target.value;
                      const cleaned = value.replace(/[^\d.]/g, '');
                      const parts = cleaned.split('.');
                      if (parts.length > 2) return;

                      let integerPart = parts[0] || '0';
                      integerPart = integerPart.replace(/^0+/, '') || '0';
                      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                      let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '00';
                      if (parts.length === 1 && !value.includes('.')) {
                        decimalPart = '00';
                      } else {
                        decimalPart = decimalPart.padEnd(2, '0');
                      }

                      const formatted = `${formattedInteger}.${decimalPart}`;
                      updateCancelParty2Row(index, "dollarAmount", formatted);
                    }}
                    onBlur={e => {
                      const value = e.target.value || "0.00";
                      const cleaned = value.replace(/[^\d.]/g, '');
                      const parts = cleaned.split('.');

                      let integerPart = parts[0] || '0';
                      integerPart = integerPart.replace(/^0+/, '') || '0';
                      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                      let decimalPart = parts[1] || '00';
                      decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                      const formatted = `${formattedInteger}.${decimalPart}`;
                      updateCancelParty2Row(index, "dollarAmount", formatted);
                    }}
                    className={styles.input}
                    required
                />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.contractRow}>
            <div className={`${styles.contractInput} ${styles.addInput}`} style={{ opacity: isCancelParty2Maxed ? 0.5 : 1 }}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={addCancelParty2Row}
                disabled={isCancelParty2Maxed}
              >
                <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
              </button>
              <input
                type="text"
                placeholder="Add"
                className={styles.input}
                readOnly
                disabled={isCancelParty2Maxed}
              />
            </div>
          </div>
        </div>
          
        </>
      )}
    </div>
  );
};

export default MoneySection;