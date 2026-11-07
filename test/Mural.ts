import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Mural", async () => {
  const { ethers } = await network.create();
  async function fixture() {
    const contract = await ethers.deployContract("Mural");
    await contract.waitForDeployment();
    return contract;
  }
  it("starts empty and returns empty pages", async () => {
    const c = await fixture();
    assert.equal(await c.totalMessages(), 0n);
    assert.equal((await c.getMessages(0, 20)).length, 0);
    await assert.rejects(c.getMessage(0));
    await assert.rejects(c.getMessage(1));
  });
  it("stores content, sequential id, sender, block time and indexed event", async () => {
    const c = await fixture();
    const [first, second] = await ethers.getSigners();
    const tx = await c.publishMessage("Olá, blockchain! 🌎");
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const message = await c.getMessage(1);
    assert.equal(message.id, 1n);
    assert.equal(message.content, "Olá, blockchain! 🌎");
    assert.equal(message.author, first.address);
    assert.equal(message.timestamp, BigInt(block!.timestamp));
    await (
      await c.connect(second).getFunction("publishMessage")("Outro autor")
    ).wait();
    assert.equal((await c.getMessage(2)).author, second.address);
    assert.equal(await c.totalMessages(), 2n);
    const events = await c.queryFilter(c.filters.MessagePublished([1n]));
    assert.equal(events.length, 1);
    assert.equal(events[0].transactionHash, receipt.hash);
    assert.equal(events[0].args.id, 1n);
    assert.equal(events[0].args.content, message.content);
    assert.equal(events[0].args.author, first.address);
    assert.equal(events[0].args.timestamp, message.timestamp);
  });
  it("accepts 280 Unicode scalar values and rejects empty / 281", async () => {
    const c = await fixture();
    await assert.rejects(c.publishMessage(""));
    for (const character of ["a", "á", "界", "🌎"]) {
      await (await c.publishMessage(character.repeat(280))).wait();
      await assert.rejects(c.publishMessage(character.repeat(281)));
    }
    assert.equal(await c.totalMessages(), 4n);
    assert.equal((await c.getMessage(4)).content, "🌎".repeat(280));
    // Combining marks and ZWJ are individual scalar values, matching Array.from in the UI.
    await (await c.publishMessage("e\u0301".repeat(140))).wait();
    await assert.rejects(c.publishMessage("e\u0301".repeat(141)));
  });
  it("rejects malformed UTF-8 even when called without the UI", async () => {
    const c = await fixture();
    const [signer] = await ethers.getSigners();
    for (const bytes of [
      "0x80",
      "0xc080",
      "0xeda080",
      "0xf4908080",
      "0xe282",
      "0xe228a1",
    ]) {
      const coder = ethers.AbiCoder.defaultAbiCoder();
      const selector = c.interface.getFunction("publishMessage")!.selector;
      const data = selector + coder.encode(["bytes"], [bytes]).slice(2);
      await assert.rejects(
        signer.sendTransaction({ to: await c.getAddress(), data }),
      );
    }
    assert.equal(await c.totalMessages(), 0n);
  });
  it("paginates oldest first, caps pages and preserves prior records", async () => {
    const c = await fixture();
    for (let i = 1; i <= 23; i++)
      await (await c.publishMessage(`Recado ${i}`)).wait();
    const page = await c.getMessages(3, 20);
    assert.equal(page.length, 20);
    assert.equal(page[0].id, 4n);
    assert.equal(page[19].id, 23n);
    const older = await c.getMessages(0, 3);
    assert.equal(older.length, 3);
    assert.equal(older[0].content, "Recado 1");
    assert.equal((await c.getMessages(22, 20)).length, 1);
    assert.equal((await c.getMessages(23, 20)).length, 0);
    await assert.rejects(c.getMessages(0, 0));
    await assert.rejects(c.getMessages(0, 51));
    await assert.rejects(c.getMessage(24));
    assert.deepEqual(
      c.interface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name)
        .sort(),
      ["getMessage", "getMessages", "publishMessage", "totalMessages"],
    );
    await assert.rejects(c.publishMessage("valor", { value: 1n }));
  });
});
