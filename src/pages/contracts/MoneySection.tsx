import React from "react";
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
}) => (
  <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
    <div
      className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      <label className={`${styles.label} ${isOpen ? styles.open : ''}`}>Money</label>
      {!isOpen && (
        <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
      )}
    </div>
    {isOpen && (
      <>
        <div className={styles.ticketDetailsContainer}>
          <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
            Security deposit Party 1
          </label>
          {securityDepositRows.map((row, index) => (
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
                    onChange={e => updateSecurityDepositRow(index, "dateTime", e.target.value)}
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
                        activeDropdown === `securityDateTime-${index}` ? null : `securityDateTime-${index}`
                      )
                    }
                  />
                  {activeDropdown === `securityDateTime-${index}` && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map(option => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            updateSecurityDepositRow(index, "dateTime", option);
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
                    <Image src="/contracts-Icons/Percent icon.svg" alt="Percent" width={24} height={24} />
                  </button>
                  <input
                    type="text"
                    placeholder="30%"
                    value={row.percentage}
                    onChange={e => updateSecurityDepositRow(index, "percentage", e.target.value)}
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
                      setActiveDropdown(activeDropdown === `securityPercentage-${index}` ? null : `securityPercentage-${index}`)
                    }
                  />
                  {activeDropdown === `securityPercentage-${index}` && (
                    <div className={styles.dropdownMenu}>
                      {dropdownOptions.map(option => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            updateSecurityDepositRow(index, "percentage", option);
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
                    onChange={e => updateSecurityDepositRow(index, "dollarAmount", e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
          <div className={styles.contractRow}>
            <div className={`${styles.contractInput} ${styles.addInput}`}>
              <button type="button" className={styles.contracticon} onClick={addSecurityDepositRow}>
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
        
        <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
          Party 1 receives if canceled by:
        </label>
        {cancelParty1Rows.map((row, index) => (
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
                  onChange={e => updateCancelParty1Row(index, "dateTime", e.target.value)}
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
                      activeDropdown === `cancelParty1DateTime-${index}` ? null : `cancelParty1DateTime-${index}`
                    )
                  }
                />
                {activeDropdown === `cancelParty1DateTime-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateCancelParty1Row(index, "dateTime", option);
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
                  <Image src="/contracts-Icons/Percent icon.svg" alt="Percent" width={24} height={24} />
                </button>
                <input
                  type="text"
                  placeholder="30%"
                  value={row.percentage}
                  onChange={e => updateCancelParty1Row(index, "percentage", e.target.value)}
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
                    setActiveDropdown(activeDropdown === `cancelParty1Percentage-${index}` ? null : `cancelParty1Percentage-${index}`)
                  }
                />
                {activeDropdown === `cancelParty1Percentage-${index}` && (
                  <div className={styles.dropdownMenu}>
                    {dropdownOptions.map(option => (
                      <div
                        key={option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          updateCancelParty1Row(index, "percentage", option);
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
                  onChange={e => updateCancelParty1Row(index, "dollarAmount", e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>
          </div>
        ))}
        <div className={styles.contractRow}>
          <div className={`${styles.contractInput} ${styles.addInput}`}>
            <button type="button" className={styles.contracticon} onClick={addCancelParty1Row}>
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
        </div>
        <div className={styles.ticketDetailsContainer}>
    <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
      Security deposit Part 2
    </label>
    {securityDeposit2Rows.map((row, index) => (
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
              onChange={e => updateSecurityDeposit2Row(index, "dateTime", e.target.value)}
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
                  activeDropdown === `security2DateTime-${index}` ? null : `security2DateTime-${index}`
                )
              }
            />
            {activeDropdown === `security2DateTime-${index}` && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div
                    key={option}
                    className={styles.dropdownOption}
                    onClick={() => {
                      updateSecurityDeposit2Row(index, "dateTime", option);
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
              <Image src="/contracts-Icons/Percent icon.svg" alt="Percent" width={24} height={24} />
            </button>
            <input
              type="text"
              placeholder="30%"
              value={row.percentage}
              onChange={e => updateSecurityDeposit2Row(index, "percentage", e.target.value)}
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
                setActiveDropdown(activeDropdown === `security2Percentage-${index}` ? null : `security2Percentage-${index}`)
              }
            />
            {activeDropdown === `security2Percentage-${index}` && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div
                    key={option}
                    className={styles.dropdownOption}
                    onClick={() => {
                      updateSecurityDeposit2Row(index, "percentage", option);
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
              onChange={e => updateSecurityDeposit2Row(index, "dollarAmount", e.target.value)}
              className={styles.input}
              required
            />
          </div>
        </div>
      </div>
    ))}
    <div className={styles.contractRow}>
      <div className={`${styles.contractInput} ${styles.addInput}`}>
        <button type="button" className={styles.contracticon} onClick={addSecurityDeposit2Row}>
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
    {/* Party 2 receives if canceled by */}
    <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
      Party 2 receives if canceled by:
    </label>
    {cancelParty2Rows.map((row, index) => (
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
              onChange={e => updateCancelParty2Row(index, "dateTime", e.target.value)}
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
                  activeDropdown === `cancelParty2DateTime-${index}` ? null : `cancelParty2DateTime-${index}`
                )
              }
            />
            {activeDropdown === `cancelParty2DateTime-${index}` && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div
                    key={option}
                    className={styles.dropdownOption}
                    onClick={() => {
                      updateCancelParty2Row(index, "dateTime", option);
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
              <Image src="/contracts-Icons/Percent icon.svg" alt="Percent" width={24} height={24} />
            </button>
            <input
              type="text"
              placeholder="30%"
              value={row.percentage}
              onChange={e => updateCancelParty2Row(index, "percentage", e.target.value)}
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
                setActiveDropdown(activeDropdown === `cancelParty2Percentage-${index}` ? null : `cancelParty2Percentage-${index}`)
              }
            />
            {activeDropdown === `cancelParty2Percentage-${index}` && (
              <div className={styles.dropdownMenu}>
                {dropdownOptions.map(option => (
                  <div
                    key={option}
                    className={styles.dropdownOption}
                    onClick={() => {
                      updateCancelParty2Row(index, "percentage", option);
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
              onChange={e => updateCancelParty2Row(index, "dollarAmount", e.target.value)}
              className={styles.input}
              required
            />
          </div>
        </div>
      </div>
    ))}
    <div className={styles.contractRow}>
      <div className={`${styles.contractInput} ${styles.addInput}`}>
        <button type="button" className={styles.contracticon} onClick={addCancelParty2Row}>
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
  </div>
        <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
          Guarantee $
        </label>
        <div className={styles.contractRow}>
          <div className={styles.contractInput}>
            <Image src="/contracts-Icons/calendar.svg" alt="moneyInput" width={24} height={24} />
            <input
              type="text"
              placeholder="30%"
              value={guaranteeInput}
              onChange={e => setguaranteeInput(e.target.value)}
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
                {dropdownOptions.map(option => (
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
            <input type="text" placeholder="$ 500" className={styles.input} readOnly />
          </div>
        </div>
        <label className={`${styles.LeftLabel} ${isOpen ? styles.open : ''}`}>
          Backend
        </label>
        <div className={styles.contractRow}>
          <div className={styles.contractInput}>
            <button type="button" className={styles.contracticon}>
              <Image src="/contracts-Icons/calendar.svg" alt="moneyInput" width={24} height={24} />
            </button>
            <input
              type="text"
              placeholder="30%"
              value={backendInput}
              onChange={e => setBackendInput(e.target.value)}
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
                {dropdownOptions.map(option => (
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
            <input type="text" placeholder="$ 500" className={styles.input} readOnly />
          </div>
        </div>
        <div className={styles.contractRow}>
          <div className={styles.ticketColumn}>
            <label className={styles.ticketColumnLabel}>Bar Split</label>
            <div className={styles.contractInput}>
              <button type="button" className={styles.contracticon}>
                <Image src="/contracts-Icons/Percent icon.svg" alt="percent" width={24} height={24} />
              </button>
              <input
                type="text"
                placeholder="30%"
                value={barsplitInput}
                onChange={e => setBarsplitInput(e.target.value)}
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
                  {dropdownOptions.map(option => (
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
                <Image src="/contracts-Icons/Percent icon.svg" alt="percent" width={24} height={24} />
              </button>
              <input
                type="text"
                placeholder="30%"
                value={merchSplitInput}
                onChange={e => setMerchSplitInput(e.target.value)}
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
                  {dropdownOptions.map(option => (
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
);

export default MoneySection;