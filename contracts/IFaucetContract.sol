// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IFaucetContract { 

    function deposit() external payable returns(bool success);
    function getInitialAmount() external view returns(uint amount);
    function setInitialAmount(uint amount) external;
    function sendFunds(address payable account, uint amount) external;
    function requestSeedFunds() external;
    
    // events
    event OnDeposit(address sender, uint amount);
    event OnRequestSeedFunds(address account, uint amount);
    event OnSendFunds(address account, uint amount);
}