export const MESSAGE_LIMIT = 1500;

export class ContractVersionError extends Error {
  readonly code = "CONTRACT_VERSION_MISMATCH";
  constructor() {
    super(
      "O contrato configurado é de outra versão. Implante o novo Mural de 1.500 caracteres pelo Remix e atualize o endereço do contrato e o bloco no .env.",
    );
  }
}

// Older deployments have no limit getter. Never offer a larger message to that contract.
export async function ensureMessageLimit(readLimit: () => Promise<bigint>) {
  try {
    if ((await readLimit()) !== BigInt(MESSAGE_LIMIT))
      throw new ContractVersionError();
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "CALL_EXCEPTION" || code === "BAD_DATA")
      throw new ContractVersionError();
    throw error;
  }
}
