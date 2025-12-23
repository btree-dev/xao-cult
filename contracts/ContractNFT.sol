// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContractNFT
 * @dev Smart contract for minting contract agreements as NFTs
 * Stores party information, contract terms, and metadata on-chain
 */
contract ContractNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    struct ContractMetadata {
        string party1;
        string party2;
        string terms; // Full contract terms stored on-chain
        uint256 createdAt;
        bool isSigned;
    }

    // Mapping from tokenId to contract metadata
    mapping(uint256 => ContractMetadata) public contractData;

    // Mapping from user address to array of token IDs
    mapping(address => uint256[]) public userNFTs;

    event ContractMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string party1,
        string party2,
        uint256 timestamp
    );

    event ContractSigned(uint256 indexed tokenId, uint256 timestamp);

    constructor() ERC721("XAO Contract NFT", "XAONFT") Ownable(msg.sender) {}

    /**
     * @dev Mint a new contract NFT with on-chain terms
     * @param party1 Name/address of first party
     * @param party2 Name/address of second party
     * @param terms The full contract terms to be stored on-chain
     */
    function mintContractNFT(
        string memory party1,
        string memory party2,
        string memory terms
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(msg.sender, tokenId);

        contractData[tokenId] = ContractMetadata({
            party1: party1,
            party2: party2,
            terms: terms,
            createdAt: block.timestamp,
            isSigned: false
        });

        userNFTs[msg.sender].push(tokenId);

        emit ContractMinted(tokenId, msg.sender, party1, party2, block.timestamp);

        return tokenId;
    }

    /**
     * @dev Mark a contract as signed
     * @param tokenId ID of the NFT
     */
    function signContract(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only owner can sign");
        require(!contractData[tokenId].isSigned, "Contract already signed");

        contractData[tokenId].isSigned = true;
        emit ContractSigned(tokenId, block.timestamp);
    }

    /**
     * @dev Get all NFTs owned by a user
     * @param user Address of the user
     */
    function getUserNFTs(address user) public view returns (uint256[] memory) {
        return userNFTs[user];
    }

    /**
     * @dev Get contract metadata
     * @param tokenId ID of the NFT
     */
    function getContractData(uint256 tokenId)
        public
        view
        returns (ContractMetadata memory)
    {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return contractData[tokenId];
    }

    /**
     * @dev Get total NFTs minted
     */
    function getTotalMinted() public view returns (uint256) {
        return _tokenIdCounter;
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
