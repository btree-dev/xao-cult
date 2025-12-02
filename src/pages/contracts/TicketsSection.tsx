import React, { useRef } from "react";
import Image from "next/image";
import styles from "../../styles/CreateContract.module.css";

export interface TicketRow {
  ticketType: string;
  onSaleDate: string;
  numberOfTickets: string;
  ticketPrice: string;
}

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

  // Helper function to parse formatted numbers (remove commas)
  const parseFormattedNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Helper function to format currency with commas
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate values for a single ticket row
  const calculateTicketValues = (row: TicketRow, salesTaxPercent: number) => {
    const numberOfTickets = parseFormattedNumber(row.numberOfTickets);
    const ticketPrice = parseFormattedNumber(row.ticketPrice);
    const grossSub = numberOfTickets * ticketPrice;
    const taxes = (grossSub * salesTaxPercent) / 100;
    const gas = numberOfTickets * 1; // $1 per ticket
    const xaoFee = (grossSub * 2) / 100;
    const netTotal = grossSub + taxes + gas + xaoFee;

    return { grossSub, taxes, gas, xaoFee, netTotal };
  };

  // Calculate overall totals
  const calculateOverallTotals = () => {
    const salesTaxPercent = parseFormattedNumber(comps);
    let totalGrossSub = 0;
    let totalTaxes = 0;
    let totalGas = 0;
    let totalXaoFee = 0;

    ticketRows.forEach(row => {
      const { grossSub, taxes, gas, xaoFee } = calculateTicketValues(row, salesTaxPercent);
      totalGrossSub += grossSub;
      totalTaxes += taxes;
      totalGas += gas;
      totalXaoFee += xaoFee;
    });

    const totalNet = totalGrossSub + totalTaxes + totalGas + totalXaoFee;

    return {
      totalGrossSub,
      totalTaxes,
      totalGas,
      totalXaoFee,
      totalNet
    };
  };

  const salesTaxPercent = parseFormattedNumber(comps);
  const overallTotals = calculateOverallTotals();

  // Calculate total tickets used across all ticket types
  const getTotalTicketsUsed = () => {
    return ticketRows.reduce((total, row) => {
      return total + parseFormattedNumber(row.numberOfTickets);
    }, 0);
  };

  // Calculate remaining capacity
  const getRemainingCapacity = () => {
    const capacity = parseFormattedNumber(totalCapacity);
    const used = getTotalTicketsUsed();
    return Math.max(0, capacity - used);
  };

  // Check if capacity is full
  const isCapacityFull = () => {
    const capacity = parseFormattedNumber(totalCapacity);
    const used = getTotalTicketsUsed();
    return used >= capacity && capacity > 0;
  };

  const totalTicketsUsed = getTotalTicketsUsed();
  const remainingCapacity = getRemainingCapacity();
  const capacityFull = isCapacityFull();

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
        <div style={{
          opacity: isTicketEnabled ? 1 : 0.5,
          pointerEvents: isTicketEnabled ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}>
          <div className={styles.ticketsHeaderRow}>
            <div className={styles.toggleContainer} style={{ pointerEvents: 'auto' }}>
              <label className={styles.ticketsLabel}>Tickets</label>
              <input type="checkbox" className={styles.toggleSwitch} checked={isTicketEnabled} onChange={e => setticketsEnabled(e.target.checked)} />
            </div>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>
                Total Capacity
                
              </label>
              <div className={styles.contractInput}>
            
                  <Image src="/contracts-Icons/hash icon.svg" alt="hash" className={styles.contracticon} width={24} height={24} />
                
                <input
                  type="text"
                  placeholder="0"
                  value={totalCapacity || "0"}
                  onChange={e => {
                    const value = e.target.value;
                    // Remove all non-digit characters
                    const cleaned = value.replace(/[^\d]/g, '');

                    // Remove leading zeros but keep at least one zero
                    let formattedValue = cleaned.replace(/^0+/, '') || '0';

                    // Add commas for thousands
                    formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                    setTotalCapacity(formattedValue);
                  }}
                  onBlur={e => {
                    // Ensure proper format on blur
                    const value = e.target.value || "0";
                    const cleaned = value.replace(/[^\d]/g, '');
                    let formattedValue = cleaned.replace(/^0+/, '') || '0';
                    formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    setTotalCapacity(formattedValue);
                  }}
                  className={styles.input}
                  required
                />

              </div>
            </div>
            <div className={styles.ticketInputWrapper}>
              <label className={styles.ticketsLabel}>Sales Tax</label>
              <div className={styles.contractInput}>
                
                  <Image src="/contracts-Icons/percent icon.svg" alt="percent" className={styles.contracticon} width={20} height={20} />
                
                <input
                  type="text"
                  placeholder="0"
                  value={comps || "0"}
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

                    setComps(formattedValue);
                  }}
                  onBlur={e => {
                    // Ensure proper format on blur
                    const value = e.target.value || "0";
                    const cleaned = value.replace(/[^\d.]/g, '');
                    const numericValue = parseFloat(cleaned) || 0;

                    // Clamp between 0 and 100
                    const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                    setComps(clampedValue.toString());
                  }}
                  className={styles.input}
                  required
                />

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
                    <div
                      className={styles.dropdownMenu}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {["Comp", "Presale", "General Admission", "VIP", "Text input"].map(option => (
                        <div
                          key={option}
                          className={styles.dropdownOption}
                          onClick={(e) => {
                            e.stopPropagation();
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
                      type="datetime-local"
                      ref={el => { onSaleDateRefs.current[index] = el; }}
                      value={row.onSaleDate}
                      onChange={e => updateTicketRow(index, "onSaleDate", e.target.value)}
                      className={styles.input}
                      step="60"
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
                    <input
                      type="text"
                      placeholder="0"
                      value={row.numberOfTickets || "0"}
                      onChange={e => {
                        const value = e.target.value;
                        // Remove all non-digit characters
                        const cleaned = value.replace(/[^\d]/g, '');

                        // Remove leading zeros but keep at least one zero
                        let numericValue = parseInt(cleaned.replace(/^0+/, '') || '0');

                        // Calculate total capacity and current usage (excluding this row)
                        const capacity = parseFormattedNumber(totalCapacity);
                        const otherTicketsUsed = ticketRows.reduce((total, r, i) => {
                          if (i !== index) {
                            return total + parseFormattedNumber(r.numberOfTickets);
                          }
                          return total;
                        }, 0);

                        // Check if the new value would exceed capacity
                        if (numericValue + otherTicketsUsed > capacity && capacity > 0) {
                          // Cap at remaining capacity
                          numericValue = Math.max(0, capacity - otherTicketsUsed);
                        }

                        // Format with commas
                        let formattedValue = numericValue.toString();
                        formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                        updateTicketRow(index, "numberOfTickets", formattedValue);
                      }}
                      onBlur={e => {
                        // Ensure proper format on blur
                        const value = e.target.value || "0";
                        const cleaned = value.replace(/[^\d]/g, '');
                        let numericValue = parseInt(cleaned.replace(/^0+/, '') || '0');

                        // Validate against capacity
                        const capacity = parseFormattedNumber(totalCapacity);
                        const otherTicketsUsed = ticketRows.reduce((total, r, i) => {
                          if (i !== index) {
                            return total + parseFormattedNumber(r.numberOfTickets);
                          }
                          return total;
                        }, 0);

                        if (numericValue + otherTicketsUsed > capacity && capacity > 0) {
                          numericValue = Math.max(0, capacity - otherTicketsUsed);
                        }

                        let formattedValue = numericValue.toString();
                        formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        updateTicketRow(index, "numberOfTickets", formattedValue);
                      }}
                      className={styles.input}
                      required
                    />

                  </div>
                </div>
                <div className={styles.ticketColumn}>
                  <label className={styles.ticketColumnLabel}>Ticket price</label>
                  <div className={styles.contractInput}>
            
                      <Image src="/contracts-Icons/Dollar sign.svg" alt="dollar" className={styles.contracticon} width={24} height={24} />
               
                    <input
                      type="text"
                      placeholder="00.00"
                      value={row.ticketPrice || "00.00"}
                      onChange={e => {
                        const value = e.target.value;
                        // Remove all non-digit characters except the decimal point
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
                        updateTicketRow(index, "ticketPrice", formatted);
                      }}
                      onBlur={e => {
                        // Ensure proper format on blur
                        const value = e.target.value || "00.00";
                        const cleaned = value.replace(/[^\d.]/g, '');
                        const parts = cleaned.split('.');

                        let integerPart = parts[0] || '0';
                        integerPart = integerPart.replace(/^0+/, '') || '0';
                        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                        let decimalPart = parts[1] || '00';
                        decimalPart = decimalPart.slice(0, 2).padEnd(2, '0');

                        const formatted = `${formattedInteger}.${decimalPart}`;
                        updateTicketRow(index, "ticketPrice", formatted);
                      }}
                      className={styles.input}
                      required
                    />

                  </div>
                </div>
              </div>

              {/* Calculation Summary for each ticket */}
              <div className={styles.ticketSummary}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Gross Sub:</span>
                  <span className={styles.summaryValue}>₵{formatCurrency(calculateTicketValues(row, salesTaxPercent).grossSub)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Taxes:</span>
                  <span className={styles.summaryValue}>₵{formatCurrency(calculateTicketValues(row, salesTaxPercent).taxes)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Gas:</span>
                  <span className={styles.summaryValue}>₵{formatCurrency(calculateTicketValues(row, salesTaxPercent).gas)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Xao&apos;s 2%:</span>
                  <span className={styles.summaryValue}>₵{formatCurrency(calculateTicketValues(row, salesTaxPercent).xaoFee)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Net Total:</span>
                  <span className={styles.summaryValue}>₵{formatCurrency(calculateTicketValues(row, salesTaxPercent).netTotal)}</span>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.contractRow}>
            <div className={`${styles.contractInput} ${styles.addInput}`}>
              <button
                type="button"
                className={styles.contracticon}
                onClick={addTicketRow}
                disabled={capacityFull}
                style={{
                  opacity: capacityFull ? 0.5 : 1,
                  cursor: capacityFull ? 'not-allowed' : 'pointer'
                }}
                title={capacityFull ? 'Capacity full. Increase Total Capacity to add more ticket types.' : 'Add ticket type'}
              >
                <Image src="/contracts-Icons/Add_Plus.svg" alt="add" width={24} height={24} />
              </button>
              <input
                type="text"
                placeholder={capacityFull ? "Capacity Full" : "Add"}
                className={styles.input}
                readOnly
                style={{ opacity: capacityFull ? 0.5 : 1 }}
              />
            </div>
          </div>
          {/* Overall Totals Summary */}
          <div className={styles.ticketSummary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Gross Total:</span>
              <span className={styles.summaryValue}>₵{formatCurrency(overallTotals.totalGrossSub)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Taxes:</span>
              <span className={styles.summaryValue}>₵{formatCurrency(overallTotals.totalTaxes)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Gas:</span>
              <span className={styles.summaryValue}>₵{formatCurrency(overallTotals.totalGas)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Xao&apos;s 2%:</span>
              <span className={styles.summaryValue}>₵{formatCurrency(overallTotals.totalXaoFee)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Net Total:</span>
              <span className={styles.summaryValue}>₵{formatCurrency(overallTotals.totalNet)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsSection;