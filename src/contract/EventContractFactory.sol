// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventContract.sol";

contract EventContractFactory {
    address[] public contracts;
    mapping(address => address[]) public userContracts;
    
    event ContractCreated(address indexed addr, address indexed p1, address indexed p2, string name);
    
    function createEventContract(
        string memory _p1Name,
        address _p2Addr,
        EventContract.DatesAndTimes memory _dates,
        EventContract.Location memory _location,
        EventContract.TicketConfig memory _config,
        EventContract.ResaleRules memory _resale,
        EventContract.PayInConfig memory _payIn,
        string memory _name,
        string memory _imageUri,
        // string[] memory _genres,
        string memory _rider,
        string memory _legal,
        string memory _ticketLegal
    ) external returns (address) {
        require(_resale.p1Pct + _resale.p2Pct + _resale.rPct == 10000, "pct!=100");
        
        EventContract newContract = new EventContract(
            msg.sender,
            _p1Name,
            _p2Addr,
            _dates,
            _location,
            _config,
            _resale,
            _payIn,
            _name,
            _imageUri,
            // _genres,
            _rider,
            _legal,
            _ticketLegal
        );
        
        address contractAddr = address(newContract);
        contracts.push(contractAddr);
        userContracts[msg.sender].push(contractAddr);
        
        if (_p2Addr != address(0)) {
            userContracts[_p2Addr].push(contractAddr);
        }
        
        emit ContractCreated(contractAddr, msg.sender, _p2Addr, _name);
        return contractAddr;
    }
    
    function getContracts() external view returns (address[] memory) {
        return contracts;
    }
    
    function getUserContracts(address _user) external view returns (address[] memory) {
        return userContracts[_user];
    }
    
    function getContractCount() external view returns (uint256) {
        return contracts.length;
    }
    
    function getUserContractCount(address _user) external view returns (uint256) {
        return userContracts[_user].length;
    }
}