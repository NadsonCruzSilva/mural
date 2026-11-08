import "dotenv/config";
import { defineConfig } from "hardhat/config";
import ethers from "@nomicfoundation/hardhat-ethers";
import nodeTest from "@nomicfoundation/hardhat-node-test-runner";
export default defineConfig({
  plugins: [ethers, nodeTest],
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    default: { type: "edr-simulated", chainType: "l1" },
    localhost: { type: "http", chainType: "l1", url: "http://127.0.0.1:8545" },
  },
});
