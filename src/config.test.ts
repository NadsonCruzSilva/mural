import { describe, expect, it } from "vitest";
import { resolveDeployment } from "./config";
const address = "0x1234567890123456789012345678901234567890";
const local = { address, chainId: 31337, deploymentBlock: 1 };
describe("public deployment configuration", () => {
  it("preserves existing deployments when public fields are blank", () => {
    expect(resolveDeployment({})).toBeUndefined();
    expect(resolveDeployment({ VITE_CONTRACT_ADDRESS: " " }, local)).toEqual(
      local,
    );
  });
  it("selects Sepolia using only public address and block, overriding a local deployment", () => {
    expect(
      resolveDeployment(
        {
          VITE_CONTRACT_ADDRESS: ` ${address} `,
          VITE_DEPLOYMENT_BLOCK: " 123456 ",
        },
        local,
      ),
    ).toEqual({ address, chainId: 11155111, deploymentBlock: 123456 });
  });
  it("rejects invalid explicit configuration without silently using an older deployment", () => {
    for (const block of [
      undefined,
      "",
      "-1",
      "0",
      "1.5",
      "abc",
      "1e8",
      "9007199254740992",
    ])
      expect(
        resolveDeployment(
          { VITE_CONTRACT_ADDRESS: address, VITE_DEPLOYMENT_BLOCK: block },
          local,
        ),
      ).toBeUndefined();
    for (const invalid of ["not-an-address", "0x" + "0".repeat(40)])
      expect(
        resolveDeployment(
          { VITE_CONTRACT_ADDRESS: invalid, VITE_DEPLOYMENT_BLOCK: "123" },
          local,
        ),
      ).toBeUndefined();
  });
});
