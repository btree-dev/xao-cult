import React from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

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
}) => (
  <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      <label className={`${styles.label} ${isOpen ? styles.open : ''}`}>Payments</label>
      {!isOpen && (
        <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
      )}
    </div>
    {isOpen && (
      <>
        <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>Party 1</label>
        {party1Rows.map((row, index) => (
          <div key={index} className={styles.ticketDetailsRow}>
            <div className={styles.ticketColumn}>
              <label className={styles.ticketColumnLabel}>Date & Time</label>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="Date and time"
                  value={row.dateTime}
                  onChange={e => updateParty1Row(index, "dateTime", e.target.value)}
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
                      activeDropdown === `party1DateTime-${index}` ? null : `party1DateTime-${index}`
                    )
                  }
                />
                {activeDropdown === `party1DateTime-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateParty1Row(index, "dateTime", option);
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
                  <Image src="/contracts-Icons/Percent icon.svg" alt="percent" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  value={row.percentage}
                  onChange={e => updateParty1Row(index, "percentage", e.target.value)}
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
                      activeDropdown === `party1Percentage-${index}` ? null : `party1Percentage-${index}`
                    )
                  }
                />
                {activeDropdown === `party1Percentage-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateParty1Row(index, "percentage", option);
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
                <Image src="/contracts-Icons/Dollar sign.svg" alt="Dollar" width={24} height={24} />
                <input
                  type="text"
                  placeholder="$ 500"
                  value={row.dollarAmount}
                  onChange={e => updateParty1Row(index, "dollarAmount", e.target.value)}
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
                      activeDropdown === `party1DollarAmount-${index}` ? null : `party1DollarAmount-${index}`
                    )
                  }
                />
                {activeDropdown === `party1DollarAmount-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateParty1Row(index, "dollarAmount", option);
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
        ))}
        <div className={styles.contractRow}>
          <div className={`${styles.contractInput} ${styles.addInput}`}>
            <button type="button" className={styles.contracticon} onClick={addParty1Row}>
              <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
            </button>
            <input
              type="text"
              placeholder="Add"
              className={styles.input}
              readOnly
            />
          </div>
        </div>
        <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>Party 2</label>
        {party2Rows.map((row, index) => (
          <div key={index} className={styles.ticketDetailsRow}>
            <div className={styles.ticketColumn}>
              <label className={styles.ticketColumnLabel}>Date & Time</label>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="Date and time"
                  value={row.dateTime}
                  onChange={e => updateParty2Row(index, "dateTime", e.target.value)}
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
                      activeDropdown === `party2DateTime-${index}` ? null : `party2DateTime-${index}`
                    )
                  }
                />
                {activeDropdown === `party2DateTime-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateParty2Row(index, "dateTime", option);
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
                  <Image src="/contracts-Icons/Percent icon.svg" alt="percent" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  value={row.percentage}
                  onChange={e => updateParty2Row(index, "percentage", e.target.value)}
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
                      activeDropdown === `party2Percentage-${index}` ? null : `party2Percentage-${index}`
                    )
                  }
                />
                {activeDropdown === `party2Percentage-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateParty2Row(index, "percentage", option);
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
                <Image src="/contracts-Icons/Dollar sign.svg" alt="Dollar" width={24} height={24} />
                <input
                  type="text"
                  placeholder="$ 500"
                  value={row.dollarAmount}
                  onChange={e => updateParty2Row(index, "dollarAmount", e.target.value)}
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
                      activeDropdown === `party2DollarAmount-${index}` ? null : `party2DollarAmount-${index}`
                    )
                  }
                />
                {activeDropdown === `party2DollarAmount-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateParty2Row(index, "dollarAmount", option);
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
        ))}
        <div className={styles.contractRow}>
          <div className={`${styles.contractInput} ${styles.addInput}`}>
            <button type="button" className={styles.contracticon} onClick={addParty2Row}>
              <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
            </button>
            <input
              type="text"
              placeholder="Add"
              className={styles.input}
              readOnly
            />
          </div>
        </div>
      </>
    )}
  </div>
);

export default PaymentsSection;