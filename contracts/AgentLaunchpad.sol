// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAgentRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function setAgentToken(uint256 agentId, address tokenAddress) external;
}

interface IRevenueRouter {
    function recordFee(uint256 agentId, uint256 amount) external;
}

contract AgentToken is ERC20 {
    address public immutable launchpadAddress;

    constructor(string memory name_, string memory symbol_, address _launchpad) ERC20(name_, symbol_) {
        launchpadAddress = _launchpad;
    }

    modifier onlyLaunchpadCaller() {
        require(msg.sender == launchpadAddress, "AgentToken: only launchpad");
        _;
    }

    function mint(address to, uint256 amount) external onlyLaunchpadCaller {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyLaunchpadCaller {
        _burn(from, amount);
    }
}

contract AgentLaunchpad is Ownable, ReentrancyGuard {

    struct LaunchInfo {
        address tokenAddress;
        uint256 agentId;
        uint256 realmReserve;
        uint256 basePrice;
        uint256 slope;
        uint256 totalVolume;
        uint256 launchedAt;
        bool active;
    }

    address public realmToken;
    address public registry;
    address public revenueRouter;
    mapping(uint256 => LaunchInfo) public launches;
    uint256 public tradeFee = 200;
    uint256 public defaultBasePrice = 1e15;
    uint256 public defaultSlope = 1e14;
    uint256 public launchCount;

    event AgentLaunched(uint256 indexed agentId, address indexed tokenAddress, address indexed creator, uint256 basePrice, uint256 slope);
    event TokensBought(uint256 indexed agentId, address indexed buyer, uint256 realmSpent, uint256 tokensReceived, uint256 newPrice);
    event TokensSold(uint256 indexed agentId, address indexed seller, uint256 tokensSold, uint256 realmReceived, uint256 newPrice);
    event LaunchDeactivated(uint256 indexed agentId);
    event TradeFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _realmToken, address _registry, address _revenueRouter) Ownable(msg.sender) {
        require(_realmToken != address(0), "Launchpad: REALM zero");
        require(_registry != address(0), "Launchpad: registry zero");
        require(_revenueRouter != address(0), "Launchpad: router zero");
        realmToken = _realmToken;
        registry = _registry;
        revenueRouter = _revenueRouter;
    }

    function launchAgent(uint256 agentId, string calldata name, string calldata symbol) external nonReentrant returns (address tokenAddr) {
        require(IAgentRegistry(registry).ownerOf(agentId) == msg.sender, "Launchpad: not agent owner");
        require(launches[agentId].tokenAddress == address(0), "Launchpad: already launched");

        AgentToken token = new AgentToken(name, symbol, address(this));
        tokenAddr = address(token);

        launches[agentId] = LaunchInfo({
            tokenAddress: tokenAddr,
            agentId: agentId,
            realmReserve: 0,
            basePrice: defaultBasePrice,
            slope: defaultSlope,
            totalVolume: 0,
            launchedAt: block.timestamp,
            active: true
        });

        launchCount++;
        IAgentRegistry(registry).setAgentToken(agentId, tokenAddr);
        emit AgentLaunched(agentId, tokenAddr, msg.sender, defaultBasePrice, defaultSlope);
    }

    function buyTokens(uint256 agentId, uint256 realmAmount) external nonReentrant returns (uint256 tokensOut) {
        LaunchInfo storage launch = launches[agentId];
        require(launch.active, "Launchpad: not active");
        require(realmAmount > 0, "Launchpad: zero amount");

        uint256 fee = (realmAmount * tradeFee) / 10000;
        uint256 netAmount = realmAmount - fee;

        require(IERC20(realmToken).transferFrom(msg.sender, address(this), netAmount), "Launchpad: transfer failed");
        if (fee > 0) {
            require(IERC20(realmToken).transferFrom(msg.sender, revenueRouter, fee), "Launchpad: fee transfer failed");
            IRevenueRouter(revenueRouter).recordFee(agentId, fee);
        }

        AgentToken token = AgentToken(launch.tokenAddress);
        uint256 currentSupply = token.totalSupply();
        tokensOut = _calculateBuyTokens(currentSupply, netAmount, launch.basePrice, launch.slope);
        require(tokensOut > 0, "Launchpad: zero tokens out");

        launch.realmReserve += netAmount;
        launch.totalVolume += realmAmount;
        token.mint(msg.sender, tokensOut);

        uint256 newPrice = _currentPrice(token.totalSupply(), launch.basePrice, launch.slope);
        emit TokensBought(agentId, msg.sender, realmAmount, tokensOut, newPrice);
    }

    function sellTokens(uint256 agentId, uint256 tokenAmount) external nonReentrant returns (uint256 realmOut) {
        LaunchInfo storage launch = launches[agentId];
        require(launch.active, "Launchpad: not active");
        require(tokenAmount > 0, "Launchpad: zero amount");

        AgentToken token = AgentToken(launch.tokenAddress);
        require(token.balanceOf(msg.sender) >= tokenAmount, "Launchpad: insufficient balance");

        uint256 currentSupply = token.totalSupply();
        uint256 grossRealm = _calculateSellReturn(currentSupply, tokenAmount, launch.basePrice, launch.slope);
        require(grossRealm > 0, "Launchpad: zero return");
        require(grossRealm <= launch.realmReserve, "Launchpad: insufficient reserve");

        uint256 fee = (grossRealm * tradeFee) / 10000;
        realmOut = grossRealm - fee;

        token.burn(msg.sender, tokenAmount);
        launch.realmReserve -= grossRealm;
        launch.totalVolume += grossRealm;

        require(IERC20(realmToken).transfer(msg.sender, realmOut), "Launchpad: transfer failed");
        if (fee > 0) {
            require(IERC20(realmToken).transfer(revenueRouter, fee), "Launchpad: fee transfer failed");
            IRevenueRouter(revenueRouter).recordFee(agentId, fee);
        }

        uint256 newPrice = _currentPrice(token.totalSupply(), launch.basePrice, launch.slope);
        emit TokensSold(agentId, msg.sender, tokenAmount, realmOut, newPrice);
    }

    function _calculateBuyTokens(uint256 currentSupply, uint256 realmAmount, uint256 basePrice, uint256 slope) internal pure returns (uint256) {
        uint256 s0 = currentSupply;
        if (slope == 0) {
            return (realmAmount * 1e18) / basePrice;
        }
        uint256 b = basePrice + (slope * s0) / 1e18;
        uint256 discriminant = b * b + 2 * slope * realmAmount;
        uint256 sqrtDisc = _sqrt(discriminant);
        uint256 ds = ((sqrtDisc - b) * 1e18) / slope;
        return ds;
    }

    function _calculateSellReturn(uint256 currentSupply, uint256 tokenAmount, uint256 basePrice, uint256 slope) internal pure returns (uint256) {
        require(tokenAmount <= currentSupply, "Launchpad: sell exceeds supply");
        uint256 s0 = currentSupply;
        uint256 s1 = s0 - tokenAmount;
        uint256 ds = s0 - s1;
        uint256 linearPart = (basePrice * ds) / 1e18;
        uint256 quadPart = (slope * (s0 + s1) * ds) / (2 * 1e36);
        return linearPart + quadPart;
    }

    function _currentPrice(uint256 supply, uint256 basePrice, uint256 slope) internal pure returns (uint256) {
        return basePrice + (slope * supply) / 1e18;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function getCurrentPrice(uint256 agentId) external view returns (uint256) {
        LaunchInfo storage launch = launches[agentId];
        require(launch.tokenAddress != address(0), "Launchpad: not launched");
        uint256 supply = AgentToken(launch.tokenAddress).totalSupply();
        return _currentPrice(supply, launch.basePrice, launch.slope);
    }

    function quoteBuy(uint256 agentId, uint256 realmAmount) external view returns (uint256) {
        LaunchInfo storage launch = launches[agentId];
        require(launch.tokenAddress != address(0), "Launchpad: not launched");
        uint256 fee = (realmAmount * tradeFee) / 10000;
        uint256 net = realmAmount - fee;
        uint256 supply = AgentToken(launch.tokenAddress).totalSupply();
        return _calculateBuyTokens(supply, net, launch.basePrice, launch.slope);
    }

    function quoteSell(uint256 agentId, uint256 tokenAmount) external view returns (uint256) {
        LaunchInfo storage launch = launches[agentId];
        require(launch.tokenAddress != address(0), "Launchpad: not launched");
        uint256 supply = AgentToken(launch.tokenAddress).totalSupply();
        uint256 gross = _calculateSellReturn(supply, tokenAmount, launch.basePrice, launch.slope);
        uint256 fee = (gross * tradeFee) / 10000;
        return gross - fee;
    }

    function getLaunch(uint256 agentId) external view returns (LaunchInfo memory) {
        return launches[agentId];
    }

    function setTradeFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Launchpad: fee max 5%");
        uint256 oldFee = tradeFee;
        tradeFee = _newFee;
        emit TradeFeeUpdated(oldFee, _newFee);
    }

    function setRevenueRouter(address _router) external onlyOwner {
        require(_router != address(0), "Launchpad: zero");
        revenueRouter = _router;
    }

    function deactivateLaunch(uint256 agentId) external onlyOwner {
        launches[agentId].active = false;
        emit LaunchDeactivated(agentId);
    }
}
