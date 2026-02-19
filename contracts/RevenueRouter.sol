// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAgentRegistryRouter {
    function ownerOf(uint256 tokenId) external view returns (address);
    function recordRevenue(uint256 agentId, uint256 amount) external;
    function recordUsage(uint256 agentId, uint256 uses) external;
}

contract RevenueRouter is Ownable, ReentrancyGuard {

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 rewardPerTokenPaid;
    }

    address public realmToken;
    address public registry;
    address public launchpad;
    address public treasury;

    uint256 public constant CREATOR_SHARE = 7000;
    uint256 public constant STAKER_SHARE = 2000;
    uint256 public constant TREASURY_SHARE = 1000;

    mapping(uint256 => uint256) public creatorPending;
    uint256 public totalStakerRevenue;
    uint256 public totalTreasuryRevenue;

    uint256 public totalStaked;
    mapping(address => StakeInfo) public stakes;
    uint256 public rewardPerTokenStored;
    uint256 public constant MIN_STAKE = 10 * 1e18;

    uint256 public totalBurned;
    uint256 public burnRate = 200;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    event FeeReceived(uint256 indexed agentId, uint256 amount);
    event PaymentReceived(uint256 indexed agentId, address indexed payer, uint256 amount);
    event CreatorClaimed(uint256 indexed agentId, address indexed creator, uint256 amount);
    event StakerRewardClaimed(address indexed staker, uint256 amount);
    event TreasuryDistributed(uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event TokensBurned(uint256 amount, uint256 totalBurned);
    event BurnRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _realmToken, address _registry, address _treasury) Ownable(msg.sender) {
        require(_realmToken != address(0), "Router: REALM zero");
        require(_registry != address(0), "Router: registry zero");
        require(_treasury != address(0), "Router: treasury zero");
        realmToken = _realmToken;
        registry = _registry;
        treasury = _treasury;
    }

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "Router: only launchpad");
        _;
    }

    modifier updateReward(address user) {
        if (user != address(0)) {
            StakeInfo storage s = stakes[user];
            if (s.amount > 0) {
                uint256 pending = (s.amount * (rewardPerTokenStored - s.rewardPerTokenPaid)) / 1e18;
                s.rewardDebt += pending;
            }
            s.rewardPerTokenPaid = rewardPerTokenStored;
        }
        _;
    }

    function recordFee(uint256 agentId, uint256 amount) external onlyLaunchpad {
        _distribute(agentId, amount);
        emit FeeReceived(agentId, amount);
        IAgentRegistryRouter(registry).recordRevenue(agentId, amount);
    }

    function payForService(uint256 agentId, uint256 amount) external nonReentrant {
        require(amount > 0, "Router: zero amount");
        require(IERC20(realmToken).transferFrom(msg.sender, address(this), amount), "Router: transfer failed");
        _distribute(agentId, amount);
        emit PaymentReceived(agentId, msg.sender, amount);
        IAgentRegistryRouter(registry).recordRevenue(agentId, amount);
        IAgentRegistryRouter(registry).recordUsage(agentId, 1);
    }

    function _distribute(uint256 agentId, uint256 amount) internal {
        uint256 burnAmount = (amount * burnRate) / 10000;
        uint256 distributable = amount - burnAmount;

        if (burnAmount > 0) {
            IERC20(realmToken).transfer(BURN_ADDRESS, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(burnAmount, totalBurned);
        }

        uint256 creatorAmount = (distributable * CREATOR_SHARE) / 10000;
        uint256 stakerAmount = (distributable * STAKER_SHARE) / 10000;
        uint256 treasuryAmount = distributable - creatorAmount - stakerAmount;

        creatorPending[agentId] += creatorAmount;
        _distributeToStakers(stakerAmount);

        if (treasuryAmount > 0) {
            IERC20(realmToken).transfer(treasury, treasuryAmount);
            totalTreasuryRevenue += treasuryAmount;
            emit TreasuryDistributed(treasuryAmount);
        }
    }

    function _distributeToStakers(uint256 amount) internal {
        if (totalStaked == 0 || amount == 0) {
            if (amount > 0) {
                IERC20(realmToken).transfer(treasury, amount);
                totalTreasuryRevenue += amount;
            }
            return;
        }
        rewardPerTokenStored += (amount * 1e18) / totalStaked;
        totalStakerRevenue += amount;
    }

    function claimCreatorRevenue(uint256 agentId) external nonReentrant {
        require(IAgentRegistryRouter(registry).ownerOf(agentId) == msg.sender, "Router: not agent owner");
        uint256 amount = creatorPending[agentId];
        require(amount > 0, "Router: nothing to claim");
        creatorPending[agentId] = 0;
        require(IERC20(realmToken).transfer(msg.sender, amount), "Router: transfer failed");
        emit CreatorClaimed(agentId, msg.sender, amount);
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount >= MIN_STAKE, "Router: below min stake");
        require(IERC20(realmToken).transferFrom(msg.sender, address(this), amount), "Router: transfer failed");
        stakes[msg.sender].amount += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Router: zero amount");
        require(stakes[msg.sender].amount >= amount, "Router: insufficient stake");
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        require(IERC20(realmToken).transfer(msg.sender, amount), "Router: transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    function claimStakerReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = stakes[msg.sender].rewardDebt;
        require(reward > 0, "Router: no rewards");
        stakes[msg.sender].rewardDebt = 0;
        require(IERC20(realmToken).transfer(msg.sender, reward), "Router: transfer failed");
        emit StakerRewardClaimed(msg.sender, reward);
    }

    function pendingReward(address user) external view returns (uint256) {
        StakeInfo storage s = stakes[user];
        uint256 pending = (s.amount * (rewardPerTokenStored - s.rewardPerTokenPaid)) / 1e18;
        return s.rewardDebt + pending;
    }

    function pendingCreatorRevenue(uint256 agentId) external view returns (uint256) {
        return creatorPending[agentId];
    }

    function estimatedAPY() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        return (totalStakerRevenue * 10000) / totalStaked;
    }

    function setLaunchpad(address _launchpad) external onlyOwner {
        require(_launchpad != address(0), "Router: zero");
        launchpad = _launchpad;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Router: zero");
        treasury = _treasury;
    }

    function setBurnRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 500, "Router: max 5%");
        uint256 oldRate = burnRate;
        burnRate = _newRate;
        emit BurnRateUpdated(oldRate, _newRate);
    }
}
