import { isAddress } from "ethers";

export type Deployment = {
  address: string;
  chainId: number;
  deploymentBlock: number;
};
export function resolveDeployment(
  env: { VITE_CONTRACT_ADDRESS?: string; VITE_DEPLOYMENT_BLOCK?: string },
  generated?: Deployment,
): Deployment | undefined {
  const address = env.VITE_CONTRACT_ADDRESS?.trim();
  if (!address) return generated;
  const rawBlock = env.VITE_DEPLOYMENT_BLOCK?.trim() ?? "";
  const block = /^\d+$/.test(rawBlock) ? Number(rawBlock) : NaN;
  // Explicit public configuration always targets Sepolia and overrides local deployment.
  if (
    !isAddress(address) ||
    /^0x0{40}$/i.test(address) ||
    !Number.isSafeInteger(block) ||
    block < 1
  )
    return undefined;
  return { address, chainId: 11155111, deploymentBlock: block };
}
