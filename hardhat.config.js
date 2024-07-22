require('@nomicfoundation/hardhat-toolbox');
require("dotenv").config();

task("deploy", "Deploys Contract", async () => {
  const contractInstance = await ethers.deployContract("SuperPayroll", ["0x9ce2062b085a2268e8d769ffc040f6692315fd2c"]);
  await contractInstance.waitForDeployment();
  console.log("contract deployed at:", contractInstance.target);
});


module.exports = {
  solidity: "0.8.16",
  defaultNetwork: "local",
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: "https://1rpc.io/sepolia",
      accounts: [process.env.PRIV_KEY],
    }
  }
};