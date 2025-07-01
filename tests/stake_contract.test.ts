import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakeContract } from "../target/types/stake_contract";
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("stake_contract (dual PDA)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.StakeContract as Program<StakeContract>;
  const payer = provider.wallet;

  const getStakeDataPda = () =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("stake_data"), payer.publicKey.toBuffer()],
      program.programId
    );

  const getVaultPda = () =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), payer.publicKey.toBuffer()],
      program.programId
    );

  const getStakeData = async (stakeDataPda: PublicKey) => {
    try {
      return await program.account.stakeAccount.fetch(stakeDataPda);
    } catch (error) {
      return null;
    }
  };

  const getBalance = async (pubkey: PublicKey) =>
    await provider.connection.getBalance(pubkey);

  it("Creates stake data + vault PDA accounts", async () => {
    const [stakeDataPda, stakeBump] = getStakeDataPda();
    const [vaultPda, vaultBump] = getVaultPda();

    const existingAccount = await getStakeData(stakeDataPda);
    if (existingAccount) {
      console.log("⚠️ stake_data already exists, skipping creation");
      return;
    }

    const tx = await program.methods
      .createPdaAccount()
      .accounts({
        payer: payer.publicKey,
        stakeData: stakeDataPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Created stake_data + vault → tx:", tx);
    const data = await getStakeData(stakeDataPda);
    expect(data).to.not.be.null;
    expect(data.owner.toString()).to.equal(payer.publicKey.toString());
  });

  it("Stakes 0.1 SOL", async () => {
    const [stakeDataPda] = getStakeDataPda();
    const [vaultPda] = getVaultPda();
    const stakeAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    const before = await getStakeData(stakeDataPda);
    const tx = await program.methods
      .stake(stakeAmount)
      .accounts({
        signer: payer.publicKey,
        stakeData: stakeDataPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Stake tx:", tx);
    const after = await getStakeData(stakeDataPda);
    expect(after.stakedAmount.toNumber()).to.equal(
      before.stakedAmount.toNumber() + stakeAmount.toNumber()
    );
  });

  it("Fails to stake 0 SOL", async () => {
    const [stakeDataPda] = getStakeDataPda();
    const [vaultPda] = getVaultPda();

    try {
      await program.methods
        .stake(new anchor.BN(0))
        .accounts({
          signer: payer.publicKey,
          stakeData: stakeDataPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have failed for zero stake");
    } catch (err) {
      expect(err.toString()).to.include("InvalidAmount");
      console.log("✅ Correctly failed stake with 0");
    }
  });

  it("Unstakes 0.05 SOL", async () => {
    const [stakeDataPda] = getStakeDataPda();
    const [vaultPda] = getVaultPda();
    const unstakeAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);

    const before = await getStakeData(stakeDataPda);
    const tx = await program.methods
      .unstake(unstakeAmount)
      .accounts({
        signer: payer.publicKey,
        stakeData: stakeDataPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Unstake tx:", tx);
    const after = await getStakeData(stakeDataPda);
    expect(after.stakedAmount.toNumber()).to.equal(
      before.stakedAmount.toNumber() - unstakeAmount.toNumber()
    );
  });

  it("Fails to unstake more than staked", async () => {
    const [stakeDataPda] = getStakeDataPda();
    const [vaultPda] = getVaultPda();
    const current = await getStakeData(stakeDataPda);

    const tooMuch = new anchor.BN(current.stakedAmount.toNumber() + LAMPORTS_PER_SOL);

    try {
      await program.methods
        .unstake(tooMuch)
        .accounts({
          signer: payer.publicKey,
          stakeData: stakeDataPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have failed for too much unstake");
    } catch (err) {
      console.log("✅ Correctly rejected excessive unstake");
      expect(err.toString()).to.include("InsufficientStake");
    }
  });

  it("Calls get_points", async () => {
    const [stakeDataPda] = getStakeDataPda();

    const tx = await program.methods
      .getPoints()
      .accounts({
        signer: payer.publicKey,
        stakeData: stakeDataPda,
      })
      .rpc();

    console.log("✅ get_points tx:", tx);
  });

  it("Calls claim_points", async () => {
    const [stakeDataPda] = getStakeDataPda();

    const tx = await program.methods
      .claimPoints()
      .accounts({
        signer: payer.publicKey,
        stakeData: stakeDataPda,
      })
      .rpc();

    console.log("✅ claim_points tx:", tx);
  });

  it("Displays final account state", async () => {
    const [stakeDataPda] = getStakeDataPda();
    const [vaultPda] = getVaultPda();
    const data = await getStakeData(stakeDataPda);
    const vaultBalance = await getBalance(vaultPda);

    console.log("\n📊 Final Account State:");
    console.log("📦 stake_data PDA:", stakeDataPda.toBase58());
    console.log("💰 vault PDA:", vaultPda.toBase58());
    console.log("👤 Owner:", data.owner.toBase58());
    console.log("🔒 Staked Amount:", data.stakedAmount.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("⭐ Total Points:", data.totalPoints.toNumber());
    console.log("🏦 Vault Balance:", vaultBalance / LAMPORTS_PER_SOL, "SOL");
  });
});
