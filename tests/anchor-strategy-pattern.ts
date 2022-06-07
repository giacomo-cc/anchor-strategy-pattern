import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { assert, expect } from "chai";
import { Master } from "../target/types/master";
import { StrategyA } from "../target/types/strategy_a";
import { StrategyB } from "../target/types/strategy_b";

describe("anchor-strategy-pattern", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const programMaster = anchor.workspace.Master as Program<Master>;
  const programStrategyA = anchor.workspace.StrategyA as Program<StrategyA>;
  const programStrategyB = anchor.workspace.StrategyA as Program<StrategyB>;

  it("use strategy A", async () => {
    const strategyState = anchor.web3.Keypair.generate();
    await programStrategyA.methods
      .initialize()
      .accounts({
        strategyState: strategyState.publicKey,
      })
      .signers([strategyState])
      .rpc();

    const masterState = anchor.web3.Keypair.generate();
    await programMaster.methods
      .initialize()
      .accounts({
        masterState: masterState.publicKey,
        strategyState: strategyState.publicKey,
      })
      .signers([masterState])
      .rpc();

    let masterStateAccount = await programMaster.account.masterState.fetch(masterState.publicKey);
    expect(masterStateAccount.strategyValue.toNumber()).to.eq(0);
    expect(masterStateAccount.refreshedSlot.toNumber()).to.eq(0);
    expect(masterStateAccount.strategyState.toBase58()).to.eq(strategyState.publicKey.toBase58());

    for (let i = 1; i < 3; i++) {
      await programStrategyA.methods
        .useStrategy()
        .accounts({
          strategyState: strategyState.publicKey,
        })
        .rpc();

      await programMaster.methods
        .refresh()
        .accounts({
          masterState: masterState.publicKey,
          strategyState: strategyState.publicKey,
        })
        .rpc();

      masterStateAccount = await programMaster.account.masterState.fetch(masterState.publicKey);
      expect(masterStateAccount.strategyValue.toNumber()).to.eq(i);
    }
  });

  it("use strategy B", async () => {
    const strategyState = anchor.web3.Keypair.generate();
    await programStrategyB.methods
      .initialize()
      .accounts({
        strategyState: strategyState.publicKey,
      })
      .signers([strategyState])
      .rpc();

    const masterState = anchor.web3.Keypair.generate();
    await programMaster.methods
      .initialize()
      .accounts({
        masterState: masterState.publicKey,
        strategyState: strategyState.publicKey,
      })
      .signers([masterState])
      .rpc();

    let masterStateAccount = await programMaster.account.masterState.fetch(masterState.publicKey);
    expect(masterStateAccount.strategyValue.toNumber()).to.eq(0);
    expect(masterStateAccount.refreshedSlot.toNumber()).to.eq(0);
    expect(masterStateAccount.strategyState.toBase58()).to.eq(strategyState.publicKey.toBase58());

    let oldValue = -1;
    for (let i = 1; i < 3; i++) {
      await programStrategyB.methods
        .useStrategy()
        .accounts({
          strategyState: strategyState.publicKey,
        })
        .rpc();

      await programMaster.methods
        .refresh()
        .accounts({
          masterState: masterState.publicKey,
          strategyState: strategyState.publicKey,
        })
        .rpc();

      masterStateAccount = await programMaster.account.masterState.fetch(masterState.publicKey);
      expect(masterStateAccount.strategyValue.toNumber() != oldValue).to.true;

      oldValue = masterStateAccount.strategyValue.toNumber();
    }
  });

  it("prevent strategy state inject attack", async () => {
    const strategyAState = anchor.web3.Keypair.generate();
    const strategyBState = anchor.web3.Keypair.generate();

    await programStrategyA.methods
      .initialize()
      .accounts({
        strategyState: strategyAState.publicKey,
      })
      .signers([strategyAState])
      .rpc();

    await programStrategyB.methods
      .initialize()
      .accounts({
        strategyState: strategyBState.publicKey,
      })
      .signers([strategyBState])
      .rpc();

    const masterState = anchor.web3.Keypair.generate();
    await programMaster.methods
      .initialize()
      .accounts({
        masterState: masterState.publicKey,
        strategyState: strategyAState.publicKey,
      })
      .signers([masterState])
      .rpc();

    let masterStateAccount = await programMaster.account.masterState.fetch(masterState.publicKey);
    expect(masterStateAccount.strategyState.toBase58()).to.eq(strategyAState.publicKey.toBase58());

    await programStrategyB.methods
      .useStrategy()
      .accounts({
        strategyState: strategyBState.publicKey,
      })
      .rpc();

    try {
      await programMaster.methods
        .refresh()
        .accounts({
          masterState: masterState.publicKey,
          strategyState: strategyBState.publicKey,
        })
        .rpc();
      expect(false).to.be.true;
    } catch (err) {
      const errMsg = "A has one constraint was violated";
      assert.strictEqual(err.error.errorMessage, errMsg);
      assert.strictEqual(err.error.errorCode.number, 2001);
    }
  });
});
