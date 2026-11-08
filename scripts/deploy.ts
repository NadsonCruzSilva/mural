import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
const { ethers } = await network.create();
const chainId = Number((await ethers.provider.getNetwork()).chainId);
if (chainId !== 31337)
  throw new Error(
    "Este script implanta somente no Hardhat local. Na Sepolia, use Remix e MetaMask conforme o README.",
  );
const [signer] = await ethers.getSigners();
if (!signer) throw new Error("Inicie o nó Hardhat local com npm run node.");
const contract = await ethers.deployContract("Mural", [], signer);
await contract.waitForDeployment();
const receipt = await contract.deploymentTransaction()!.wait(1);
if (!receipt || receipt.status !== 1) throw new Error("A implantação falhou.");
const address = await contract.getAddress();
await mkdir("src/generated", { recursive: true });
await writeFile(
  "src/generated/deployment.json",
  JSON.stringify(
    { address, chainId, deploymentBlock: receipt.blockNumber },
    null,
    2,
  ) + "\n",
);
await writeFile(
  "src/generated/abi.json",
  contract.interface.formatJson() + "\n",
);
console.log(
  `Mural implantado: ${address}\nRede: ${chainId}\nBloco: ${receipt.blockNumber}`,
);
