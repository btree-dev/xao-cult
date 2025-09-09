//public-information-services/publinfodata.ts
export const mainGenres = ["Rock", "Pop", "HipHop", "Electronic"];

export const publicDocs =[
{
    username: "ABC",
    walletAddresses: ["0x123...", "0x456...", "0x789..."], 
    selectedWalletAddress: "", 
    didEth: "did:eth:ABC",
    didWeb: "did:web:ABC",
    location: "Lahore",
    radius: "50 Miles",
    selectedGenres: [] as string[],
  },
  {
    username: "Alice",
    walletAddresses: ["0x123...", "0x456...", "0x789..."], 
    selectedWalletAddress: "0x123...", 
    didEth: "did:eth:alice",
    didWeb: "did:web:alice.xyz",
    location: "NY",
    radius: "25 Miles",
    selectedGenres: ["Rock"],
  },
  {
    username: "Bob",
    walletAddresses: ["0x999...", "0x888..."],
    selectedWalletAddress: "0x999...",
    didEth: "did:eth:bob",
    didWeb: "did:web:bob.eth",
    location: "LA",
    radius: "100 Miles",
    selectedGenres: ["Electronic", "Pop"],
  },
  ]