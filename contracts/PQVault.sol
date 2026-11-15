// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IQorePQC.sol";

contract PQVault {
    IQorePQC constant PQC_STATUS = IQorePQC(0x0000000000000000000000000000000000000a02);

    address public owner;
    mapping(address => uint256) public balances;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyPQCVerified() {
        (bool registered, , , bool possessionProven) = PQC_STATUS.pqcKeyStatus(msg.sender);
        require(registered, "Sender must have a registered PQC key");
        require(possessionProven, "PQC key must have proof of possession");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external onlyPQCVerified {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function withdrawAll() external onlyOwner onlyPQCVerified {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw");
        balances[owner] = 0;
        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Transfer failed");
        emit Withdrawn(owner, amount);
    }

    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
