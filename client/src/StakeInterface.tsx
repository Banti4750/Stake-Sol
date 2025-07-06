import  { useState, useEffect } from 'react';
import {  useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program,  AnchorProvider, setProvider } from "@coral-xyz/anchor";
// import type { StakeContract } from "../../target/types/stake_contract";
// import  StakeContractIdl  from '../../target/idl/stake_contract.json';

import type { StakeContract } from "./target/stake_contract.js";
import idl from "./target/stake_contract.json";


const programId = new PublicKey("GiSpyqsUFLfHZ3Vshoshg21AmuFzm814xQ2vFuF7GDuJ");

export const StakeInterface = () => {
  const { connection } = useConnection();
const wallet = useWallet();
  const { publicKey } = wallet;

  // State management
  //@ts-ignore
  const [stakeData, setStakeData] = useState<anchor.IdlTypes<StakeContractIdl>['stakeAccount'] | null>(null);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
   //@ts-ignore
  const [program, setProgram] = useState<anchor.Program<StakeContractIdl> | null>(null);

  // Initialize Anchor program
  useEffect(() => {
    if (!connection || !wallet ) {
      setProgram(null);
      return;
    }
   

    const initializeProgram = async () => {
      try {
        //@ts-ignore
       const provider = new AnchorProvider(connection, wallet , {});
        setProvider(provider);
        
       
     const program = new Program(idl as StakeContract, provider);
       
        
        setProgram(program);
        setError(null);
      } catch (err) {
        console.error('Program initialization error:', err);
        setError(`Failed to initialize program: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setProgram(null);
      }
    };

    initializeProgram();
  }, [connection, wallet]);

  // Helper functions for PDAs
  const getStakeDataPda = () => {
    if (!publicKey) return [null, null];
    return PublicKey.findProgramAddressSync(
      [Buffer.from("stake_data"), publicKey.toBuffer()],
      programId
    );
  };

  const getVaultPda = () => {
    if (!publicKey) return [null, null];
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), publicKey.toBuffer()],
      programId
    );
  };

  // Fetch stake data
  const fetchStakeData = async () => {
    if (!program || !publicKey) {
      console.log('Program or publicKey not available');
      return;
    }

    setRefreshing(true);
    try {
      const [stakeDataPda] = getStakeDataPda();
      const [vaultPda] = getVaultPda();

      if (!stakeDataPda || !vaultPda) {
        throw new Error('Could not derive PDAs');
      }

      // Check if account exists
      let data = null;
      try {
        data = await program.account.stakeAccount.fetch(stakeDataPda);
      } catch (error) {
        console.log('Stake account does not exist yet');
        setStakeData(null);
        setVaultBalance(0);
        return;
      }

      // Get vault balance
      const balance = await connection.getBalance(vaultPda);
      
      setStakeData(data);
      setVaultBalance(balance);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-fetch stake data when program or publicKey changes
  useEffect(() => {
    if (program && publicKey) {
      fetchStakeData();
    }
  }, [program, publicKey]);

  // Create stake account
  const createStakeAccount = async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const [stakeDataPda] = getStakeDataPda();
      const [vaultPda] = getVaultPda();

      if (!stakeDataPda || !vaultPda) {
        throw new Error('Could not derive PDAs');
      }

      // Check if account exists
      try {
        await program.account.stakeAccount.fetch(stakeDataPda);
        console.log('Stake account already exists');
        return;
      } catch {
        // Account doesn't exist, proceed with creation
      }

      const tx = await program.methods
        .createPdaAccount()
        .accounts({
          payer: publicKey,
          stakeData: stakeDataPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Created stake account:', tx);
      await fetchStakeData();
    } catch (err) {
      console.error('Create stake account failed:', err);
      setError(`Failed to create stake account: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Stake SOL
  const stake = async () => {
    if (!program || !publicKey || !amount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const stakeAmount = new anchor.BN(parseFloat(amount) * LAMPORTS_PER_SOL);
      
      if (stakeAmount.lte(new anchor.BN(0))) {
        setError("Amount must be greater than 0");
        return;
      }

      const [stakeDataPda] = getStakeDataPda();
      const [vaultPda] = getVaultPda();

      if (!stakeDataPda || !vaultPda) {
        throw new Error('Could not derive PDAs');
      }

      const tx = await program.methods
        .stake(stakeAmount)
        .accounts({
          signer: publicKey,
          stakeData: stakeDataPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Stake transaction:', tx);
      await fetchStakeData();
      setAmount('');
    } catch (err) {
      console.error('Stake error:', err);
      setError(`Staking failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };


  // Unstake SOL
  const unstake = async () => {
    if (!program || !publicKey || !amount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const unstakeAmount = new anchor.BN(parseFloat(amount) * LAMPORTS_PER_SOL);
      
      if (unstakeAmount.lte(new anchor.BN(0))) {
        setError("Amount must be greater than 0");
        return;
      }

        // ✅ Get the vault PDA AND its bump seed
    const [vaultPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), publicKey.toBuffer()],
      program.programId
    );

    // ✅ Get stakeData PDA (if needed)
    const [stakeDataPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stake_data"), publicKey.toBuffer()],
      program.programId
    );

      // Verify vault has balance (optional but helpful)
      const vaultBalance = await connection.getBalance(vaultPda);
      if (vaultBalance < unstakeAmount.toNumber()) {
        throw new Error('Vault has insufficient balance');
      }


      const tx = await program.methods
        .unstake(unstakeAmount)
        .accounts({
          signer: publicKey,
          stakeData: stakeDataPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Unstake tx:', tx);
      await fetchStakeData();
      setAmount('');
    } catch (err:any) {
      console.error('Unstake error:', err);
      if (err.logs) {
        console.error('Transaction logs:', err.logs);
      }
      setError(`Unstaking failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
};

  // Claim points
  const claimPoints = async () => {
    if (!program || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [stakeDataPda] = getStakeDataPda();

      if (!stakeDataPda) {
        throw new Error('Could not derive stake data PDA');
      }

      const tx = await program.methods
        .claimPoints()
        .accounts({
          signer: publicKey,
          stakeData: stakeDataPda,
        })
        .rpc();

      console.log('✅ claim_points tx:', tx);
      await fetchStakeData();
    } catch (err) {
      console.error('Claim error:', err);
      setError(`Claim failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Get points (view-only function)
  const getPoints = async () => {
    if (!program || !publicKey) return;
    
    try {
      const [stakeDataPda] = getStakeDataPda();

      if (!stakeDataPda) {
        throw new Error('Could not derive stake data PDA');
      }

      const tx = await program.methods
        .getPoints()
        .accounts({
          signer: publicKey,
          stakeData: stakeDataPda,
        })
        .rpc();

      console.log('✅ get_points tx:', tx);
      await fetchStakeData();
    } catch (err) {
      console.error('Get points error:', err);
      setError(`Get points failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const formatSOL = (lamports :any ) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  };

  const formatPoints = (points:any) => {
    return points.toString();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        {/* Header */}
       

        <div className="p-6">
          {/* Wallet Connection */}
          {/* <div className="mb-6 text-center">
            {!wallet.connected ? (
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 px-6 py-3"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={disconnectWallet}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 px-6 py-3"
              >
                Disconnect Wallet
              </button>
            )}
          </div> */}

          {/* Connection Status */}
          <div className="mb-6 bg-gray-700 rounded-lg p-4 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Connection Status</span>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                wallet.connected && connection ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {wallet.connected && connection ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            {publicKey && (
              <p className="text-xs text-gray-400 break-all">
                Wallet: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-800 border border-red-700 rounded-lg p-4 shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-100">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-xs text-red-300 hover:text-red-100 underline transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!publicKey || !connection ? (
            <div className="text-center py-8 text-gray-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-gray-300">
                Please connect your wallet to continue.
              </p>
            </div>
          ) : !stakeData ? (
            <div className="text-center py-8 text-gray-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-gray-300 mb-4">No stake account found for this wallet.</p>
              <button
                onClick={createStakeAccount}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              >
                {loading ? 'Creating...' : 'Create Stake Account'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stake Information */}
              <div className="bg-gray-700 rounded-lg p-4 shadow-md border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-100">Stake Information</h3>
                  <button
                    onClick={fetchStakeData}
                    disabled={refreshing || loading}
                    className="text-blue-400 hover:text-blue-200 text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Staked Amount</p>
                    <p className="text-xl font-bold text-gray-200">{formatSOL(stakeData.stakedAmount.toNumber())}</p>
                    <p className="text-xs text-gray-500">SOL</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Points</p>
                    <p className="text-xl font-bold text-purple-400">{formatPoints(stakeData.totalPoints.toNumber())}</p>
                    <p className="text-xs text-gray-500">Points</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Vault Balance</p>
                    <p className="text-xl font-bold text-green-400">{formatSOL(vaultBalance)}</p>
                    <p className="text-xs text-gray-500">SOL</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={stake}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                    className="bg-gradient-to-r from-green-500 to-green-700 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Processing...' : 'Stake'}
                  </button>
                  <button
                    onClick={unstake}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || (stakeData && parseFloat(amount) > stakeData.stakedAmount.toNumber())}
                    className="bg-gradient-to-r from-red-500 to-red-700 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Processing...' : 'Unstake'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={getPoints}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Processing...' : 'Get Points'}
                  </button>
                  <button
                    onClick={claimPoints}
                    disabled={loading || (stakeData && stakeData.totalPoints.toNumber() <= 0)}
                    className="bg-gradient-to-r from-purple-500 to-purple-700 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Processing...' : 'Claim Points'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}