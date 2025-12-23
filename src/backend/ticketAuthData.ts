export interface TicketAuthInfo {
  label: string;
  value: string;
  icon: string;
}

export const ticketAuthData: TicketAuthInfo[] = [
  {
    label: "Username",
    value: "@xao_vortex33",
    icon: "/Ticket-Auth_Icons/User_01.svg",
  },
  {
    label: "Wallet",
    value: "0xA17c9e7f8B2D...",
    icon: "/Ticket-Auth_Icons/Frame.svg",
  },
  {
    label: "Wallet DID (Decentralized Identifier)",
    value: "did:xao:ebcbf91c...",
    icon: "/Ticket-Auth_Icons/Frame.svg",
  },
  {
    label: "ActivityPub URL",
    value: "https://social.xao.io/users/xao_vortex33",
    icon: "/Ticket-Auth_Icons/Globe.svg",
  },
  {
    label: "Xao URL",
    value: "https://xao.app/u/xao_vortex33",
    icon: "/Ticket-Auth_Icons/Globe.svg",
  },
];
