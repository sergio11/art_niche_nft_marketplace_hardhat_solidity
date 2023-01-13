// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./IFaucetContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FaucetContract is Ownable, IFaucetContract {

    uint private _initialAmount = 0.2 ether;
    mapping(address => bool) private accountsAlreadyFunded;
    
    // Public API
    function deposit() public override onlyOwner payable returns(bool success) {
        emit OnDeposit(msg.sender, msg.value);
        return true;
    }

    function getAmount() external view returns(uint amount) {
        return address(this).balance;
    }

    function getInitialAmount() public override view onlyOwner returns(uint amount) {
        return _initialAmount;
    }

    function setInitialAmount(uint amount) public override onlyOwner {
        _initialAmount = amount;
    }

    function sendFunds(address payable account, uint amount) public override onlyOwner shouldBeHaveFunds {
        account.transfer(amount);
        emit OnSendFunds(account, amount);
    }

    function requestSeedFunds() public override accountHasNotAlreadyFunded(msg.sender) {

        payable(msg.sender).transfer(_initialAmount);
        accountsAlreadyFunded[msg.sender] = true;
        emit OnRequestSeedFunds(msg.sender, _initialAmount);
    }
    
    
    // Modifiers
    
    modifier accountHasNotAlreadyFunded(address _account) {
        require(!accountsAlreadyFunded[_account], "Account Has Already Funded");
        _;
    }
    
    modifier shouldBeHaveFunds() {
         require(address(this).balance > 0, "Insuficient Funds");
         _;
    } 

}