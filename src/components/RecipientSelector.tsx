import React, { useState } from "react";

interface RecipientSelectorProps {
  onRecipientSelect: (inboxId: string) => void;
}

const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  onRecipientSelect,
}) => {
  const [recipientInput, setRecipientInput] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleSaveRecipient = () => {
    if (recipientInput.trim()) {
      localStorage.setItem("chatRecipientInboxId", recipientInput);
      onRecipientSelect(recipientInput);
      setShowModal(false);
      setRecipientInput("");
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: "8px 16px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginTop: "10px",
        }}
      >
        Set Chat Recipient
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h2>Set Chat Recipient</h2>
            <p>
              Enter the XMTP inbox ID of the person you want to chat with.
            </p>
            <input
              type="text"
              placeholder="Enter recipient XMTP inbox ID"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleSaveRecipient}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecipientSelector;
