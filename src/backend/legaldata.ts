// data/legalDocs.ts
export const legalDocs = [
  {
    id:'termsservices',
    title: "Terms of Service",
    description: "Read our terms and conditions",
    icon: "/Legal/CopyIcon.svg", 
    intro: "Welcome to Xao. By accessing or using this application, you agree to the following terms:",
    information: [
      {
        heading: "Use of the App",
        content:
          "You may use Xao only for lawful purposes. You agree not to misuse, reverse-engineer, or exploit any part of the platform.",
      },
      {
        heading: "Account Responsibility",
        content:
          "You are responsible for securing your wallet and any associated credentials. Xao is not liable for unauthorized access resulting from compromised accounts.",
      },
      {
        heading: "Content & Ownership",
        content:
          "All content, trademarks, and visuals in the app belong to their respective owners. You may not copy, reuse, or redistribute without permission.",
      },
      {
        heading: "Limitation of Liability",
        content:
          "Xao provides services 'as is' with no guarantees. We are not liable for losses related to contracts, payments, or system outages.",
      },
      {
        heading: "Modifications",
        content:
          "We may update these terms at any time. Continued use of the app after updates means you accept the new terms.",
      },
    ],
  },
  { id:'privacypolicy',
    title: "Privacy Policy",
    description: "Learn how we handle your data",
    icon: "/Legal/lockIcon.svg",
    intro:" ",
    information:[],
  },
  { id:'contract',
    title: "Smart Contract Disclaimer",
    description: "Information about smart contracts",
    icon: "/Legal/smartcontract.svg",
    intro:" ",
    information:[],
  },
];
