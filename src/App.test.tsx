import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App";
import * as lib from "./lib";
vi.mock("./lib", async (importOriginal) => {
  const original = await importOriginal<typeof import("./lib")>();
  return {
    ...original,
    configured: true,
    deployment: {
      address: "0x0000000000000000000000000000000000000001",
      chainId: 11155111,
      deploymentBlock: 1,
    },
    rpc: { getBlockNumber: vi.fn().mockResolvedValue(100) },
    readTotal: vi.fn(),
    readPage: vi.fn(),
    publish: vi.fn(),
  };
});
beforeEach(() => {
  location.hash = "#/";
  vi.mocked(lib.readTotal).mockResolvedValue(0);
  vi.mocked(lib.readPage).mockResolvedValue({
    messages: [],
    missingHashes: false,
  });
  delete window.ethereum;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Mural interface", () => {
  it("reads without a wallet and shows an empty mural", async () => {
    render(<App />);
    expect(
      await screen.findByText("Toda conversa começa com um olá."),
    ).toBeInTheDocument();
    expect(lib.readTotal).toHaveBeenCalledWith(100);
  });
  it("renders text safely, exposes verified transaction links and paginates without duplicates", async () => {
    vi.mocked(lib.readTotal).mockResolvedValue(21);
    vi.mocked(lib.readPage)
      .mockResolvedValueOnce({
        messages: [
          {
            id: "21",
            content: "<script>Olá</script>",
            author: "0x1234567890123456789012345678901234567890",
            timestamp: 1700000000,
            hash: "0xabc",
          },
        ],
        missingHashes: false,
      })
      .mockResolvedValueOnce({
        messages: [
          {
            id: "1",
            content: "Primeiro recado",
            author: "0x1234567890123456789012345678901234567890",
            timestamp: 1700000000,
            hash: "0xdef",
          },
        ],
        missingHashes: false,
      });
    render(<App />);
    expect(await screen.findByText("<script>Olá</script>")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver transação do recado 21" }),
    ).toHaveAttribute("href", "https://sepolia.etherscan.io/tx/0xabc");
    expect(lib.readPage).toHaveBeenCalledWith(1, 20, 100);
    fireEvent.click(screen.getByText("Carregar mais recados"));
    expect(await screen.findByText("Primeiro recado")).toBeInTheDocument();
    expect(lib.readPage).toHaveBeenLastCalledWith(0, 1, 100);
    expect(screen.getAllByText("<script>Olá</script>")).toHaveLength(1);
  });
  it("shows RPC errors with a retry action", async () => {
    vi.mocked(lib.readTotal).mockRejectedValueOnce(new Error("offline"));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("conexão");
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(
      await screen.findByText("Toda conversa começa com um olá."),
    ).toBeInTheDocument();
  });
  it("reports missing MetaMask without preventing reading", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Conectar carteira" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Instale a extensão MetaMask",
    );
  });
  it("updates account/network and follows signing, pending and success", async () => {
    location.hash = "#/publicar";
    const listeners = new Map<string, (...args: any[]) => void>();
    window.ethereum = {
      isMetaMask: true,
      request: vi.fn(async ({ method }) =>
        method === "eth_chainId"
          ? "0xaa36a7"
          : ["0x1234567890123456789012345678901234567890"],
      ),
      on: vi.fn((name, fn) => {
        listeners.set(name, fn);
      }),
      removeListener: vi.fn(),
    };
    let resolve!: (hash: string) => void;
    let sent!: (hash: string) => void;
    vi.mocked(lib.publish).mockImplementation(
      async (_provider, _content, onSent) => {
        sent = onSent;
        return await new Promise<string>((r) => {
          resolve = r;
        });
      },
    );
    render(<App />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Registrar na blockchain" }),
      ).toBeDisabled(),
    );
    act(() => listeners.get("chainChanged")?.("0x1"));
    expect(
      screen.getAllByRole("button", { name: "Trocar de rede" }),
    ).toHaveLength(2);
    act(() => {
      listeners.get("chainChanged")?.("0xaa36a7");
      listeners.get("accountsChanged")?.([
        "0x9999999999999999999999999999999999999999",
      ]);
    });
    expect(screen.getAllByText("0x9999…9999").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "🌎".repeat(281) },
    });
    expect(
      screen.getByRole("button", { name: "Registrar na blockchain" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Olá, mundo!" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar na blockchain" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Confirme");
    act(() => sent("0xtest"));
    expect(screen.getByRole("status")).toHaveTextContent("Aguardando");
    await act(async () => resolve("0xtest"));
    expect(screen.getByRole("status")).toHaveTextContent("sucesso");
    expect(screen.getByRole("textbox")).toHaveValue("");
    act(() => listeners.get("accountsChanged")?.([]));
    expect(
      screen.getAllByRole("button", { name: "Conectar carteira" }),
    ).toHaveLength(2);
  });
});
