import React, { useRef } from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";



export interface PaymentRow {
  dateTime: string;
  percentage: string;
  dollarAmount: string;
}

export interface PaymentsProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  party1Rows: PaymentRow[];
  addParty1Row: () => void;
  updateParty1Row: (index: number, field: keyof PaymentRow, value: string) => void;
  party2Rows: PaymentRow[];
  addParty2Row: () => void;
  updateParty2Row: (index: number, field: keyof PaymentRow, value: string) => void;
}

const PaymentsSection: React.FC<PaymentsProps> = ({
  isOpen,
  onToggle,
  activeDropdown,
  setActiveDropdown,
  party1Rows,
  addParty1Row,
  updateParty1Row,
  party2Rows,
  addParty2Row,
  updateParty2Row,
}) => {

  const party1DateRefs = useRef<(HTMLInputElement | null)[]>([]);
  const party2DateRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate total percentage for each party
  const calculateTotalPercentage = (rows: PaymentRow[]) => {
    if (!rows || !Array.isArray(rows)) return 0;
    return rows.reduce((total, row) => {
      const percentage = parseFloat(row.percentage) || 0;
      return total + percentage;
    }, 0);
  };

  const party1Total = calculateTotalPercentage(party1Rows);
  const party2Total = calculateTotalPercentage(party2Rows);

  const isParty1Maxed = party1Total >= 100;
  const isParty2Maxed = party2Total >= 100;

  return (
    <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
      <div
        className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        {isOpen ? (
          <div className={styles.infoLabelRow}>
            <label className={`${styles.centeredLabel} ${styles.open}`}>Pay Outs</label>
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
            <label className={`${styles.label} ${styles.open}`}>Pay Outs</label>
            <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
          </>
        )}
      </div>
      {isOpen && (
        <>
          
            <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>Party 1</label>
            {party1Rows?.map((row, index) => (
              <div key={index}>
                <div className={styles.ticketDetailsRow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Date & Time</label>
                    <div className={styles.inputRow}>
                      <button
                        type="button"
                        className={styles.contracticon}
                        onClick={() => party1DateRefs.current[index]?.showPicker?.()}
                      >
                        <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                      </button>
                      <input
                        type="datetime-local"
                        ref={el => { party1DateRefs.current[index] = el; }}
                        value={row.dateTime}
                        onChange={e => updateParty1Row(index, "dateTime", e.target.value)}
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

                          updateParty1Row(index, "percentage", formattedValue);
                        }}
                        onBlur={e => {
                          const value = e.target.value || "0";
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const numericValue = parseFloat(cleaned) || 0;
                          const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                          updateParty1Row(index, "percentage", clampedValue.toString());
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
                          updateParty1Row(index, "dollarAmount", formatted);
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
                          updateParty1Row(index, "dollarAmount", formatted);
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
              <div className={`${styles.contractInput} ${styles.addInput}`} style={{ opacity: isParty1Maxed ? 0.5 : 1 }}>
                <button
                  type="button"
                  className={styles.contracticon}
                  onClick={addParty1Row}
                  disabled={isParty1Maxed}
                >
                  <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  className={styles.input}
                  readOnly
                  disabled={isParty1Maxed}
                />
              </div>
            </div>
         
          
            <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>Party 2</label>
            {party2Rows?.map((row, index) => (
              <div key={index}>
                <div className={styles.ticketDetailsRow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Date & Time</label>
                    <div className={styles.inputRow}>
                      <button
                        type="button"
                        className={styles.contracticon}
                        onClick={() => party2DateRefs.current[index]?.showPicker?.()}
                      >
                        <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                      </button>
                      <input
                        type="datetime-local"
                        ref={el => { party2DateRefs.current[index] = el; }}
                        value={row.dateTime}
                        onChange={e => updateParty2Row(index, "dateTime", e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.securityDepositrow}>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Percentage</label>
                    <div className={styles.contractInput} style={{ opacity: row.dollarAmount && row.dollarAmount !== "0" && row.dollarAmount !== "0.00" ? 0.5 : 1 }}>
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

                          updateParty2Row(index, "percentage", formattedValue);
                        }}
                        onBlur={e => {
                          const value = e.target.value || "0";
                          const cleaned = value.replace(/[^\d.]/g, '');
                          const numericValue = parseFloat(cleaned) || 0;
                          const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                          updateParty2Row(index, "percentage", clampedValue.toString());
                        }}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.datetime}>
                    <label className={styles.ticketsLabel}>Dollar Amount</label>
                    <div className={styles.contractInput} style={{ opacity: row.percentage && row.percentage !== "0" ? 0.5 : 1 }}>
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
                          updateParty2Row(index, "dollarAmount", formatted);
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
                          updateParty2Row(index, "dollarAmount", formatted);
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
              <div className={`${styles.contractInput} ${styles.addInput}`} style={{ opacity: isParty2Maxed ? 0.5 : 1 }}>
                <button
                  type="button"
                  className={styles.contracticon}
                  onClick={addParty2Row}
                  disabled={isParty2Maxed}
                >
                  <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="Add"
                  className={styles.input}
                  readOnly
                  disabled={isParty2Maxed}
                />
              </div>
            </div>
        
        </>
      )}
    </div>
  );
};

export default PaymentsSection;