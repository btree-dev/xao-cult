import styles from "../../styles/ticketAuthenticate.module.css";

export default function TicketAuthentication() {
  return (
    <div className={styles.authenticateContainer}>
      <div className={styles.authenticateContent}>
        <h2 className={styles.authenticateTitle}>Authenticate Ticket</h2>
        <p className={styles.authenticateDescription}>
          Verify and authenticate your ticket information
        </p>

        <div className={styles.authenticateForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ticket ID</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Enter ticket ID"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Verification Code</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Enter verification code"
            />
          </div>

          <button className={styles.authenticateButton}>
            Authenticate Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
