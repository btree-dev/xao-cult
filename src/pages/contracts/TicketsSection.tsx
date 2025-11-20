import React, { useRef } from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

export interface TicketRow {
  ticketType: string;
  onSaleDate: string;
  numberOfTickets: string;
  ticketPrice: string;
}

const dropdownOptions = ["Option 1", "Option 2", "Option 3"];

export interface TicketsProps {
  isOpen: boolean;
  onToggle: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  isTicketEnabled: boolean;
  setticketsEnabled: (v: boolean) => void;
  totalCapacity: string;
  setTotalCapacity: (v: string) => void;
  comps: string;
  setComps: (v: string) => void;
  ticketRows: TicketRow[];
  addTicketRow: () => void;
  updateTicketRow: (index: number, field: keyof TicketRow, value: string) => void;
}

const TicketsSection: React.FC<TicketsProps> = ({
  isOpen,
  onToggle,
  activeDropdown,
  setActiveDropdown,
  isTicketEnabled,
  setticketsEnabled,
  totalCapacity,
  setTotalCapacity,
  comps,
  setComps,
  ticketRows,
  addTicketRow,
  updateTicketRow,
}) => {
  // Create refs for each ticket row's On Sale Date input
  const onSaleDateRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className={`${styles.docContainer} ${isOpen ? styles.open : styles.closed}`}>
      <div
        className={`${styles.datesTimesHeader} ${isOpen ? styles.open : ''}`}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <label className={`${styles.label} ${isOpen ? styles.open : ''}`}>Tickets</label>
        {!isOpen && (
          <Image src="/contracts-Icons/Dropdown.svg" alt="Dropdown" width={24} height={24} className={styles.dropdownIcon} />
        )}
      </div>
      {isOpen && (
        <>
          <div className={styles.ticketsHeaderRow}>
            <div className={styles.toggleContainer}>
              <label className={styles.ticketsLabel}>Tickets</label>
              <input type="checkbox" className={styles.toggleSwitch} checked={isTicketEnabled} onChange={e => setticketsEnabled(e.target.checked)} />
            </div>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Total Capacity</label>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image src="/contracts-Icons/hash icon.svg" alt="hash" width={24} height={24} />
                </button>
                <input type="text" placeholder="Total Capacity" value={totalCapacity} onChange={e => setTotalCapacity(e.target.value)} className={styles.input} required />
                
              </div>
            </div>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Sales Tax</label>
              <div className={styles.contractInput}>
                <button type="button" className={styles.contracticon}>
                  <Image src="/contracts-Icons/percent icon.svg" alt="percent" width={24} height={24} />
                </button>
                <input type="text" placeholder="Sales Tax %" value={comps} onChange={e => setComps(e.target.value)} className={styles.input} required />
                
              </div>
            </div>
          </div>
          {ticketRows.map((row, index) => (
            <div key={index} className={styles.ticketDetailsContainer}>
              <div className={styles.ticketDetailsRow}>
                <div className={styles.ticketColumn}>
                <label className={styles.ticketColumnLabel}>Ticket Type</label>
                <div className={styles.contractInput}>
                  <input
                    type="text"
                    className={styles.input}
                    value={row.ticketType || ""}
                    readOnly
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === `ticketType-${index}` ? null : `ticketType-${index}`
                      )
                    }
                    placeholder="Ticket Type"
                    style={{ cursor: "pointer" }}
                  />
                  <Image
                    src="/contracts-Icons/Dropdown.svg"
                    alt="Dropdown"
                    width={20}
                    height={20}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === `ticketType-${index}` ? null : `ticketType-${index}`
                      )
                    }
                  />
                  {activeDropdown === `ticketType-${index}` && (
                    <div className={styles.dropdownMenu}>
                      {["Comp", "Presale", "General Admission", "VIP", "Text input"].map(option => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={() => {
                            updateTicketRow(index, "ticketType", option);
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
                    <button
                      type="button"
                      className={styles.contracticon}
                      onClick={() => onSaleDateRefs.current[index]?.showPicker?.()}
                    >
                      <Image src="/contracts-Icons/Calendar.svg" alt="Calendar" width={20} height={20} />
                    </button>
                    <input
                      type="date"
                      ref={el => { onSaleDateRefs.current[index] = el; }}
                      value={row.onSaleDate}
                      onChange={e => updateTicketRow(index, "onSaleDate", e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className={styles.ticketDetailsRow}>
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>Number of tickets</label>
                  <div className={styles.contractInput}>
                    <button type="button" className={styles.contracticon}>
                      <Image src="/contracts-Icons/hash icon.svg" alt="hash" width={20} height={20} />
                    </button>
                    <input type="text" placeholder="500" value={row.numberOfTickets} onChange={e => updateTicketRow(index, "numberOfTickets", e.target.value)} className={styles.input} required />
                    
                  </div>
                </div>
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>Ticket price</label>
                  <div className={styles.contractInput}>
                    <button type="button" className={styles.contracticon}>
                      <Image src="/contracts-Icons/Dollar sign.svg" alt="dollar" width={20} height={20} />
                    </button>
                    <input type="text" placeholder="50.00" value={row.ticketPrice} onChange={e => updateTicketRow(index, "ticketPrice", e.target.value)} className={styles.input} required />
                    
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.contractRow}>
            <div className={`${styles.contractInput} ${styles.addInput}`}>
              <button type="button" className={styles.contracticon} onClick={addTicketRow}>
                <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
              </button>
              <input type="text" placeholder="Add" className={styles.input} readOnly />
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
              <span className={styles.summaryLabel}>Xao&apos;s 2%:</span>
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
  );
};

export default TicketsSection;