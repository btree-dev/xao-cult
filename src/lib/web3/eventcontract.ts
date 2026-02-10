export const EVENT_CONTRACT_FACTORY_ABI =[
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "contractAddress",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "party1",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "party2",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "eventName",
          "type": "string"
        }
      ],
      "name": "ContractCreated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "allContracts",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userContracts",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_party1Username",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "_party2Address",
          "type": "address"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "eventAnnouncement",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "showDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "loadIn",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "doors",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "setTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "setLength",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.DatesAndTimes",
          "name": "_dates",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "string",
              "name": "venueName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "physicalAddress",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "radiusMiles",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "radiusDays",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.Location",
          "name": "_location",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "bool",
              "name": "ticketsEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "totalCapacity",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "salesTaxPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ticketTypeCount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.TicketConfig",
          "name": "_ticketConfig",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "party1Percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "party2Percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "resellerPercentage",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.ResaleRules",
          "name": "_resaleRules",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "guaranteeAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "guaranteePercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "backendPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "barSplitPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "merchSplitPercentage",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PayInConfig",
          "name": "_payIn",
          "type": "tuple"
        },
        {
          "internalType": "string",
          "name": "_eventName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_eventImageUri",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "_genres",
          "type": "string[]"
        },
        {
          "internalType": "string",
          "name": "_rider",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_contractLegalLanguage",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_ticketLegalLanguage",
          "type": "string"
        }
      ],
      "name": "createEventContract",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAllContracts",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "getUserContracts",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "getContractCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "getUserContractCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    }
  ];

export const EVENT_CONTRACT_ABI = [

    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_party1Address",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "_party1Username",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "_party2Address",
          "type": "address"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "eventAnnouncement",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "showDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "loadIn",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "doors",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "setTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "setLength",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.DatesAndTimes",
          "name": "_dates",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "string",
              "name": "venueName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "physicalAddress",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "radiusMiles",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "radiusDays",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.Location",
          "name": "_location",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "bool",
              "name": "ticketsEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "totalCapacity",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "salesTaxPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ticketTypeCount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.TicketConfig",
          "name": "_ticketConfig",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "party1Percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "party2Percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "resellerPercentage",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.ResaleRules",
          "name": "_resaleRules",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "guaranteeAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "guaranteePercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "backendPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "barSplitPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "merchSplitPercentage",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PayInConfig",
          "name": "_payIn",
          "type": "tuple"
        },
        {
          "internalType": "string",
          "name": "_eventName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_eventImageUri",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "_genres",
          "type": "string[]"
        },
        {
          "internalType": "string",
          "name": "_rider",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_contractLegalLanguage",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_ticketLegalLanguage",
          "type": "string"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "cancelledBy",
          "type": "address"
        }
      ],
      "name": "ContractCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "ContractFullySigned",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "ContractSent",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "signer",
          "type": "address"
        }
      ],
      "name": "ContractSigned",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "ContractUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "ticketTypeName",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "numberOfTickets",
          "type": "uint256"
        }
      ],
      "name": "TicketTypeAdded",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "contractLegalLanguage",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "createdAt",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dates",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "eventAnnouncement",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "showDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "loadIn",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "doors",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "setTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "setLength",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "eventImageUri",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "eventName",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "genres",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "location",
      "outputs": [
        {
          "internalType": "string",
          "name": "venueName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "physicalAddress",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "radiusMiles",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "radiusDays",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "party1",
      "outputs": [
        {
          "internalType": "address",
          "name": "walletAddress",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "party1CancelReceives",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "party1PayOuts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "party1SecurityDeposits",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "party1Signed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "party2",
      "outputs": [
        {
          "internalType": "address",
          "name": "walletAddress",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "party2CancelReceives",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "party2PayOuts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "party2SecurityDeposits",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "party2Signed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "payIn",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "guaranteeAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "guaranteePercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "backendPercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "barSplitPercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "merchSplitPercentage",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "resaleRules",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "party1Percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "party2Percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "resellerPercentage",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "rider",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "status",
      "outputs": [
        {
          "internalType": "enum EventContract.ContractStatus",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ticketConfig",
      "outputs": [
        {
          "internalType": "bool",
          "name": "ticketsEnabled",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "totalCapacity",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "salesTaxPercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "ticketTypeCount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ticketLegalLanguage",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "ticketTypes",
      "outputs": [
        {
          "internalType": "string",
          "name": "ticketTypeName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "onSaleDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "numberOfTickets",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "ticketPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "grossSub",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "taxes",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gas",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "xaoFee",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "netSub",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "updatedAt",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ticketTypeName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_onSaleDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_numberOfTickets",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_ticketPrice",
          "type": "uint256"
        }
      ],
      "name": "addTicketType",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "addParty1SecurityDeposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "addParty2SecurityDeposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "addParty1CancelReceive",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "addParty2CancelReceive",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "addParty1PayOut",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_dateTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "addParty2PayOut",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sendContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_username",
          "type": "string"
        }
      ],
      "name": "signContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "cancelContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_username",
          "type": "string"
        }
      ],
      "name": "setParty2Username",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty1",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "walletAddress",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "username",
              "type": "string"
            }
          ],
          "internalType": "struct EventContract.Party",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty2",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "walletAddress",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "username",
              "type": "string"
            }
          ],
          "internalType": "struct EventContract.Party",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getDates",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "eventAnnouncement",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "showDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "loadIn",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "doors",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "setTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "setLength",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.DatesAndTimes",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getLocation",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "venueName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "physicalAddress",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "radiusMiles",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "radiusDays",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.Location",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTicketConfig",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bool",
              "name": "ticketsEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "totalCapacity",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "salesTaxPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ticketTypeCount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.TicketConfig",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getResaleRules",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "party1Percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "party2Percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "resellerPercentage",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.ResaleRules",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPayIn",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "guaranteeAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "guaranteePercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "backendPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "barSplitPercentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "merchSplitPercentage",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PayInConfig",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getGenres",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTicketTypes",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "ticketTypeName",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "onSaleDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "numberOfTickets",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ticketPrice",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "grossSub",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "taxes",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "xaoFee",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "netSub",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.TicketType[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty1SecurityDeposits",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "dateTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PaymentSchedule[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty2SecurityDeposits",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "dateTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PaymentSchedule[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty1CancelReceives",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "dateTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PaymentSchedule[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty2CancelReceives",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "dateTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PaymentSchedule[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty1PayOuts",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "dateTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PaymentSchedule[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParty2PayOuts",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "dateTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "percentage",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "internalType": "struct EventContract.PaymentSchedule[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTicketTypeCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "calculateTicketTotals",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "grossTotal",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "taxesTotal",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gasTotal",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "xaoFeeTotal",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "netTotal",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractSummary",
      "outputs": [
        {
          "internalType": "address",
          "name": "party1Address",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "party2Address",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "_eventName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "venueName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "showDate",
          "type": "uint256"
        },
        {
          "internalType": "enum EventContract.ContractStatus",
          "name": "_status",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "_party1Signed",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "_party2Signed",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
];  