import { readFile, writeFile, mkdir } from "node:fs/promises";
const artifact = JSON.parse(
  await readFile("artifacts/contracts/Mural.sol/Mural.json", "utf8"),
);
await mkdir("src/generated", { recursive: true });
await writeFile(
  "src/generated/abi.json",
  JSON.stringify(artifact.abi, null, 2) + "\n",
);
console.log("ABI exportada para o frontend.");
