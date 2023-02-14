//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

import {SuperTokenV1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

contract SuperPayroll {
    using SuperTokenV1Library for ISuperToken;
    ISuperToken public token;

    address public employer;

    uint256 public employeeCount;

    struct Employee {
        uint256 id;
        string name;
        uint8 age;
        string contactAddress;
        string country;
        address walletAddress;
        address employer;
        bool isExists;
    }

    mapping(address => Employee) public employees;

    constructor(ISuperToken _token) {
        token = _token;
        employer = msg.sender;
    }

    event EmployeeAdded(
        uint256 id,
        string name,
        uint8 age,
        string contactAddress,
        string country,
        address walletAddress,
        address employer
    );

    event EmployeeDeleted(uint256 id, address walletAddress, address employer);
    event FlowUpdated(
        address token,
        address sender,
        address receiver,
        int96 flowRate
    );

    modifier onlyEmployer() {
        require(
            msg.sender == employer,
            "Only employer can call this function."
        );
        _;
    }

    modifier employeeExists(address _walletAddress) {
        require(employees[_walletAddress].isExists, "Employee does not exist");
        _;
    }

    function addEmployee(
        string memory _name,
        uint8 _age,
        string memory _contactAddress,
        string memory _country,
        address _walletAddress
    ) public onlyEmployer {
        // employee must not exist
        require(!employees[_walletAddress].isExists, "Employee already exists");

        // add employee to mapping
        employees[_walletAddress] = Employee(
            employeeCount,
            _name,
            _age,
            _contactAddress,
            _country,
            _walletAddress,
            employer,
            true
        );

        // emit event
        emit EmployeeAdded(
            employeeCount,
            _name,
            _age,
            _contactAddress,
            _country,
            _walletAddress,
            employer
        );

        // increment employee count
        employeeCount++;
    }

    function deleteEmployee(
        address _walletAddress
    ) public onlyEmployer employeeExists(_walletAddress) {
        // delete employee from mapping
        delete employees[_walletAddress];

        // emit event
        emit EmployeeDeleted(
            employees[_walletAddress].id,
            _walletAddress,
            employer
        );
    }

    function createPaymentStream(
        address _employeeWalletAddress,
        int96 _flowRate
    ) public onlyEmployer employeeExists(_employeeWalletAddress) {
        // employee must exist
        require(
            employees[_employeeWalletAddress].isExists,
            "Employee does not exist"
        );

        // create payment stream
        token.createFlow(_employeeWalletAddress, _flowRate);

        // emit event
        emit FlowUpdated(
            address(token),
            msg.sender,
            _employeeWalletAddress,
            _flowRate
        );
    }

    // update payment stream

    function updatePaymentStream(
        address _employeeWalletAddress,
        int96 _flowRate
    ) public onlyEmployer employeeExists(_employeeWalletAddress) {
        // update payment stream
        token.updateFlow(_employeeWalletAddress, _flowRate);

        // emit event
        emit FlowUpdated(
            address(token),
            msg.sender,
            _employeeWalletAddress,
            _flowRate
        );
    }

    function cancelPaymentStream(
        address _employeeWalletAddress
    ) public onlyEmployer employeeExists(_employeeWalletAddress) {
        // cancel payment stream
        token.deleteFlow(msg.sender, _employeeWalletAddress);

        // emit event
        emit FlowUpdated(address(token), msg.sender, _employeeWalletAddress, 0);
    }
}
