//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

import {SuperTokenV1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

contract SuperPayroll {
    using SuperTokenV1Library for ISuperToken;
    ISuperToken public token;

    address public employer;

    uint256 public currentEmployeeId;

    struct Employee {
        uint256 id;
        string name;
        uint8 age;
        string contactAddress;
        string country;
        address addr;
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
        address addr,
        address employer
    );

    event EmployeeDeleted(uint256 id, address addr, address employer);
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

    modifier employeeExists(address _addr) {
        require(employees[_addr].isExists, "Employee does not exist");
        _;
    }

    function addEmployee(
        string memory _name,
        uint8 _age,
        string memory _contactAddress,
        string memory _country,
        address _addr
    ) public onlyEmployer {
        // employee must not exist
        require(!employees[_addr].isExists, "Employee already exists");

        // add employee to mapping
        employees[_addr] = Employee(
            currentEmployeeId,
            _name,
            _age,
            _contactAddress,
            _country,
            _addr,
            employer,
            true
        );

        // emit event
        emit EmployeeAdded(
            currentEmployeeId,
            _name,
            _age,
            _contactAddress,
            _country,
            _addr,
            employer
        );

        // increment employee id
        currentEmployeeId++;
    }

    function deleteEmployee(
        address _addr
    ) public onlyEmployer employeeExists(_addr) {
        // delete employee from mapping
        delete employees[_addr];

        // emit event
        emit EmployeeDeleted(employees[_addr].id, _addr, employer);
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
        token.deleteFlow(address(this), _employeeWalletAddress);

        // emit event
        emit FlowUpdated(address(token), msg.sender, _employeeWalletAddress, 0);
    }
}
