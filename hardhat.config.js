require('@nomicfoundation/hardhat-toolbox');
require("dotenv").config();

task("deploy", "Deploys Contract", async () => {
  const contractFactory = await ethers.getContractFactory("SuperPayroll");
  const contract = await contractFactory.deploy("0x59988e47A3503AaFaA0368b9deF095c818Fdca01");
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
      url: "https://rpc.ankr.com/gnosis",
      accounts: [process.env.PRIV_KEY],
    }
  }
};