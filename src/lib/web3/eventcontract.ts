export const EVENT_CONTRACT_FACTORY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "addr", type: "address" },
      { indexed: true, internalType: "address", name: "p1", type: "address" },
      { indexed: true, internalType: "address", name: "p2", type: "address" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
    ],
    name: "ContractCreated",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "contracts",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_p1Name", type: "string" },
      { internalType: "address", name: "_p2Addr", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "announce", type: "uint256" },
          { internalType: "uint256", name: "show", type: "uint256" },
          { internalType: "uint256", name: "loadIn", type: "uint256" },
          { internalType: "uint256", name: "doors", type: "uint256" },
          { internalType: "uint256", name: "start", type: "uint256" },
          { internalType: "uint256", name: "end", type: "uint256" },
          { internalType: "uint256", name: "setTime", type: "uint256" },
          { internalType: "uint256", name: "setLength", type: "uint256" },
        ],
        internalType: "struct EventContract.DatesAndTimes",
        name: "_dates",
        type: "tuple",
      },
      {
        components: [
          { internalType: "string", name: "venue", type: "string" },
          { internalType: "string", name: "addr", type: "string" },
          { internalType: "uint256", name: "radius", type: "uint256" },
          { internalType: "uint256", name: "days1", type: "uint256" },
        ],
        internalType: "struct EventContract.Location",
        name: "_location",
        type: "tuple",
      },
      {
        components: [
          { internalType: "bool", name: "enabled", type: "bool" },
          { internalType: "uint256", name: "capacity", type: "uint256" },
          { internalType: "uint256", name: "taxPct", type: "uint256" },
          { internalType: "uint256", name: "typeCount", type: "uint256" },
        ],
        internalType: "struct EventContract.TicketConfig",
        name: "_config",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "p1Pct", type: "uint256" },
          { internalType: "uint256", name: "p2Pct", type: "uint256" },
          { internalType: "uint256", name: "rPct", type: "uint256" },
        ],
        internalType: "struct EventContract.ResaleRules",
        name: "_resale",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "guarantee", type: "uint256" },
          { internalType: "uint256", name: "guaPct", type: "uint256" },
          { internalType: "uint256", name: "backPct", type: "uint256" },
          { internalType: "uint256", name: "barPct", type: "uint256" },
          { internalType: "uint256", name: "merchPct", type: "uint256" },
        ],
        internalType: "struct EventContract.PayInConfig",
        name: "_payIn",
        type: "tuple",
      },
      { internalType: "string", name: "_name", type: "string" },
      { internalType: "string", name: "_imageUri", type: "string" },
      { internalType: "string", name: "_rider", type: "string" },
      { internalType: "string", name: "_legal", type: "string" },
      { internalType: "string", name: "_ticketLegal", type: "string" },
    ],
    name: "createEventContract",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContracts",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserContractCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserContracts",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "userContracts",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

export const EVENT_CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_p1",
        type: "address",
      },
      {
        internalType: "string",
        name: "_p1n",
        type: "string",
      },
      {
        internalType: "address",
        name: "_p2",
        type: "address",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "announce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "show",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "loadIn",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "doors",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "start",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "end",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "setTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "setLength",
            type: "uint256",
          },
        ],
        internalType: "struct EventContract.DatesAndTimes",
        name: "_d",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "string",
            name: "venue",
            type: "string",
          },
          {
            internalType: "string",
            name: "addr",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "radius",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "days1",
            type: "uint256",
          },
        ],
        internalType: "struct EventContract.Location",
        name: "_l",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "bool",
            name: "enabled",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "capacity",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "taxPct",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "typeCount",
            type: "uint256",
          },
        ],
        internalType: "struct EventContract.TicketConfig",
        name: "_c",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "p1Pct",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "p2Pct",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "rPct",
            type: "uint256",
          },
        ],
        internalType: "struct EventContract.ResaleRules",
        name: "_r",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "guarantee",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "guaPct",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "backPct",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "barPct",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "merchPct",
            type: "uint256",
          },
        ],
        internalType: "struct EventContract.PayInConfig",
        name: "_pi",
        type: "tuple",
      },
      {
        internalType: "string",
        name: "_n",
        type: "string",
      },
      {
        internalType: "string",
        name: "_i",
        type: "string",
      },
      {
        internalType: "string",
        name: "_rd",
        type: "string",
      },
      {
        internalType: "string",
        name: "_lg",
        type: "string",
      },
      {
        internalType: "string",
        name: "_tl",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "by",
        type: "address",
      },
    ],
    name: "Cancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "time",
        type: "uint256",
      },
    ],
    name: "CheckedIn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "signer",
        type: "address",
      },
    ],
    name: "ContractSigned",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "grantor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "email",
        type: "string",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "typeId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "qty",
        type: "uint256",
      },
    ],
    name: "EmailRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amt",
        type: "uint256",
      },
    ],
    name: "RefundIssued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "typeId",
        type: "uint256",
      },
    ],
    name: "TicketIssued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "typeId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "qty",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "total",
        type: "uint256",
      },
    ],
    name: "TicketPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "free",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
    ],
    name: "TicketTypeAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "grantor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "typeId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "total",
        type: "uint256",
      },
    ],
    name: "TicketsGranted",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_name",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_saleDate",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_count",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_price",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_free",
        type: "bool",
      },
    ],
    name: "addTicketType",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_typeId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_qty",
        type: "uint256",
      },
    ],
    name: "buyTickets",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "cancelContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256[]",
        name: "_ids",
        type: "uint256[]",
      },
    ],
    name: "checkInMultiple",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_id",
        type: "uint256",
      },
    ],
    name: "checkInTicket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "config",
    outputs: [
      {
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "capacity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "taxPct",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "typeCount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "dates",
    outputs: [
      {
        internalType: "uint256",
        name: "announce",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "show",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "loadIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "doors",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "start",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "end",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "setTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "setLength",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "emailRegistry",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCheckedInCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getRefund",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_typeId",
        type: "uint256",
      },
    ],
    name: "getSold",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_id",
        type: "uint256",
      },
    ],
    name: "getTicketInfo",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTicketTypeCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTicketTypes",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "name",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "saleDate",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "count",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "price",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "free",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "gross",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "tax",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "gas_",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "fee",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "net",
            type: "uint256",
          },
        ],
        internalType: "struct EventContract.TicketType[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getTickets",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_typeId",
        type: "uint256",
      },
    ],
    name: "getUserTicketCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_email",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_typeId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_qty",
        type: "uint256",
      },
    ],
    name: "grantFreeTicketByEmail",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_recipients",
        type: "address[]",
      },
      {
        internalType: "uint256",
        name: "_typeId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_qty",
        type: "uint256",
      },
    ],
    name: "grantFreeTickets",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "imageUri",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_id",
        type: "uint256",
      },
    ],
    name: "isCheckedIn",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "legal",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "location",
    outputs: [
      {
        internalType: "string",
        name: "venue",
        type: "string",
      },
      {
        internalType: "string",
        name: "addr",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "radius",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "days1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "p1Signed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "p2Signed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "party1",
    outputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "party2",
    outputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "payIn",
    outputs: [
      {
        internalType: "uint256",
        name: "guarantee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "guaPct",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "backPct",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "barPct",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "merchPct",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "refunds",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "registry",
    outputs: [
      {
        internalType: "uint16",
        name: "typeId",
        type: "uint16",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "bool",
        name: "checkedIn",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "purchaseDate",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "checkInDate",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "resale",
    outputs: [
      {
        internalType: "uint256",
        name: "p1Pct",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "p2Pct",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "rPct",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "revenue",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rider",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_name",
        type: "string",
      },
    ],
    name: "setP2Name",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_name",
        type: "string",
      },
    ],
    name: "signContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "sold",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "status",
    outputs: [
      {
        internalType: "enum EventContract.ContractStatus",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ticketLegal",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "tickets",
    outputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "saleDate",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "free",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "gross",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "tax",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "gas_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "net",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalIssued",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "userTickets",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
