require('@nomicfoundation/hardhat-toolbox');
require("dotenv").config();

task("deploy", "Deploys Contract", async () => {
  const contractFactory = await ethers.getContractFactory("SuperPayroll");
  const contract = await contractFactory.deploy("0x42bb40bF79730451B11f6De1CbA222F17b87Afd7");
  await contract.deployed();
  console.log("contract deployed at:", contract.address);
});


module.exports = {
  solidity: "0.8.16",
  defaultNetwork: "local",
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
    },
    testnet: {
      url: process.env.TESTNET_RPC_URL,
      accounts: [process.env.PRIV_KEY],
    }
  }
};