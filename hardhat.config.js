require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    // console.log(account.address);
    // console.log(account);
    const address = await account.getAddress();
    const balance = await account.provider.getBalance(address);
    const balanceETH = hre.ethers.formatEther(balance)
    console.log(account);
    console.log(address + " : " + balanceETH);
  }
});
module.exports = {
  solidity: "0.8.24",
  defaultNetwork: "polygon",
  networks: {
    hardhat: {
    },
    polygon: {
      url: `https://polygon-amoy.infura.io/v3/${process.env.URL}`,
      chainId: 80002,
      accounts: [`0x${process.env.PRIVATE_KEY}`]
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    url: ""
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
  },

};
