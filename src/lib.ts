import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  isAddress,
  type Eip1193Provider,
  type EventLog,
  type TransactionReceipt,
} from "ethers";
import abi from "./generated/abi.json";

export type InjectedProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  providers?: InjectedProvider[];
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};
declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}
export type Deployment = {
  address: string;
  chainId: number;
  deploymentBlock: number;
};
const deployments = import.meta.glob("./generated/deployment.json", {
  eager: true,
  import: "default",
});
export const deployment = Object.values(deployments)[0] as
  Deployment | undefined;
export const configured =
  !!deployment &&
  isAddress(deployment.address) &&
  [11155111, 31337].includes(deployment.chainId) &&
  Number.isInteger(deployment.deploymentBlock) &&
  deployment.deploymentBlock >= 0;
export const chainId = deployment?.chainId ?? 11155111;
export const networkName =
  chainId === 31337 ? "Hardhat local" : "Ethereum Sepolia";
export const rpcUrl =
  import.meta.env.VITE_RPC_URL ||
  (chainId === 31337
    ? "http://127.0.0.1:8545"
    : "https://ethereum-sepolia-rpc.publicnode.com");
export const rpc = new JsonRpcProvider(rpcUrl);
export const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
export const characterCount = (value: string) => Array.from(value).length;
export const validMessage = (value: string) =>
  value.length > 0 && characterCount(value) <= 280;
export const txUrl = (hash: string) =>
  chainId === 11155111 ? `https://sepolia.etherscan.io/tx/${hash}` : undefined;
export function metamask() {
  const eth = window.ethereum;
  return (
    eth?.providers?.find((p) => p.isMetaMask) ??
    (eth?.isMetaMask ? eth : undefined)
  );
}
export function readableError(error: unknown): string {
  const e = error as {
    code?: string | number;
    error?: { code?: number };
    info?: { error?: { code?: number } };
    message?: string;
  };
  if (
    e?.code === 4001 ||
    e?.code === "ACTION_REJECTED" ||
    e?.info?.error?.code === 4001 ||
    e?.error?.code === 4001
  )
    return "Solicitação recusada na MetaMask. Você pode tentar novamente.";
  if (
    e?.code === "INSUFFICIENT_FUNDS" ||
    /insufficient funds/i.test(e?.message ?? "")
  )
    return "Saldo insuficiente. Adicione ETH de teste à carteira nesta rede.";
  if (e?.code === -32002)
    return "Há uma solicitação aberta na MetaMask. Abra a extensão para continuar.";
  if (e?.code === "CALL_EXCEPTION")
    return "O contrato recusou a operação. Confira a mensagem e a configuração da rede.";
  return "Não foi possível concluir a operação. Confira sua conexão, o RPC e a rede selecionada e tente novamente.";
}
export type Message = {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  hash?: string;
};
export async function readPage(
  offset: number,
  limit: number,
  block: number,
): Promise<{ messages: Message[]; missingHashes: boolean }> {
  const contract = new Contract(deployment!.address, abi, rpc);
  const rows = (await contract.getMessages(offset, limit, {
    blockTag: block,
  })) as { id: bigint; content: string; author: string; timestamp: bigint }[];
  const hashes = new Map<string, string>();
  let missingHashes = false;
  if (rows.length) {
    const filter = contract.filters.MessagePublished(rows.map((r) => r.id));
    // Split only when a provider refuses a large block range. Bound work for unreliable RPCs.
    let requests = 0;
    async function logs(from: number, to: number): Promise<void> {
      if (++requests > 128) throw new Error("RPC log range limit");
      try {
        const events = await contract.queryFilter(filter, from, to);
        for (const event of events)
          if ("args" in event)
            hashes.set(
              (event as EventLog).args.id.toString(),
              event.transactionHash,
            );
      } catch (error) {
        const detail = JSON.stringify(
          error,
          Object.getOwnPropertyNames(error ?? {}),
        );
        const rangeLimited =
          /range|too many|limit|response size|query returned|\b413\b/i.test(
            detail,
          );
        if (!rangeLimited || to - from < 100 || requests >= 128) throw error;
        const middle = Math.floor((from + to) / 2);
        await logs(from, middle);
        await logs(middle + 1, to);
      }
    }
    try {
      await logs(deployment!.deploymentBlock, block);
    } catch {
      missingHashes = true;
    }
  }
  return {
    messages: rows
      .map((r) => ({
        id: r.id.toString(),
        content: r.content,
        author: r.author,
        timestamp: Number(r.timestamp),
        hash: hashes.get(r.id.toString()),
      }))
      .reverse(),
    missingHashes:
      missingHashes || rows.some((r) => !hashes.has(r.id.toString())),
  };
}
export async function readTotal(block: number) {
  const actual = await rpc.getNetwork();
  if (Number(actual.chainId) !== chainId)
    throw new Error("RPC conectado à rede errada");
  if ((await rpc.getCode(deployment!.address, block)) === "0x")
    throw new Error("Contrato ausente nesta rede");
  return Number(
    await new Contract(deployment!.address, abi, rpc).totalMessages({
      blockTag: block,
    }),
  );
}
export async function connectWallet(provider: InjectedProvider) {
  return (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
}
export async function switchNetwork(provider: InjectedProvider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error) {
    if ((error as { code: number }).code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${chainId.toString(16)}`,
          chainName: networkName,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [rpcUrl],
          ...(chainId === 11155111
            ? { blockExplorerUrls: ["https://sepolia.etherscan.io"] }
            : {}),
        },
      ],
    });
  }
}
export async function publish(
  provider: InjectedProvider,
  content: string,
  onSent: (hash: string) => void,
) {
  const browser = new BrowserProvider(provider);
  if (Number((await browser.getNetwork()).chainId) !== chainId)
    throw new Error("Rede incorreta");
  const signer = await browser.getSigner();
  if (!configured || (await browser.getCode(deployment!.address)) === "0x")
    throw new Error("Contrato ausente nesta rede");
  const contract = new Contract(deployment!.address, abi, signer);
  const tx = await contract.publishMessage(content);
  onSent(tx.hash);
  function confirmedHash(receipt: TransactionReceipt | null): string {
    if (!receipt || receipt.status !== 1)
      throw new Error("Falha na confirmação");
    const published = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== deployment!.address.toLowerCase())
        return false;
      const parsed = contract.interface.parseLog(log);
      return (
        parsed?.name === "MessagePublished" && parsed.args.content === content
      );
    });
    if (!published)
      throw new Error("A transação não contém um recado registrado");
    return receipt.hash;
  }
  try {
    const receipt = await tx.wait(1);
    return confirmedHash(receipt);
  } catch (error) {
    const e = error as {
      code?: string;
      cancelled?: boolean;
      receipt?: TransactionReceipt;
    };
    if (
      e.code === "TRANSACTION_REPLACED" &&
      !e.cancelled &&
      e.receipt?.status === 1
    )
      return confirmedHash(e.receipt);
    throw error;
  }
}
