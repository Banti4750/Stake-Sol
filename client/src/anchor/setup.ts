import { Program } from "@coral-xyz/anchor";
import { PublicKey, clusterApiUrl, Connection } from "@solana/web3.js";

// Import IDL directly from JSON
const StakeContractIDL = require("../../../target/idl/stake_contract.json");

const programId = new PublicKey("GiSpyqsUFLfHZ3Vshoshg21AmuFzm814xQ2vFuF7GDuJ");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Let TypeScript infer the type from the IDL
const program = new Program(StakeContractIDL, programId, { connection });

export  const [stakeAccountPDA, stakeAccountBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("stake_account")],
  program.programId
)


export { program, connection, programId };