// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./VestingToken.sol";

contract Vesting {
    address public owner;
    VestToken private tokenInstance;

    uint256 public userAllocated;
    uint256 public partnerAllocated;
    uint256 public teamAllocated;

    uint256 public vestingStartTime;
    bool public vestingActive;

    enum Role {
        User,
        Partner,
        Team
    }
    struct VestingSchedule {
        address beneficiary;
        uint256 cliff;
        uint256 duration;
        uint256 totalTokens;
        uint256 widthdrawTokenPerMonth;
        uint256 noOfTokensWithdraw;
    }

    mapping(address => mapping(Role => VestingSchedule))
        public vestingSchedules;

    event VestingStarted(uint256 startTime);
    event TokensWithdrawn(address indexed beneficiary, uint256 amount);
    event BeneficiaryAdded(address indexed beneficiary, Role role);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _tokenInstance) {
        require(
            _tokenInstance != address(0),
            "Token address can't be 0 address."
        );
        tokenInstance = VestToken(_tokenInstance);
        owner = msg.sender;
    }

    function allocateTokens(uint256 tokens) external onlyOwner {
        require(tokens > 0, "Tokens > 0");
        require(tokenInstance.balanceOf(msg.sender) >= tokens, "Firstly Mint the tokens.");
        require(
            tokenInstance.allowance(msg.sender, address(this)) >= tokens,
            "Please give allowance"
        );

        uint256 totalVestedTokens = tokens;
        userAllocated += (50 * totalVestedTokens) / 100;
        partnerAllocated += (25 * totalVestedTokens) / 100;
        teamAllocated += (25 * totalVestedTokens) / 100;
    }

    function addBeneficiary(
        address _beneficiary,
        Role _role,
        uint256 noOfTokens
    ) external onlyOwner {
        require(
            _beneficiary != address(0),
            "Beneficiary address can't be 0 address."
        );
        require(!vestingActive, "Vesting already active.");
        require(
            userAllocated > 0 && partnerAllocated > 0 && teamAllocated > 0,
            "Firslty allocate the Tokens"
        );

        VestingSchedule memory vesting = vestingSchedules[_beneficiary][_role];
        require(vesting.beneficiary != _beneficiary, "Address already exist");

        if (_role == Role.User) {
            vesting.cliff = 300 days;
            vesting.duration = 730 days;
            vesting.widthdrawTokenPerMonth = (noOfTokens * 30 days) / 420 days;
            userAllocated -= noOfTokens;
        } else if (_role == Role.Partner) {
            vesting.cliff = 60 days;
            vesting.duration = 365 days;
            vesting.widthdrawTokenPerMonth = (noOfTokens * 30 days) / 240 days;
            partnerAllocated -= noOfTokens;
        } else if (_role == Role.Team) {
            vesting.cliff = 60 days;
            vesting.duration = 365 days;
            vesting.widthdrawTokenPerMonth = (noOfTokens * 30 days) / 240 days;
            teamAllocated -= noOfTokens;
        }

        vesting.beneficiary = _beneficiary;
        vesting.totalTokens = noOfTokens;
        vestingSchedules[_beneficiary][_role] = vesting;
        emit BeneficiaryAdded(_beneficiary, _role);
    }

    function startVesting() external onlyOwner {
        require(!vestingActive, "Vesting already started.");
        vestingStartTime = block.timestamp;
        vestingActive = true;
        emit VestingStarted(vestingStartTime);
    }

    function checkReleasedTokens(Role _role) public view returns (uint256) {
        require(vestingActive, "Owner does not start the vesting.");
        VestingSchedule memory vest = vestingSchedules[msg.sender][_role];
        require(vest.beneficiary == msg.sender, "Beneficiary not exists.");
        uint256 timeDifference = block.timestamp - vestingStartTime + vest.cliff;
        require(
            block.timestamp > vestingStartTime + vest.cliff,
            "No tokens available yet."
        );

        uint256 avilableTokens = calculatePerMonthTokens(
            timeDifference,
            vest.widthdrawTokenPerMonth
        );
        if (avilableTokens >= vest.totalTokens) {
            return vest.totalTokens - vest.noOfTokensWithdraw;
        }
        return avilableTokens - vest.noOfTokensWithdraw;
    }

    function claimtokens(Role _role) external {
        require(vestingActive, "Owner does not start the vesting.");
        require(checkReleasedTokens(_role) > 0, "No token avialable");
        VestingSchedule memory vest = vestingSchedules[msg.sender][_role];
        require(msg.sender == vest.beneficiary, "Address not matched.");

        vest.noOfTokensWithdraw += checkReleasedTokens(_role);
        tokenInstance.transferFrom(
            owner,
            msg.sender,
            checkReleasedTokens(_role)
        );

        vestingSchedules[msg.sender][_role] = vest;
        if (vest.noOfTokensWithdraw == vest.totalTokens) {
            delete vestingSchedules[msg.sender][_role];
        }
    }

    function calculatePerMonthTokens(uint256 timeDifference, uint256 withdrawAmount)
        private
        pure
        returns (uint256)
    {
        uint256 tokenReleasedTime = (timeDifference / 30 days);
        uint256 withdrawalAmount = withdrawAmount * tokenReleasedTime;

        return withdrawalAmount;
    }
}
