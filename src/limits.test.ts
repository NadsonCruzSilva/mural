import { expect, it } from "vitest";
import { ensureMessageLimit, ContractVersionError } from "./limits";
import { readableError } from "./lib";

it("accepts the new contract and rejects a mismatched limit", async () => {
  await expect(ensureMessageLimit(async () => 1500n)).resolves.toBeUndefined();
  await expect(ensureMessageLimit(async () => 280n)).rejects.toBeInstanceOf(
    ContractVersionError,
  );
});
it("explains old deployments without hiding connection failures", async () => {
  for (const code of ["CALL_EXCEPTION", "BAD_DATA"]) {
    await expect(
      ensureMessageLimit(async () => {
        throw { code };
      }),
    ).rejects.toBeInstanceOf(ContractVersionError);
  }
  const offline = Object.assign(new Error("offline"), {
    code: "NETWORK_ERROR",
  });
  await expect(
    ensureMessageLimit(async () => {
      throw offline;
    }),
  ).rejects.toBe(offline);
  expect(readableError(new ContractVersionError())).toContain("1.500");
});
