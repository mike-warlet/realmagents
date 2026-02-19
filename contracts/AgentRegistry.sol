// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AgentRegistry is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {

    enum AgentCategory { DEFI, ANALYTICS, AUTOMATION, CUSTOM }
    enum VerificationStatus { COMMUNITY, PENDING, VERIFIED }

    struct AgentInfo {
        address creator;
        AgentCategory category;
        VerificationStatus status;
        string metadataURI;
        uint256 createdAt;
        uint256 totalRevenue;
        uint256 totalUses;
        uint256 reputationScore;
        bool active;
        address agentWallet;
        address tokenAddress;
    }

    uint256 public agentCount;
    mapping(uint256 => AgentInfo) public agents;
    uint256 public registrationFee;
    address public realmToken;
    address public launchpad;
    address public revenueRouter;
    mapping(address => uint256[]) public creatorAgents;
    uint256 public constant MAX_AGENTS_PER_CREATOR = 50;

    event AgentRegistered(uint256 indexed agentId, address indexed creator, AgentCategory category, string metadataURI, address agentWallet);
    event AgentUpdated(uint256 indexed agentId, string newMetadataURI);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);
    event AgentVerified(uint256 indexed agentId);
    event AgentVerificationRequested(uint256 indexed agentId);
    event ReputationUpdated(uint256 indexed agentId, uint256 newScore);
    event RevenueRecorded(uint256 indexed agentId, uint256 amount, uint256 totalRevenue);
    event UsageRecorded(uint256 indexed agentId, uint256 uses, uint256 totalUses);
    event TokenAddressSet(uint256 indexed agentId, address tokenAddress);
    event LaunchpadSet(address indexed launchpad);
    event RevenueRouterSet(address indexed revenueRouter);
    event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(
        address _realmToken,
        uint256 _registrationFee
    ) ERC721("RealmAgent", "RAGENT") Ownable(msg.sender) {
        require(_realmToken != address(0), "AgentRegistry: REALM zero");
        realmToken = _realmToken;
        registrationFee = _registrationFee;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(ownerOf(agentId) == msg.sender, "AgentRegistry: not agent owner");
        _;
    }

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "AgentRegistry: only launchpad");
        _;
    }

    modifier onlyRevenueRouter() {
        require(msg.sender == revenueRouter, "AgentRegistry: only revenue router");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(agentId < agentCount, "AgentRegistry: agent does not exist");
        _;
    }

    function registerAgent(
        AgentCategory category,
        string calldata metadataURI,
        address agentWallet
    ) external nonReentrant returns (uint256 agentId) {
        require(bytes(metadataURI).length > 0, "AgentRegistry: empty metadata");
        require(agentWallet != address(0), "AgentRegistry: wallet zero");
        require(creatorAgents[msg.sender].length < MAX_AGENTS_PER_CREATOR, "AgentRegistry: max agents reached");

        if (registrationFee > 0) {
            uint256 burnAmount = registrationFee / 2;
            uint256 treasuryAmount = registrationFee - burnAmount;
            require(IERC20(realmToken).transferFrom(msg.sender, address(0xdead), burnAmount), "AgentRegistry: burn transfer failed");
            require(IERC20(realmToken).transferFrom(msg.sender, owner(), treasuryAmount), "AgentRegistry: treasury transfer failed");
        }

        agentId = agentCount;
        agentCount++;

        agents[agentId] = AgentInfo({
            creator: msg.sender,
            category: category,
            status: VerificationStatus.COMMUNITY,
            metadataURI: metadataURI,
            createdAt: block.timestamp,
            totalRevenue: 0,
            totalUses: 0,
            reputationScore: 5000,
            active: true,
            agentWallet: agentWallet,
            tokenAddress: address(0)
        });

        creatorAgents[msg.sender].push(agentId);
        _safeMint(msg.sender, agentId);
        emit AgentRegistered(agentId, msg.sender, category, metadataURI, agentWallet);
    }

    function updateMetadata(uint256 agentId, string calldata newMetadataURI) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(bytes(newMetadataURI).length > 0, "AgentRegistry: empty metadata");
        agents[agentId].metadataURI = newMetadataURI;
        emit AgentUpdated(agentId, newMetadataURI);
    }

    function deactivateAgent(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(agents[agentId].active, "AgentRegistry: already inactive");
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function reactivateAgent(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(!agents[agentId].active, "AgentRegistry: already active");
        agents[agentId].active = true;
        emit AgentReactivated(agentId);
    }

    function updateAgentWallet(uint256 agentId, address newWallet) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(newWallet != address(0), "AgentRegistry: wallet zero");
        agents[agentId].agentWallet = newWallet;
    }

    function requestVerification(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        AgentInfo storage a = agents[agentId];
        require(a.active, "AgentRegistry: agent inactive");
        require(a.status == VerificationStatus.COMMUNITY, "AgentRegistry: not community status");
        require(block.timestamp >= a.createdAt + 30 days, "AgentRegistry: too new (need 30 days)");
        require(a.totalRevenue > 0, "AgentRegistry: no revenue yet");
        a.status = VerificationStatus.PENDING;
        emit AgentVerificationRequested(agentId);
    }

    function approveVerification(uint256 agentId) external agentExists(agentId) onlyOwner {
        require(agents[agentId].status == VerificationStatus.PENDING, "AgentRegistry: not pending");
        agents[agentId].status = VerificationStatus.VERIFIED;
        emit AgentVerified(agentId);
    }

    function rejectVerification(uint256 agentId) external agentExists(agentId) onlyOwner {
        require(agents[agentId].status == VerificationStatus.PENDING, "AgentRegistry: not pending");
        agents[agentId].status = VerificationStatus.COMMUNITY;
    }

    function recordRevenue(uint256 agentId, uint256 amount) external agentExists(agentId) onlyRevenueRouter {
        agents[agentId].totalRevenue += amount;
        emit RevenueRecorded(agentId, amount, agents[agentId].totalRevenue);
    }

    function recordUsage(uint256 agentId, uint256 uses) external agentExists(agentId) onlyRevenueRouter {
        agents[agentId].totalUses += uses;
        emit UsageRecorded(agentId, uses, agents[agentId].totalUses);
    }

    function updateReputation(uint256 agentId, uint256 newScore) external agentExists(agentId) onlyOwner {
        require(newScore <= 10000, "AgentRegistry: score max 10000");
        agents[agentId].reputationScore = newScore;
        emit ReputationUpdated(agentId, newScore);
    }

    function setAgentToken(uint256 agentId, address _tokenAddress) external agentExists(agentId) onlyLaunchpad {
        require(agents[agentId].tokenAddress == address(0), "AgentRegistry: token already set");
        require(_tokenAddress != address(0), "AgentRegistry: token zero");
        agents[agentId].tokenAddress = _tokenAddress;
        emit TokenAddressSet(agentId, _tokenAddress);
    }

    function setLaunchpad(address _launchpad) external onlyOwner {
        require(_launchpad != address(0), "AgentRegistry: zero");
        launchpad = _launchpad;
        emit LaunchpadSet(_launchpad);
    }

    function setRevenueRouter(address _revenueRouter) external onlyOwner {
        require(_revenueRouter != address(0), "AgentRegistry: zero");
        revenueRouter = _revenueRouter;
        emit RevenueRouterSet(_revenueRouter);
    }

    function setRegistrationFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = registrationFee;
        registrationFee = _newFee;
        emit RegistrationFeeUpdated(oldFee, _newFee);
    }

    function getCreatorAgents(address creator) external view returns (uint256[] memory) {
        return creatorAgents[creator];
    }

    function getAgent(uint256 agentId) external view agentExists(agentId) returns (AgentInfo memory) {
        return agents[agentId];
    }

    function isVerifiedAndActive(uint256 agentId) external view returns (bool) {
        if (agentId >= agentCount) return false;
        AgentInfo storage a = agents[agentId];
        return a.active && a.status == VerificationStatus.VERIFIED;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < agentCount, "AgentRegistry: nonexistent token");
        return agents[tokenId].metadataURI;
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
