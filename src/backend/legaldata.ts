
export const acceptanceText = "I have read and agree to the Terms of Service, Privacy Policy, Risk Disclosure, and all other linked agreements";

export const legalDocs = [
  {
    id: "termsservices",
    title: "Terms of Service",
    description: "Read our terms and conditions",
    icon: "/Legal/CopyIcon.svg",
    information: [
      {
        heading: "Summary",
        content: [{type: "list",
        items: ["Xao is a DAO-run protocol, not a company or centralized app",
                "Legally based in Wyoming, USA — disputes go to Wyoming courts.",
                "You must be 18 or older to use Xao legally.",
                "No one under 13 is allowed to use Xao, even with supervision.",
                "You’re responsible for everything you do on Xao — contracts, uploads, transactions.",
                "We don’t store your money, control your contracts, or mediate disputes.",
                "We don’t track you, use cookies, or collect personal data.",
                "No public profiles or global user directories — you meet people via group chats or direct invites.",
                "If you log in with email, it’s handled by Supabase, not us.",
                "Uploaded files (like tax forms) are encrypted and pinned to IPFS — not stored by XaoDAO.",
                "Use is at your own risk. Smart contracts may have bugs or risks we can’t prevent.",
                "No guarantee of payment, performance, or availability — this is a decentralized system.",
                "You agree to settle disputes individually, through arbitration — no class actions.",
                "Don’t use Xao if you're from a sanctioned country (e.g., U.S. embargoed jurisdictions).",
                "Terms can only change via DAO vote — continued use means you agree to changes.",
                "Support is limited — check public docs or forums; AI helper agent coming soon."
              ]}], 
      },
      {
        heading: "1. Jurisdiction and Legal Structure",
        content:[
                {type: "paragraph",
        text: "Xao operates as a Wyoming DAO LLC pursuant to the Wyoming Decentralized Autonomous Organization Supplement. This legal framework recognizes DAO operations and governance under smart contract control. By interacting with Xao, you irrevocably consent to the exclusive jurisdiction and venue of the courts located in the State of Wyoming, United States of America, and waive any objection based on lack of personal jurisdiction, place of residence, improper venue, or forum non conveniens. These Terms shall be construed in accordance with the laws of Wyoming, without regard to its conflict of law provisions.",
      }, ]
        },
      {
        heading: "2. Eligibility and Age Requirements",
        content:[{type: "paragraph",
        text:  "You must be at least 18 years of age to legally engage with Xao for financial or contractual interactions. While the protocol does not restrict technical access, all legally binding actions must be executed by individuals of legal age in their jurisdiction. If you are under 18, you may only use Xao with the involvement and full legal responsibility of a parent or legal guardian. This protocol is not intended for children under 13 years of age.",
      },]

            },
      {
        heading: "3. Decentralized Nature and Protocol Access",
        content:[
        {type: "paragraph",
        text:  "Xao is a decentralized, autonomous protocol. It operates without a centralized operator, custodian, or intermediary. Access to the smart contracts and protocol logic is permissionless, publicly verifiable, and globally available via blockchain infrastructure. All interactions with the protocol are undertaken on a non-fiduciary, peer-to-peer basis.",
      },]
           },
      {
        heading: "4. User Responsibility",
        content:[{type: "paragraph",
        text:  "Users assume full legal and technical responsibility for their actions on the protocol, including but not limited to:" 
          },
        {
        type: "list",
        items: [
          "Creating, publishing, or executing smart contracts",
          "Uploading, pinning, or sharing documents or metadata",
          "Sharing identity or tax-related information",
          "Signing and exchanging agreements",
          "Performing or facilitating financial transactions"
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO does not verify, endorse, or assume responsibility for user identity, accuracy of uploads, or contractual obligations. All interactions are peer-to-peer and occur without intermediation. You acknowledge that you engage at your own risk and waive all claims against XaoDAO or its affiliates arising from peer-to-peer interactions. Users are solely responsible for compliance with all applicable tax laws and regulations in their jurisdiction, including reporting earnings and submitting tax forms. XaoDAO does not provide tax filing or reporting services."
      }]

           },
      {
        heading: "5. No Custody or Guarantees",
         content:[
          {
            type: "paragraph",
            text: "Xao does not custody funds, assets, or enforceable agreements. All transactions occur directly between user-controlled wallets and smart contracts deployed to public blockchains. XaoDAO disclaims all guarantees regarding payment, execution, or the behavior of other participants. You acknowledge that use of the protocol does not create any fiduciary relationship with XaoDAO or any of its contributors. Smart contracts used by the Xao protocol are experimental, may contain bugs or vulnerabilities, and may be subject to third-party exploits. XaoDAO disclaims all liability for damages arising from smart contract failure or unexpected behavior.",
            }]
    },
      {
        heading: "6. No Centralized Profiles or Tracking",
        content:[
          {
            type: "paragraph",
            text: "Xao does not maintain a centralized user directory or enable the public browsing of user profiles. Discovery of other users occurs solely through peer-to-peer interactions, such as decentralized group chats or direct invitations. There are no global user databases or centralized profile search mechanisms.", 
          },
          {
            type: "paragraph",
            text: "Xao does not collect or use behavioral data for analytics, profiling, or advertising. We do not use cookies, tracking pixels, or browser fingerprinting in any protocol-facing applications.",
          }
        ]
           },
      {
        heading: "7. Email Login via Supabase (Optional)",
        content: [
      {
        type: "paragraph",
        text: "Users may optionally sign up using an email address via Supabase. This email address is:",
       },
      {
        type: "list",
        items: [
          "Stored securely by Supabase Inc., not by XaoDAO",
          "Used only for authentication purposes",
          "Never shared with third parties beyond Supabase",
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO does not access or process user email addresses. If you wish to delete your Supabase-linked account, you must contact Supabase or use the in-app deletion feature if available. See Supabase’s Privacy Policy for more information: "
      },
      {
        type: "link",
        label:"https://supabase.com/privacy",
        url: "https://supabase.com/privacy",
      }
    ] },
      {
        heading: "8. Uploaded Documents and Decentralized Storage",
       content: [
      {
        type: "paragraph",
        text: "Certain protocol features, such as tax form exchange or contract execution, may allow users to upload documents. These are:",
      },
      {
        type: "list",
        items: [
          "Encrypted and pinned to decentralized storage (e.g., IPFS)",
          "Not centrally stored, indexed, or reviewed by XaoDAO",
          "Accessible only through user-controlled smart contract workflows",
        ]
      },
      {
        type: "paragraph",
        text: "Users are responsible for the content of their uploads and must avoid sharing unencrypted or unnecessary personal information.",
      },
    ]
        },
      {
        heading: "9. Data Use and Local Configuration",
        content: [
      {
        type: "paragraph",
        text: "Profile-related data such as usernames, DIDs, wallet addresses, or optional metadata (e.g., music genre or location radius) may be stored locally or within user-controlled storage. These are used only for in-protocol functionality and never collected into centralized databases by XaoDAO. All such data sharing is opt-in.",
      },
      {
        type: "paragraph",
        text: "Xao may optionally display information locally or via IPFS, but does not process this data centrally.",
      },]
      },
      {
        heading: "10. Indemnification and Limitation of Liability",
        content: [
      {
        type: "paragraph",
        text: "By using the Xao protocol, you agree to defend, indemnify, and hold harmless XaoDAO, its contributors, developers, members, and affiliated entities from any and all claims, damages, obligations, losses, liabilities, costs, or expenses (including attorney’s fees) arising from or related to:",
      },
      {
        type: "list",
        items: [
          "Your use or misuse of the protocol",
          "Any contracts or transactions executed using Xao",
          "Uploaded content or documents",
          "Violation of these Terms or applicable law",
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO disclaims all warranties, express or implied, including warranties of title, non-infringement, merchantability, or fitness for a particular purpose. To the fullest extent permissible under law, XaoDAO shall not be liable for indirect, incidental, punitive, special, or consequential damages arising out of or relating to the use or inability to use the protocol.",
      },
    ]
        },
      {
        heading: "11. Arbitration and Class Action Waiver",
        content: [
      {
        type: "paragraph",
        text: "You agree that any dispute arising out of or relating to these Terms shall be resolved through binding individual arbitration and not in a class, consolidated, or representative proceeding. You waive your right to participate in a class action lawsuit or class-wide arbitration. This clause applies only to disputes involving DAO tools or contributors, not disputes between users.",
      },
      
    ]
        },
      {
        heading: "12. Export Controls and Sanctions",
        content: [
      {
        type: "paragraph",
        text: "By using Xao, you represent that you are not located in, or a citizen or resident of, any jurisdiction subject to embargoes or trade sanctions enforced by the U.S. Office of Foreign Assets Control (OFAC), the EU, or other applicable jurisdictions. You further represent that you are not on any government list of prohibited or restricted parties.",
      },
      
    ]
        },
      {
        heading: "13. Force Majeure",
        content: [
      {
        type: "paragraph",
        text: "XaoDAO shall not be held liable for any failure or delay in performance due to acts beyond its reasonable control, including but not limited to acts of God, war, terrorism, civil unrest, regulatory actions, or technical failures of blockchain networks or internet infrastructure.",
      },
      
    ]
        },
      {
        heading: "14. Third-Party Tools and Links",
        content: [
      {
        type: "paragraph",
        text: "XaoDAO is not responsible for the content, accuracy, or functionality of any third-party tools or websites linked from the protocol interface. Use of third-party tools is at your own risk.",
      },
      
    ]
        },
      {
        heading: "15. Digital Signatures",
        content: [
      {
        type: "paragraph",
        text: "You agree that any interaction with the Xao protocol, including on-chain transactions or wallet-based cryptographic signatures, constitutes a legally binding expression of intent, and may serve as a substitute for a physical signature.",
      },
      
    ]
        },
      {
        heading: "16. Governing Language",
        content: [
      {
        type: "paragraph",
        text: "These Terms are drafted in English. If translated into any other language, the English version shall prevail in the event of any inconsistency.",
      },
      
    ]
        },
      {
        heading: "17. Updates to the Terms",
        content: [
      {
        type: "paragraph",
        text: "These Terms of Service may be amended only by a valid vote of XaoDAO in accordance with the Constitution. Once approved, updated versions will be posted to the publicly accessible governance repository. Continued interaction with the protocol constitutes binding acceptance of the updated Terms. You are responsible for monitoring DAO publications for changes.",
      },
      
    ]
        },
      {
        heading: "18. Contact and Support",
        content: [
      {
        type: "paragraph",
        text: "If you have questions, privacy concerns, or account-related requests, please use the community support forum or await the rollout of the helper agent.",
      },
      
    ]
        },
      {
        heading: "19. Privacy and Data Handling",
        content: [
      {
        type: "paragraph",
        text: "Please refer to the ",
      },
      
      {
        type: "link",
        label: "Privacy Policy",
        url: "https://chatgpt.com/auth/login/?next=%2Fg%2Fg-p-68a1341eeba881918e41d8881ca86492-xao%2Fproject"
      },
      {
        type: "paragraph",
        text: "for detailed information on how we handle data. Your continued use of the protocol constitutes acceptance of both this Terms of Service and the accompanying Privacy Policy.",
      },

    ]
        },
      {
        heading: "20. Disclaimers on Financial and Legal Advice",
        content: [
      {
        type: "paragraph",
        text: "Xao does not offer financial, investment, legal, or tax advice. Participation in the protocol, holding governance tokens, or receiving rewards does not constitute an offer of securities or financial products. You acknowledge and agree that your use of the protocol is for utility purposes only.",
      },
      
    ]
        },
      {
        heading: "21. Token Disclaimer",
        content: [
      {
        type: "paragraph",
        text: "Xao protocol tokens are intended solely for governance and utility within the protocol. Their value may fluctuate. You acknowledge that XaoDAO is not liable for losses arising from market volatility, staking penalties, or token mechanics.",
      },
      
    ]
        },
      {
        heading: "22. Dispute Resolution Mechanism",
        content: [
      {
        type: "paragraph",
        text: "To the extent practicable, users agree to resolve disputes through DAO-mediated processes or reputation mechanisms prior to initiating legal proceedings. On-chain governance and arbitration tools may be used to enforce outcomes.",
      },
      
    ]
        },
    ],
  },
  {
    id: "privacypolicy",
    title: "Privacy Policy",
    description: "Learn how we handle your data",
    icon: "/Legal/CopyIcon.svg",
      information: [
      {
        heading: "Summary",
        content: [
      {
        type: "paragraph",
        text: "Xao is committed to minimizing data collection, decentralizing identity, and empowering users with full control over their personal information. We do not collect or store personal data on centralized servers except where temporarily required by third-party infrastructure for optional account access. This Privacy Policy outlines what limited data may be collected, how it is used, and your rights regarding it.",
      },
      {
        type: "paragraph",
        text: "We don’t track you, collect your data, or store personal information. Here’s the short version:"
      },
      {
        type: "list",
        items: [
          "No profiles, no databases: In our current version, you don’t have a public profile, and we don’t keep a list of users or anything searchable.",
          "You connect directly: You’ll meet people through group chats or invites, not by browsing profiles.",
          "No tracking: We don’t use cookies, analytics, or behavior tracking.",
          "Optional email login: If you choose to sign up with email, it goes through a third-party (Supabase). You can delete your account with them at any time.",
          "Everything is opt-in: If we ever add features like sharing your location or music genre, you’ll be asked first — nothing happens without your permission.",
          "You own your data: You control what you share and when. We don’t hold onto anything beyond what’s needed to make the app work.",
        ]
      },
      {
        type: "paragraph",
        text: "The full policy below gives all the legal details.",
      },
    ]
      },
      {
        heading: "1. No Centralized Profiles",
        content: [
      {
        type: "paragraph",
        text: "Xao does not create or store centralized user profiles. There is no global directory or searchable user database. Instead, discovery of other users occurs organically through decentralized group chats (e.g., via XMTP). Profile data is not publicly browsable, and all sharing of information is opt-in, contextual, and handled peer-to-peer.",
      },
    ]
      },
      {
        heading: "2. Wallets, DIDs, and Communication Metadata",
        content: [
      {
        type: "paragraph",
        text: "To enable core protocol functionality, Xao processes limited metadata tied to your wallet address and decentralized identifier (DID), such as:",
      },
      {
        type: "list",
        items: [
          "Wallet address (public blockchain data)",
          "DID:eth or DID:web (used to link identity to wallets and outside services)",
          "Username (optional, used only in peer-to-peer interactions)",
        ]
      },
      {
        type: "paragraph",
        text: "This data is not collected by or stored in any central XaoDAO-owned database. It exists as part of local device configuration, decentralized storage (e.g., IPFS), or on-chain.",
      },
      {
        type: "paragraph",
        text: "We do not use this data for advertising or behavioral profiling. If, in the future, any feature (such as location radius or genre for matchmaking) is introduced, it will be fully opt-in and stored in user-controlled spaces.",
      },
    ]
        },
      {
        heading: "3. Supabase Email Authentication",
        content: [
      {
        type: "paragraph",
        text: "Users may optionally sign up using an email address via Supabase.",
      },
      {
        type: "list",
        items: [
          "This email address is stored securely by Supabase Inc, not by XaoDAO.",
          "The email is used only for login/authentication purposes.",
          "Xao does not use email addresses for marketing, profiling, or cross-site tracking.",
          "Users may request deletion of their email-based account by contacting the support forum or via the in-app deletion tool (if available).",
        ]
      },
      {
        type: "paragraph",
        text: "We do not share user emails with third parties outside of Supabase. Supabase acts as a third-party data processor. For information on their practices, please see: ",
      },
      {
        type: "link",
        label: "https://supabase.com/privacy",
        url: "https://supabase.com/privacy"
      }
    ]
        },
      {
        heading: "4. Uploaded Documents and IPFS",
        content: [
      {
        type: "paragraph",
        text: "Certain protocol features (e.g., tax form exchange, document uploads) allow users to upload files that are pinned to decentralized storage (IPFS). These documents:",
       },
      {
        type: "list",
        items: [
          "Are encrypted and shared only through smart contract workflows",
          "Are not centrally stored or indexed by XaoDAO",
          "Remain accessible only by intended recipients via wallet interactions",
        ]
      },
      {
        type: "paragraph",
        text: "Users are responsible for the content they upload and must avoid uploading unnecessary personal information.",},
    ]
        },
      {
        heading: "5. Peer-to-Peer Messaging and Disclosures",
        content: [
      {
        type: "paragraph",
        text: "Users may share sensitive data through peer-to-peer chat, smart contract flows, or DID-based interactions. XaoDAO does not monitor, store, or control these communications.",
      },
      {
        type: "list",
        items: [
          "Users are solely responsible for the content and metadata they share.",
          "XaoDAO disclaims all responsibility for outcomes of such disclosures.",
          "Do not share sensitive personal information unless absolutely necessary and encrypted.",
        ]
      },
    ]
        },
      {
        heading: "6. Device Storage and Local Configuration",
        content: [
      {
        type: "paragraph",
        text: "Xao may rely on local device storage for configuration data such as usernames, encrypted settings, or interface preferences. XaoDAO:",
      },
      {
        type: "list",
        items: [
          "Does not access or control your device storage.",
          "Does not remotely track or read local data.",
          "Recommends users take appropriate measures to secure their local environments.",
        ]
      },
    ]
        },
      {
        heading: "7. No Tracking or Analytics",
        content: [
      {
        type: "paragraph",
        text: "Xao does not use cookies, tracking pixels, fingerprinting, or analytics scripts on protocol-facing apps or smart contract interactions. Any optional front-end interfaces or documentation sites may use basic analytics for debugging or performance purposes, but never in conjunction with user profiles or wallet addresses.",
      },
    ]
        },
      {
        heading: "8. AI-Powered Helper Agent (Future Feature)",
        content: [
      {
        type: "paragraph",
        text: "Xao plans to implement an AI helper agent to assist with onboarding and support. If introduced:",
      },
      {
        type: "list",
        items: [
          "All interactions will be opt-in.",
          "The agent will operate under this privacy policy.",
          "No data will be collected or retained without user knowledge and explicit action.",
        ]
      },
    ]
        },
      {
        heading: "9. Governance and DAO-Controlled Changes",
        content: [
      {
        type: "paragraph",
        text: "Any protocol or privacy-affecting updates must be approved through transparent DAO voting processes. These updates will be announced publicly, and continued use of the protocol constitutes acceptance.",
      },
    ]
        },
      {
        heading: "10. Abuse, Spam, and Malicious Behavior",
        content: [
      {
        type: "paragraph",
        text: "Users encountering malicious behavior, spam, or harassment should:",
      },
      {
        type: "list",
        items: [
          "Block the offending party through their chat interface or wallet.",
          "Understand that XaoDAO is unable to intervene, monitor, or moderate peer interactions.",
        ]
      },
      {
        type: "paragraph",
        text: "Users are responsible for curating their own experience in decentralized environments.",
      },
    ]
        },
      {
        heading: "11. Third-Party Interfaces and Mirrors",
        content: [
      {
        type: "paragraph",
        text: "XaoDAO cannot guarantee the privacy practices of third-party frontends, forks, or mirror deployments of the protocol. Users should:",
      },
      {
        type: "list",
        items: [
          "Confirm interface provenance.",
          "Be cautious when interacting with unofficial or third-party services.",
        ]
      },
    ]
        },
      {
        heading: "12. GDPR and Data Subject Rights",
        content: [
      {
        type: "paragraph",
        text: "Because XaoDAO does not store or control personal data centrally, it is technically unable to:",
      },
      {
        type: "list",
        items: [
          "Delete files from IPFS",
          "Modify on-chain records",
          "Respond to GDPR erasure or data portability requests for decentralized data",
        ]
      },
      {
        type: "paragraph",
        text: "If you have used Supabase email login, you may request full deletion of your Supabase-linked account by contacting the support channel. This is the only case where centralized data deletion is technically possible.",
      },
    ]
        },
      {
        heading: "13. Children's Privacy",
       content: [
      {
        type: "paragraph",
        text: "Xao is not intended for users under the age of 13. We do not knowingly collect or store information from children. Users between 13 and 18 must use the protocol under the legal supervision of a guardian.",
      },
    ]
        },
      {
        heading: "14. Changes to This Policy",
       content: [
      {
        type: "paragraph",
        text: "This policy may be updated via DAO vote. Updates will be posted publicly in the governance repository and changelog. Continued use of the protocol after an update constitutes acceptance.",
      },
    ]
      },
      {
        heading: "15. Contact and Support",
        content: [
      {
        type: "paragraph",
        text: "If you have questions, privacy concerns, or deletion requests (related to Supabase accounts only), please use the community support forum or await the rollout of the helper agent.",
      },
    ]
  },
    ],
  },
  {
  id: "contract",
  title: "Risk Disclosure",
  description: "Material Risks and Limitations",
  icon: "/Legal/CopyIcon.svg",
  information: [
    {
      heading: "Summary",
     content: [
      {
        type: "paragraph",
        text: "Using Xao and the Xao protocol involves substantial risk. The software is experimental, decentralized, and interacts with volatile digital assets. By using Xao, you acknowledge that you fully understand and accept all risks outlined below and that you waive any claims against XaoDAO, its contributors, developers, or affiliates. This disclosure is intended to inform users of material risks and limitations associated with the use of the Xao protocol and its ecosystem.",
      },
    ]
  },
    {
      heading: "1. No Investment Advice",
      content: [
      {
        type: "paragraph",
        text: "Nothing in the Xao protocol, its documentation, interfaces, tokens, or interactions shall be construed as financial, investment, legal, or tax advice. Participation in the protocol, governance, or holding of tokens does not constitute an offer to sell or a solicitation of an offer to buy any securities or financial instruments.",
      },
      {
        type: "paragraph",
        text: "Users are solely responsible for evaluating the legal, tax, and financial implications of their actions and should consult their own professional advisors.",
      },
    ]
  },
    {
      heading: "2. Token Disclaimer",
      content: [
      {
        type: "paragraph",
        text: "Xao protocol tokens are intended strictly for governance and utility within the protocol. They are not investment vehicles, do not represent ownership or equity, and carry no expectation of profit from the efforts of others. Token values are volatile, may change unpredictably, and XaoDAO disclaims any liability for market movements, staking penalties, or economic loss resulting from token mechanics.",
      },
    ]
  },
    {
      heading: "3. Assumption of Risk",
      content: [
      {
        type: "paragraph",
        text: "By using the Xao protocol, you accept full personal responsibility and risk, including but not limited to:",
      },
      {
        type: "list",
        items: [
          "Irreversible loss of digital assets",
          "Exposure to bugs, exploits, or malicious code in smart contracts",
          "Changes to governance mechanisms or protocol rules",
          "Failure or downtime of blockchain networks",
          "Inability to access or recover accounts",
        ]
      },
      {
        type: "paragraph",
        text: "You agree that XaoDAO makes no guarantees as to the functionality, security, or uptime of the protocol.",
      },
    ]
  },
    {
      heading: "4. Smart Contract and Protocol Risks",
      content: [
      {
        type: "paragraph",
        text: "Smart contracts may contain bugs, vulnerabilities, or logic errors that may result in unintended behavior, including permanent loss of assets. By interacting with smart contracts deployed by the Xao protocol, you:",
      },
      {
        type: "list",
        items: [
          "Acknowledge that smart contracts are self-executing and irreversible",
          "Accept the risk that contracts may be upgraded, deprecated, or replaced",
          "Understand that third-party data sources (e.g., oracles) may malfunction, be manipulated, or provide incorrect information",
        ]
      },
    ]
  },
    {
      heading: "5. User-Side Security",
      content: [
      {
        type: "paragraph",
        text: "Xao does not control or secure your private keys, devices, or wallets. You are solely responsible for:",
      },
      {
        type: "list",
        items: [
          "Safeguarding your private keys, recovery phrases, and credentials",
          "Avoiding phishing, malware, and other social engineering threats",
          "Keeping your devices and software up-to-date and secure",
        ]
      },
      {
        type: "paragraph",
        text: "Loss of access credentials may result in permanent loss of funds or inability to interact with the protocol.",
       },
    ]
  },
    {
      heading: "6. Jurisdictional Limitations",
      content: [
      {
        type: "paragraph",
        text: "Xao makes no representations that the protocol is appropriate or legal to use in all jurisdictions. You are responsible for complying with local laws and regulations, including but not limited to:",
      },
      {
        type: "list",
        items: [
          "Your use or misuse of the protocol",
          "Securities, tax, and financial regulations",
          "Export control laws and OFAC-related restrictions",
        ]
      },
      {
        type: "paragraph",
        text: "Accessing or using the protocol in violation of your local law is strictly prohibited.",
      },
    ]
  },
    {
      heading: "7. No Custody, Guarantees, or Fiduciary Duty",
      content: [
      {
        type: "paragraph",
        text: "XaoDAO does not custody user funds, act as a broker, nor provide any guarantee of:",
      },
      {
        type: "list",
        items: [
          "Successful execution of transactions",
          "Fulfillment of agreements between users",
          "Availability of services or uptime",
          "Recovery of lost assets",
        ]
      },
      {
        type: "paragraph",
        text: "All transactions are executed peer-to-peer via smart contracts. XaoDAO does not act as an intermediary, fiduciary, or custodian.",
      },
    ]
  },
    {
      heading: "8. No Duty of Maintenance or Support",
      content: [
      {
        type: "paragraph",
        text: "XaoDAO contributors, developers, and affiliated parties are under no obligation to maintain, upgrade, or provide support for the protocol. Features may be deprecated, interfaces may become unavailable, and the protocol may evolve or be forked without notice.",
      },
      {
        type: "paragraph",
        text: "Use of the protocol is provided as-is and without warranty of any kind.",
      },
    ]
  },
    {
      heading: "9. Third-Party Tools and Dependencies",
      content: [
      {
        type: "paragraph",
        text: "Xao relies on multiple third-party components, including but not limited to:",
      },
      {
        type: "list",
        items: [
          "Blockchain networks (e.g., Ethereum, Base)",
          "Wallet providers (e.g., MetaMask, Coinbase Wallet)",
          "Decentralized storage systems (e.g., IPFS)",
          "Authentication and interface tools (e.g., Supabase)",
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO does not control or guarantee the performance, security, or availability of any third-party services. Use of such services is entirely at your own risk.",
      },
    ]
  },
    {
      heading: "10. Changes and Updates",
      content: [
      {
        type: "paragraph",
        text: "This Risk Disclosure may be amended via DAO vote. Updated versions will be posted publicly. Continued use of the protocol after an update constitutes acceptance.",
      },
    ]
  },
  ],
},
{
  id: "token-disclaimer",
  title: "Token Disclaimer",
  description: "Information about Token",
  icon: "/Legal/CopyIcon.svg",
  information: [
    {
      heading: "Summary",
      content: [
      {
        type: "list",
        items: [
          "XAO is not an investment. It’s a utility token used for voting, staking, and unlocking features in the Xao dApp. You should not expect to make a profit just by holding it.",
          "No guarantees. The token’s value, functionality, or availability may change. There are no promises about liquidity, future upgrades, or price.",
          "Not regulated. XAO is not a registered security and hasn’t been reviewed by any government agency. If you live in a country with strict crypto laws, check if you’re allowed to use it.",
          "You are responsible. You must handle your own wallet security and taxes. XaoDAO doesn’t give legal, financial, or tax advice.",
          "Use it at your own risk. This is experimental technology. You could lose tokens due to bugs, misuse, or third-party issues.",
        ]
      },
    ]
  },
    {
      heading: "1. Purpose and Utility of the Token",
      content: [
      {
        type: "paragraph",
        text: "The XAO token is designed and issued solely for use within the Xao protocol and its associated decentralized applications. Its primary functions include:",
      },
      {
        type: "list",
        items: [
          "Participating in protocol governance",
          "Staking for access control and reputation accrual",
          "Voting on proposals, budgets, and DAO elections",
          "Unlocking specific features or domains within the dApp",
        ]
      },
      {
        type: "paragraph",
        text: "XAO tokens are not investment products. They are not intended to represent any claim on profits, ownership, equity, dividends, or other financial interests in XaoDAO, any legal entity, or any affiliated party. Use of the XAO token is limited to the functional utility described above.",
      },
    ]
  },
    {
      heading: "2. No Expectation of Profit",
      content: [
      {
        type: "paragraph",
        text: "Users of the XAO token acknowledge and agree that:",
      },
      {
        type: "list",
        items: [
          "They are not purchasing XAO with the expectation of profit, income, or appreciation in value.",
          "The token is not marketed or sold as an investment opportunity.",
          "There is no promise, guarantee, or inducement regarding the token’s price, liquidity, or resale value.",
          "All protocol contributions and staking decisions are voluntary and not in exchange for future compensation.",
        ]
      },
    ]
  },
    {
      heading: "3. Regulatory Classification and Jurisdictional Disclaimers",
      content: [
      {
        type: "paragraph",
        text: "The XAO token is not registered with the U.S. Securities and Exchange Commission (SEC), the European Securities and Markets Authority (ESMA), or any other national regulator. It has not been reviewed or approved by any regulatory authority in any jurisdiction.",
      },
      {
        type: "paragraph",
        text: "Depending on your country of residence or citizenship, the holding or use of tokens may be restricted or prohibited under applicable laws. It is your sole responsibility to understand and comply with the laws and regulations of your jurisdiction before acquiring, using, or interacting with XAO tokens or the Xao protocol.",
      },
      {
        type: "paragraph",
        text: "XaoDAO does not offer tokens to, and tokens must not be held or used by, any individual or entity that is:",
      },
      {
        type: "list",
        items: [
          "A resident, citizen, or located in a jurisdiction subject to sanctions or trade restrictions under U.S., EU, or international law (including OFAC-sanctioned countries).",
          "On any government list of prohibited or restricted parties.",
          "Acting on behalf of any such person or entity.",
        ]
      },
    ]
  },
    {
      heading: "4. No Representations or Warranties",
      content: [
      {
        type: "paragraph",
        text: "XaoDAO makes no representations or warranties whatsoever regarding:",
      },
      {
        type: "list",
        items: [
          "The future availability, performance, or functionality of the XAO token or its smart contracts",
          "The value, utility, or tradability of XAO on any third-party exchange",
          "The security or stability of the underlying blockchain infrastructure",
          "The continued operation or governance structure of XaoDAO",
        ]
      },
      {
        type: "paragraph",
        text: "All tokens are provided “as is” and “as available” without warranties of any kind, express or implied.",
      },
    ]
  },
    {
      heading: "5. No Guarantee of Liquidity or Market Access",
      content: [
      {
        type: "paragraph",
        text: "The XAO token may or may not be traded on decentralized or centralized exchanges. XaoDAO does not list, promote, or facilitate liquidity for XAO tokens, and assumes no responsibility for third-party marketplaces, pricing, slippage, impermanent loss, or the availability of buyers or sellers.",
      },
      {
        type: "paragraph",
        text: "Users acknowledge that:",
      },
      {
        type: "list",
        items: [
          "XAO tokens may have no liquid market",
          "XaoDAO is not responsible for maintaining or supporting token liquidity",
          "Users trade or transfer tokens at their own risk",
        ]
      },
    ]
  },
    {
      heading: "6. Tax Obligations",
      content: [
      {
        type: "paragraph",
        text: "Users are solely responsible for determining the tax implications related to their acquisition, holding, use, transfer, or disposal of XAO tokens. This includes, but is not limited to, any obligations relating to:",
      },
      {
        type: "list",
        items: [
          "Capital gains",
          "Income from staking or participation",
          "Value-added tax (VAT) or sales tax",
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO does not provide tax advice or reporting services and disclaims any liability for tax consequences arising from token use.",
      },
    ]
  },
   
    {
      heading: "7. Use at Your Own Risk",
      content: [
      {
        type: "paragraph",
        text: "XAO tokens are experimental digital assets tied to an evolving protocol and governance model. The protocol may change, fork, or terminate at any time, without prior notice or guarantee.",
      },
      {
        type: "paragraph",
        text: "Users agree to:",
      },
      {
        type: "list",
        items: [
          "Use the token entirely at their own risk",
          "Assume full responsibility for safeguarding their private keys and wallets",
          "Accept the consequences of participating in a decentralized, autonomous, and immutable system",
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO is not liable for any loss of tokens due to user error, software failure, hacking, phishing, or technical vulnerabilities.",
      },
    ]
  },
    {
      heading: "8. Amendments",
      content: [
      {
        type: "paragraph",
        text: "This Token Disclaimer may be updated from time to time via DAO vote. The latest version will be published in the Xao governance repository. Continued use of the XAO token constitutes binding acceptance of any updates.",
      },
    ]
  },
  ],
},
{
  id: "license-agreement",
  title: "Contributor License Agreement",
  description: "License terms and conditions",
  icon: "/Legal/CopyIcon.svg",
  information: [
  {
       heading: "",
    content: [
      {
        type: "paragraph",
        text: "This Contributor License Agreement (“Agreement”) governs the legal relationship between a contributor (“Contributor”) and XaoDAO, a Wyoming DAO LLC, with respect to any work submitted to the Xao protocol and associated open-source repositories (“Project”).",
      },
      {
        type: "paragraph",
        text: "By submitting a Contribution (as defined below), whether under your legal name or pseudonym, you agree to the terms below.",
      },
    ]
  },
{
    heading: "1. Definitions",
    content: [
      {
        type: "list",
        items: [
          "“Contribution” means any original work of authorship, including but not limited to software code, smart contracts, documentation, design elements, graphics, suggestions, or other content submitted to the Project by the Contributor in any format.",
          "“Contributor”, “you”, or “your” means the individual or entity submitting the Contribution, whether identified by legal name, pseudonym, or blockchain wallet address.",
          ]
      },
      {
        type: "paragraph",
        text: "XaoDAO disclaims all warranties, express or implied, including warranties of title, non-infringement, merchantability, or fitness for a particular purpose. To the fullest extent permissible under law, XaoDAO shall not be liable for indirect, incidental, punitive, special, or consequential damages arising out of or relating to the use or inability to use the protocol.",
      },
    ]
  },
  {
    heading: "2. License Grant",
    content: [
      {
        type: "paragraph",
        text: "You retain ownership of your Contribution. You hereby grant XaoDAO and its successors an irrevocable, worldwide, perpetual, royalty-free, sublicensable, and non-exclusive license to use, reproduce, modify, publish, distribute, and sublicense your Contribution — in whole or in part — as part of the Project or any related works.",
      },
      {
        type: "paragraph",
        text: "This license includes the right to:",
      },
      {
        type: "list",
        items: [
          "Incorporate the Contribution into smart contracts, documentation, apps, or marketing",
          "Distribute it under any open-source license approved by DAO vote",
        ]
      },
      {
        type: "paragraph",
        text: "You acknowledge that DAO votes may govern how Contributions are licensed or used after submission.",
      },
    ]
  },
  {
    heading: "3. Representation of Authorship and Rights",
    content: [
      {
        type: "paragraph",
        text: "You represent and warrant that:",
      },
      {
        type: "list",
        items: [
          "The Contribution is your original work or you have the right to submit it",
          "You have the authority to license it to XaoDAO",
          "Your submission does not violate any third-party rights, confidentiality obligations, or applicable laws.",
          "If acting on behalf of an organization or employer, you are authorized to bind them.",
        ]
      },
      {
        type: "paragraph",
        text: "You may contribute pseudonymously. The absence of identity does not affect the enforceability of this Agreement.",
       },
    ]
  },
  {
    heading: "4. No Obligation to Use",
    content: [
      {
        type: "paragraph",
        text: "XaoDAO is not required to accept or use any Contribution. Contributions may be rejected, modified, or discarded at the discretion of the DAO or its authorized contributors.",
      },
    ]
  },
  {
    heading: "5. DAO-Based Recognition and Token Rights",
    content: [
      {
        type: "paragraph",
        text: "Contributors may be granted recognition, governance rights, or tokens based on DAO-approved mechanisms, including but not limited to:",
      },
      {
        type: "list",
        items: [
          "Domain-specific reputation",
          "Token-based allocations",
          "Contributor acknowledgment",
        ]
      },
      {
        type: "paragraph",
        text: "These rights are governed separately by the Xao Constitution and Token Distribution Framework. This CLA does not confer any compensation or entitlements beyond the license granted.",
      },
    ]
  },
  {
    heading: "6. No Warranty; Limitation of Liability",
    content: [
      {
        type: "paragraph",
        text: "All Contributions are provided “as-is.” You disclaim all warranties, including merchantability, fitness for a particular purpose, or non-infringement. You agree that XaoDAO and its members are not liable for any damages arising from use, modification, or distribution of your Contribution.",
      },
    ]
  },
  {
    heading: "7. Moral Rights Waiver",
    content: [
      {
        type: "paragraph",
        text: "To the fullest extent permitted by law, you waive any moral rights you may have in your Contribution, such as the right to attribution or the right to object to modification.",
      },
    ]
  },
  {
    heading: "8. Governing Law and Dispute Resolution",
    content: [
      {
        type: "paragraph",
        text: "This Agreement is governed by the laws of the State of Wyoming. Any disputes must first be submitted for resolution via the on-chain or DAO dispute process. If no satisfactory outcome is achieved, the parties agree to final and binding arbitration in Wyoming under the rules defined in the XaoDAO Terms of Service.",
      },
      {
        type: "paragraph",
        text: "By submitting a Contribution to any XaoDAO project or repository, you agree to the terms of this Contributor License Agreement.",
      },
    ]
  },
],

},
{
  id: "community-guidlines",
  title: "Community Guidelines",
  description: "Read our community guidelines",
  icon: "/Legal/CopyIcon.svg",
  information: [
  {
    heading: "1. Purpose",
    content: [
      {
        type: "paragraph",
        text: "These Guidelines exist to foster a healthy, productive, and inclusive environment for collaboration across the XaoDAO ecosystem — including forums, governance platforms, chat groups, community calls, and contribution channels.",
      },
      {
        type: "paragraph",
        text: "They are not meant to restrict speech but to protect the integrity, mission, and safety of the DAO and its members.",
      },
    ]},
  {
    heading: "2. Foundational Principles",
    content: [
      {
        type: "paragraph",
        text: "All community participation must uphold the core principles of the XaoDAO Constitution, including:",
      },
      {
        type: "list",
        items: [
          "Decentralization: Respect protocol neutrality and autonomy. No user should seek to unduly control, censor, or monopolize access.",
          "Sovereignty: Each participant has the right to operate pseudonymously, control their own data, and interact with the protocol freely.",
          "Transparency: Decisions, votes, and discussions must be open and auditable.",
          "Responsibility: DAO members are expected to act in good faith and exercise judgment in protecting the protocol’s future.",
        ]
      },
    ]
  },
  {
    heading: "3. Expected Behavior",
    content: [
      {
        type: "paragraph",
        text: "We expect everyone to:",
      },
      {
        type: "list",
        items: [
          "Treat others with respect, regardless of ideology, background, or identity.",
          "Engage in disagreements constructively and without personal attacks.",
          "Provide thoughtful feedback and criticism.",
          "Protect the DAO’s neutral infrastructure.",
          "Abide by all relevant DAO votes, governance outcomes, and domain-specific processes.",
          "Respect pseudonymity and avoid identity harassment.",
          "Maintain relevance: Stay focused on governance, development, contributions, and discussion related to the protocol and DAO ecosystem."
            
        ]
      },
    ]
  },
  {
    heading: "4. Prohibited Behavior",
    content: [
      {
        type: "paragraph",
        text: "The following conduct is not allowed in DAO-affiliated spaces (forums, chats, meetings, etc.):",
      },
      {
        type: "list",
        items: [
          "Personal attacks, name-calling, or harassment",
          "Doxxing or attempts to unmask pseudonymous contributors",
          "Hate speech, discrimination, or targeted abuse",
          "Spamming or flooding channels with irrelevant or disruptive content",
          "Impersonation of other community members or DAO representatives",
          "Coordinated brigading or manipulation of votes, forums, or discussions",
          "Posting malware, scams, or malicious contract links",
          "Use of DAO tools or platforms to promote illegal activity or fraud",
          "Persistent disruption of DAO governance or violation of ratified processes",
        ]
      },
    ]
  },
  {
    heading: "5. Moderation and Enforcement",
    content: [
      {
        type: "paragraph",
        text: "While the Xao protocol itself is immutable and censorship-resistant, DAO-governed front-end interfaces, forums, and repositories may enforce community standards to protect integrity and contributor safety.",
      },
      {
        type: "list",
        items: [
          "Content moderation may be performed by domain-appointed moderators, reputation holders, or smart contract-enforced rules.",
          "Temporary or permanent removal from DAO-hosted platforms may occur for egregious violations.",
          "Governance votes may override moderation decisions where applicable.",
        ]
      },
      {
        type: "paragraph",
        text: "Appeals may be submitted via public DAO forums or escalated through on-chain dispute mechanisms (if available).",
      },
    ]
  },
  {
    heading: "6. External Communities and Independent Projects",
    content: [
      {
        type: "paragraph",
        text: "DAO-affiliated contributors are encouraged to form working groups, side-projects, and parallel communities. However, use of the XaoDAO name, branding, or official interfaces must align with DAO-approved standards and licensing.",
      },
      {
        type: "paragraph",
        text: "Misinformation, fraud, or misrepresentation of DAO affiliation will be addressed via takedown, delisting, or other DAO-approved enforcement.",
      },
    ]
  },
  {
    heading: "7. Participation and Reporting",
    content: [
      {
        type: "paragraph",
        text: "To report violations, abuse, or concerns, contact the community moderators via:",
      },
      {
        type: "list",
        items: [
          "Community forums (public or pseudonymous)",
          "On-chain governance proposals",
          "Reputation-weighted domain leadership",
        ]
      },
      {
        type: "paragraph",
        text: "Retaliation against whistleblowers will not be tolerated.",
      },
    ]
  },
  {
    heading: "8. Evolution and Amendment",
    content: [
      {
        type: "paragraph",
        text: "These Guidelines are a living document. Amendments must be approved via DAO vote and posted publicly.", },
    ]
  },
],
},
{id: "copyright",
  title: "Copyright & Intellectual Property Notice",
  description: "Read our community guidelines",
  icon: "/Legal/CopyIcon.svg",
  information: [
  {
    heading: "1. Ownership of Protocol Materials",
    content: [
      {
        type: "paragraph",
        text: "Unless otherwise noted, all content, code, documentation, smart contracts, interfaces, artwork, trademarks, and materials published under the Xao protocol (“Xao Materials”) are owned or licensed by XaoDAO, a Wyoming DAO LLC, and its community of contributors.",
      },
      {
        type: "paragraph",
        text: "The Xao protocol and its assets are open-source and community-maintained. However, copyright protection still applies under applicable law. Unless expressly stated, all rights not expressly granted are reserved.",
      },
    ]
  },
  {
    heading: "2. Contributor Content and Licensing",
    content: [
      {
        type: "paragraph",
        text: "By contributing to any XaoDAO repositories, submitting designs, participating in governance proposals, or authoring public-facing content under the Xao brand, you agree to license your contributions under the protocol’s prevailing open-source license (currently MIT License), unless stated otherwise.",
      },
      
      {
        type: "paragraph",
        text: "Contributors retain ownership of their original work. However, you grant XaoDAO and the public an irrevocable, perpetual, worldwide, royalty-free license to use, reproduce, modify, publish, distribute, and display your contributions for any purpose consistent with the mission and operation of the protocol.",
      },
      {
        type: "paragraph",
        text: "Pseudonymous contributors are afforded the same rights and obligations as named individuals under this license, subject to DAO governance and vote-based attribution where applicable.",
      },
    ]
  },
  {
    heading: "3. User-Generated Content",
    content: [
      {
        type: "paragraph",
        text: "XaoDAO does not claim ownership of content uploaded by users to decentralized systems (e.g., IPFS). This includes but is not limited to:",
      },
      {
        type: "list",
        items: [
          "Tax documents",
          "Performance contracts",
          "Audio/video content",
          "Promotional materials",
          "User avatars, names, or metadata",
        ]
      },
      {
        type: "paragraph",
        text: "Users retain full rights and responsibilities for their own content. By uploading content to the Xao protocol or any related interface, you affirm that:",
      },
      {
        type: "list",
        items: [
          "You own or have the legal right to share the content",
          "You do not infringe upon third-party intellectual property",
          "You grant XaoDAO and its users a non-exclusive, royalty-free license to display and use the content as required for protocol functionality",
        ]
      },
      {
        type: "paragraph",
        text: "XaoDAO accepts no liability for unauthorized uploads or intellectual property violations by users. Complaints regarding infringement may be submitted via the DAO’s public governance channels.", 
      },
    ]
  },
  {
    heading: "4. Trademark and Branding",
    content: [
      {
        type: "paragraph",
        text: "“Xao”, “XaoDAO”, the XaoDAO logo, and associated visual identifiers (“Xao Marks”) may be unregistered trademarks of XaoDAO. All goodwill derived from the use of these marks shall inure to the benefit of the community.",
      },
      {
        type: "paragraph",
        text: "You may not use Xao Marks in a way that implies affiliation, endorsement, or sponsorship by XaoDAO without prior DAO vote or explicit license. This includes but is not limited to:",
      },
      {
        type: "list",
        items: [
          "Creating derivative brands",
          "Selling merchandise",
          "Operating services under the Xao name",
        ]
      },
      {
        type: "paragraph",
        text: "Limited fair use is permitted for educational, nominative, or journalistic purposes.",
      },
    ]
  },
  {
    heading: "5. Open Source Licensing",
    content: [
      {
        type: "paragraph",
        text: "Unless otherwise specified, all code repositories maintained by XaoDAO are released under the ",
      },
      {
        type: "link",
        label: "MIT License.",
        url: "https://opensource.org/license/MIT"
      },
      {
        type: "paragraph",
        text: "This license grants broad permissions for reuse, provided attribution and license text are included.",
      },
      {
        type: "paragraph",
        text: "Contributors must comply with all license terms and ensure that any third-party code included is compatible with the MIT License or clearly marked under a separate license.",
      },
    ]
  },
  {
    heading: "6. Takedown Requests and Infringement Claims",
    content: [
      {
        type: "paragraph",
        text: "Due to the decentralized architecture of Xao, including IPFS-based storage and immutable smart contract execution, XaoDAO cannot remove content or censor users post-deployment.",
      },
      {
        type: "paragraph",
        text: "We encourage any parties alleging copyright infringement to submit a notice via the DAO’s designated governance forum. The DAO may publish warnings or governance recommendations regarding known infringing content, though enforcement remains outside the scope of XaoDAO’s technical capabilities.",
       },
    ]
  },
  {
    heading: "7. Disclaimer",
    content: [
      {
        type: "paragraph",
        text: "This Notice does not constitute legal advice. XaoDAO makes no representation regarding the enforceability of licenses, ownership claims, or contributor identities. Users and contributors should seek independent legal counsel when needed."
      },
      
    ]
  },
],
},

  {
    id: "open-source",
  title: "Open Source License Declaration",
  description: "Information about Open Source License Declaration",
  icon: "/Legal/CopyIcon.svg",
  information: [
  {
    heading: "1. Declaration of Licensing Framework",
    content: [
      
      {
        type: "paragraph",
        text: "All software, smart contracts, protocol interfaces, and supporting documentation developed and maintained by or on behalf of XaoDAO are, unless otherwise stated, released under the terms of the ",
      },
      {
        type: "link",
        label: "MIT License ",
        url: "https://opensource.org/license/MIT"
      },
      {
        type: "paragraph",
        text: "(the “License”)."
      },
      {
        type: "paragraph",
        text: "This declaration applies to all official XaoDAO repositories, packages, and modules, including but not limited to:"
      },
      {
        type: "list",
        items: [
          "Protocol smart contracts",
          "Governance frameworks",
          "User interfaces",
          "SDKs and tooling",
          "Contributor-created content approved via DAO governance",
        ]
      },
    ]
  },
  {
    heading: "2. MIT License Summary",
    content: [
      {
        type: "paragraph",
        text: "Under the MIT License, users are free to:",
      },
      {
        type: "list",
        items: [
          "Use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software",
          "Do so with or without modification, for commercial or non-commercial purposes",
        ]
      },
      {
        type: "Provided that:",
        text: "XaoDAO disclaims all warranties, express or implied, including warranties of title, non-infringement, merchantability, or fitness for a particular purpose. To the fullest extent permissible under law, XaoDAO shall not be liable for indirect, incidental, punitive, special, or consequential damages arising out of or relating to the use or inability to use the protocol.",
      },
      {
        type: "list",
        items: [
          "The original license notice and copyright attribution are included in all copies or substantial portions of the Software.",
        ]
      },
      {
        type: "Provided that:",
        text: "This license is provided “as is”, without warranty of any kind, express or implied. See the full license text for details.",
      },
    ]
  },
  {
    heading: "3. Contributor Licensing and Attribution",
    content: [
      {
        type: "paragraph",
        text: "All contributions made to official XaoDAO repositories are presumed to be:",
       },
      {
        type: "list",
        items: [
          "Submitted under the MIT License",
          "Subject to DAO governance approval or peer merge protocols",
          "Attributed to the contributor’s wallet address, DID, or pseudonym as published in commit logs, pull requests, or contributor registries",
        ]
      },
      {
        type: "paragraph",
        text: "Contributors retain personal copyright over their own work but grant XaoDAO and the public irrevocable, perpetual rights under the MIT License.",
      },
    ]
  },
  {
    heading: "Pseudonymous Contributors",
    content: [{
        type: "paragraph",
        text: "Contributions from pseudonymous individuals are treated with equal validity under the License. DAO governance may assign authorship or licensing intent based on verified signatures, merge records, or proposal votes.",
      },
    ],
  },
  {
    heading: "4. Third-Party Dependencies",
    content: [
      {
        type: "paragraph",
        text: "Where dependencies are used, their original licenses must be respected. Any inclusion of third-party code within XaoDAO repositories must:",
      },
      {
        type: "list",
        items: [
          "Be license-compatible with the MIT License",
          "Clearly indicate the original license and authorship",
          "Be reviewed for governance approval if non-permissive",
        ]
      },
      {
        type: "paragraph",
        text: "If you identify a licensing conflict or unauthorized use of third-party IP, please report it via the XaoDAO governance forum for public review.",
      },
    ]
  },
  {
    heading: "5. Enforcement and Governance",
    content: [
      {
        type: "paragraph",
        text: "XaoDAO enforces open source licensing principles through:",
      },
      {
        type: "list",
        items: [
          "DAO votes governing repository ownership and licensing changes",
          "Contributor License Agreements (CLAs) where applicable",
          "Public review of disputes via proposal and forum processes",
        ]
      },
      {
        type: "paragraph",
        text: "Changes to the protocol’s default license (e.g., switching from MIT to another open license) must be ratified by a valid DAO vote and clearly reflected in repository LICENSE files and associated documentation.",
       },
    ]
  },
  {
    heading: "6. Disclaimer",
    content: [
      {
        type: "paragraph",
        text: "BThis License Declaration does not constitute legal advice. XaoDAO disclaims all warranties and liabilities associated with use, distribution, or reliance on any licensed materials. Users and contributors are advised to seek independent counsel where appropriate.",
      },
    ]
  },
],},
];
