const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Vesting", (m) => {
  const vestToken = m.contract("VestToken");
  const vesting = m.contract("Vesting", [vestToken]);

  return { vestToken, vesting };
});


// VestingToken: https://amoy.polygonscan.com//address/0xD897C319670d83af951B23128b248F67D3c984D7#code

// Vesting: https://amoy.polygonscan.com//address/0x47Ab5F942965EFbeB1c3353b83f9b9a6F1751bee#code