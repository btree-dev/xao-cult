/**
 * Contract Proposal Message Type
 *
 * Used for sending contract proposals through XMTP chat.
 * Enables negotiation flow between Party1 and Party2.
 */

import { IContract } from "../backend/services/types/api";

export const CONTRACT_MESSAGE_VERSION = 1;

export interface ContractProposalMessage {
  type: "contract-proposal";
  version: number;
  data: Partial<IContract>;
  sentAt: number;
  proposedBy: string;
  revisionNumber: number;
}

/**
 * Type guard to check if a message content is a contract proposal
 */
export function isContractProposal(
  content: unknown
): content is ContractProposalMessage {
  return (
    typeof content === "object" &&
    content !== null &&
    (content as ContractProposalMessage).type === "contract-proposal" &&
    typeof (content as ContractProposalMessage).version === "number" &&
    typeof (content as ContractProposalMessage).data === "object"
  );
}

/**
 * Factory function to create a contract proposal message
 */
export function createContractProposal(
  contractData: Partial<IContract>,
  senderAddress: string,
  revisionNumber: number = 1
): ContractProposalMessage {
  return {
    type: "contract-proposal",
    version: CONTRACT_MESSAGE_VERSION,
    data: contractData,
    sentAt: Date.now(),
    proposedBy: senderAddress,
    revisionNumber,
  };
}
