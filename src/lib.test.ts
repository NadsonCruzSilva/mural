import { describe, it, expect, vi } from "vitest";
import {
  characterCount,
  validMessage,
  readableError,
  metamask,
  connectWallet,
  switchNetwork,
  type InjectedProvider,
} from "./lib";
describe("Unicode validation", () => {
  it("counts scalar values rather than UTF-16 units", () => {
    expect(characterCount("Olá 🌎")).toBe(5);
    expect(validMessage("🌎".repeat(280))).toBe(true);
    expect(validMessage("á".repeat(281))).toBe(false);
    expect(validMessage("")).toBe(false);
    expect(characterCount("e\u0301")).toBe(2);
  });
});
describe("wallet operations", () => {
  it("selects MetaMask among multiple extensions", () => {
    const provider = { isMetaMask: true, request: vi.fn() };
    window.ethereum = {
      providers: [{ request: vi.fn() }, provider],
      request: vi.fn(),
    };
    expect(metamask()).toBe(provider);
    delete window.ethereum;
    expect(metamask()).toBeUndefined();
  });
  it("connects without asking for secrets", async () => {
    const request = vi.fn().mockResolvedValue(["0x123"]);
    expect(await connectWallet({ request })).toEqual(["0x123"]);
    expect(request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
  });
  it("switches to Sepolia and handles user rejection", async () => {
    const request = vi.fn().mockResolvedValue(null);
    await switchNetwork({ request });
    expect(request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
    request.mockRejectedValue({ code: 4001 });
    await expect(switchNetwork({ request })).rejects.toEqual({ code: 4001 });
  });
  it("adds the network only when absent", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ code: 4902 })
      .mockResolvedValue(null);
    await switchNetwork({ request } as InjectedProvider);
    expect(request.mock.calls[1][0].method).toBe("wallet_addEthereumChain");
  });
});
describe("actionable failures", () => {
  it("explains rejection, missing funds, pending prompts and RPC failure", () => {
    expect(readableError({ code: "ACTION_REJECTED" })).toContain("recusada");
    expect(readableError({ info: { error: { code: 4001 } } })).toContain(
      "recusada",
    );
    expect(readableError({ code: "INSUFFICIENT_FUNDS" })).toContain(
      "Saldo insuficiente",
    );
    expect(readableError({ code: -32002 })).toContain("solicitação aberta");
    expect(readableError(new Error("RPC down"))).toContain("conexão");
  });
});
