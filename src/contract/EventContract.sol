// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EventContract {
    enum ContractStatus { Draft, Pending, Signed, Cancelled, Completed }
    
    struct Party { address addr; string name; }
    struct DatesAndTimes { uint256 announce; uint256 show; uint256 loadIn; uint256 doors; uint256 start; uint256 end; uint256 setTime; uint256 setLength; }
    struct Location { string venue; string addr; uint256 radius; uint256 days1; }
    struct TicketType { string name; uint256 saleDate; uint256 count; uint256 price; bool free; uint256 gross; uint256 tax; uint256 gas_; uint256 fee; uint256 net; }
    struct TicketConfig { bool enabled; uint256 capacity; uint256 taxPct; uint256 typeCount; }
    struct ResaleRules { uint256 p1Pct; uint256 p2Pct; uint256 rPct; }
    struct PaymentSchedule { uint256 time; uint256 pct; uint256 amt; }
    struct PayInConfig { uint256 guarantee; uint256 guaPct; uint256 backPct; uint256 barPct; uint256 merchPct; }
    struct Ticket { uint16 typeId; address owner; bool checkedIn; uint256 purchaseDate; uint256 checkInDate; }
    
    Party public party1;
    Party public party2;
    DatesAndTimes public dates;
    Location public location;
    TicketConfig public config;
    ResaleRules public resale;
    PayInConfig public payIn;
    
    string public name;
    string public imageUri;
    string public rider;
    string public legal;
    string public ticketLegal;
    
    ContractStatus public status;
    bool public p1Signed;
    bool public p2Signed;
    
    TicketType[] public tickets;
    mapping(uint256 => uint256) public sold;
    mapping(address => mapping(uint256 => uint256)) public userTickets;
    mapping(uint256 => Ticket) public registry;
    mapping(string => mapping(uint256 => uint256)) public emailRegistry;
    uint256 public totalIssued;
    uint256 public revenue;
    mapping(address => uint256) public refunds;
    
    event TicketTypeAdded(string name, uint256 count, bool free, uint256 price);
    event TicketPurchased(address indexed buyer, uint256 indexed typeId, uint256 qty, uint256 total);
    event TicketIssued(uint256 indexed id, address indexed owner, uint256 indexed typeId);
    event TicketsGranted(address indexed grantor, uint256 count, uint256 indexed typeId, uint256 total);
    event EmailRegistered(address indexed grantor, string email, uint256 indexed typeId, uint256 qty);
    event CheckedIn(uint256 indexed id, address indexed owner, uint256 time);
    event RefundIssued(address indexed user, uint256 amt);
    event ContractSigned(address indexed signer);
    event Cancelled(address indexed by);
    
    modifier onlyParty() { require(msg.sender == party1.addr || msg.sender == party2.addr); _; }
    modifier onlyOrg() { require(msg.sender == party1.addr || msg.sender == party2.addr); _; }
    modifier inDraft() { require(status == ContractStatus.Draft); _; }
    modifier signed() { require(status == ContractStatus.Signed); _; }
    
    constructor(
        address _p1, string memory _p1n, address _p2, DatesAndTimes memory _d,
        Location memory _l, TicketConfig memory _c, ResaleRules memory _r,
        PayInConfig memory _pi, string memory _n, string memory _i,
        string memory _rd, string memory _lg, string memory _tl
    ) {
        party1 = Party(_p1, _p1n);
        party2 = Party(_p2, "");
        dates = _d;
        location = _l;
        config = _c;
        resale = _r;
        payIn = _pi;
        name = _n;
        imageUri = _i;
        rider = _rd;
        legal = _lg;
        ticketLegal = _tl;
        status = ContractStatus.Draft;
    }
    
    function addTicketType(string memory _name, uint256 _saleDate, uint256 _count, uint256 _price, bool _free) external onlyParty inDraft {
        require(_count > 0);
        tickets.push(TicketType(_name, _saleDate, _count, _price, _free, 0, 0, 0, 0, 0));
        config.typeCount++;
        emit TicketTypeAdded(_name, _count, _free, _price);
    }
    
    function buyTickets(uint256 _typeId, uint256 _qty) external payable signed {
        require(config.enabled && _typeId < tickets.length && _qty > 0);
        TicketType memory t = tickets[_typeId];
        require(block.timestamp >= t.saleDate && sold[_typeId] + _qty <= t.count && totalIssued + _qty <= config.capacity);
        
        if (t.free) {
            require(msg.value == 0);
        } else {
            uint256 total = _qty * t.price;
            require(msg.value >= total);
            if (msg.value > total) refunds[msg.sender] += msg.value - total;
            revenue += total;
        }
        
        _issueTickets(msg.sender, _typeId, _qty);
        emit TicketPurchased(msg.sender, _typeId, _qty, msg.value);
    }
    
    function grantFreeTickets(address[] calldata _recipients, uint256 _typeId, uint256 _qty) external onlyOrg signed {
        require(config.enabled && _typeId < tickets.length && _qty > 0 && _recipients.length > 0);
        TicketType memory t = tickets[_typeId];
        require(t.free && block.timestamp >= t.saleDate);
        uint256 total = _recipients.length * _qty;
        require(sold[_typeId] + total <= t.count && totalIssued + total <= config.capacity);
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0));
            _issueTickets(_recipients[i], _typeId, _qty);
        }
        sold[_typeId] += total;
        emit TicketsGranted(msg.sender, _recipients.length, _typeId, total);
    }
    
    function grantFreeTicketByEmail(string calldata _email, uint256 _typeId, uint256 _qty) external onlyOrg signed {
        require(config.enabled && _typeId < tickets.length && _qty > 0 && bytes(_email).length > 0);
        TicketType memory t = tickets[_typeId];
        require(t.free && block.timestamp >= t.saleDate && sold[_typeId] + _qty <= t.count && totalIssued + _qty <= config.capacity);
        
        emailRegistry[_email][_typeId] += _qty;
        sold[_typeId] += _qty;
        totalIssued += _qty;
        emit EmailRegistered(msg.sender, _email, _typeId, _qty);
    }
    
    function _issueTickets(address _owner, uint256 _typeId, uint256 _qty) internal {
        require(_owner != address(0));
        for (uint256 i = 0; i < _qty; i++) {
            uint256 id = totalIssued + i;
            registry[id] = Ticket(uint16(_typeId), _owner, false, block.timestamp, 0);
            emit TicketIssued(id, _owner, _typeId);
        }
        userTickets[_owner][_typeId] += _qty;
        totalIssued += _qty;
    }
    
    function checkInTicket(uint256 _id) external onlyOrg {
        require(_id < totalIssued);
        Ticket storage t = registry[_id];
        require(t.owner != address(0) && !t.checkedIn && block.timestamp >= dates.start);
        t.checkedIn = true;
        t.checkInDate = block.timestamp;
        emit CheckedIn(_id, t.owner, block.timestamp);
    }
    
    function checkInMultiple(uint256[] calldata _ids) external onlyOrg {
        require(_ids.length > 0 && block.timestamp >= dates.start);
        for (uint256 i = 0; i < _ids.length; i++) {
            uint256 id = _ids[i];
            require(id < totalIssued);
            Ticket storage t = registry[id];
            require(t.owner != address(0));
            if (!t.checkedIn) {
                t.checkedIn = true;
                t.checkInDate = block.timestamp;
                emit CheckedIn(id, t.owner, block.timestamp);
            }
        }
    }
    
    function claimRefund() external {
        require(refunds[msg.sender] > 0);
        uint256 amt = refunds[msg.sender];
        refunds[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amt}("");
        require(ok);
        emit RefundIssued(msg.sender, amt);
    }
    
    function signContract(string memory _name) external onlyParty {
        require(status == ContractStatus.Draft || status == ContractStatus.Pending);
        if (msg.sender == party1.addr) {
            require(!p1Signed);
            p1Signed = true;
        } else {
            require(!p2Signed);
            p2Signed = true;
            if (bytes(party2.name).length == 0) party2.name = _name;
        }
        if (status == ContractStatus.Draft && p1Signed) status = ContractStatus.Pending;
        emit ContractSigned(msg.sender);
        if (p1Signed && p2Signed) status = ContractStatus.Signed;
    }
    
    function cancelContract() external onlyParty {
        require(status != ContractStatus.Cancelled && status != ContractStatus.Completed);
        status = ContractStatus.Cancelled;
        emit Cancelled(msg.sender);
    }
    
    function setP2Name(string memory _name) external {
        require(msg.sender == party2.addr);
        party2.name = _name;
    }
    
    function getTickets(address _user) external view returns (uint256[] memory) {
        uint256[] memory r = new uint256[](totalIssued);
        uint256 c = 0;
        for (uint256 i = 0; i < totalIssued; i++) {
            if (registry[i].owner == _user) {
                r[c] = i;
                c++;
            }
        }
        uint256[] memory f = new uint256[](c);
        for (uint256 i = 0; i < c; i++) f[i] = r[i];
        return f;
    }
    
    function getTicketInfo(uint256 _id) external view returns (uint256, address, string memory, bool, uint256, uint256) {
        require(_id < totalIssued);
        Ticket memory t = registry[_id];
        return (t.typeId, t.owner, tickets[t.typeId].name, t.checkedIn, t.purchaseDate, t.checkInDate);
    }
    
    function isCheckedIn(uint256 _id) external view returns (bool) {
        require(_id < totalIssued);
        return registry[_id].checkedIn;
    }
    
    function getSold(uint256 _typeId) external view returns (uint256) {
        require(_typeId < tickets.length);
        return sold[_typeId];
    }
    
    function getCheckedInCount() external view returns (uint256) {
        uint256 c = 0;
        for (uint256 i = 0; i < totalIssued; i++) {
            if (registry[i].checkedIn) c++;
        }
        return c;
    }
    
    function getUserTicketCount(address _user, uint256 _typeId) external view returns (uint256) {
        return userTickets[_user][_typeId];
    }
    
    function getRefund(address _user) external view returns (uint256) {
        return refunds[_user];
    }
    
    function getTicketTypes() external view returns (TicketType[] memory) {
        return tickets;
    }
    
    function getTicketTypeCount() external view returns (uint256) {
        return tickets.length;
    }
}