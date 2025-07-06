use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;

declare_id!("GiSpyqsUFLfHZ3Vshoshg21AmuFzm814xQ2vFuF7GDuJ");

const POINTS_PER_SOL_PER_DAY: u64 = 1_000_000;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
const SECONDS_PER_DAY: u64 = 86_400; // Fixed: was SECONDS_PER_SOL

#[program]
pub mod stake_contract {
    use super::*;

    pub fn create_pda_account(ctx: Context<CreatePdaAccount>) -> Result<()> {
        let stake_data = &mut ctx.accounts.stake_data;
        let clock = Clock::get()?;

        stake_data.owner = ctx.accounts.payer.key();
        stake_data.staked_amount = 0;
        stake_data.total_points = 0;
        stake_data.last_update_time = clock.unix_timestamp;
        stake_data.bump = ctx.bumps.stake_data; // Fixed: should be stake_data bump

        msg!("PDA + Vault created");
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakeError::InvalidAmount);

        let stake_data = &mut ctx.accounts.stake_data;
        let clock = Clock::get()?;
        update_points(stake_data, clock.unix_timestamp)?;

        // Transfer SOL from user → vault PDA
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;

        stake_data.staked_amount = stake_data
            .staked_amount
            .checked_add(amount)
            .ok_or(StakeError::Overflow)?;

        msg!("Staked {} lamports", amount);
        Ok(())
    }

   pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, StakeError::InvalidAmount);

    let stake_data = &mut ctx.accounts.stake_data;
    let clock = Clock::get()?;
    update_points(stake_data, clock.unix_timestamp)?;

    require!(
        stake_data.staked_amount >= amount,
        StakeError::InsufficientStake
    );

    // Create PDA signer seeds
    let signer_key = ctx.accounts.signer.key(); // ✅ Now lives long enough
    let seeds = &[
        b"vault",
        signer_key.as_ref(), // ✅ Uses the long-lived reference
        &[ctx.bumps.vault],
    ];
    // Transfer SOL from vault to user (requires PDA signature)
    anchor_lang::solana_program::program::invoke_signed(
        &system_instruction::transfer(
            &ctx.accounts.vault.key(),
            &ctx.accounts.signer.key(),
            amount,
        ),
        &[
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
         &[seeds],  // Provides the PDA's "signature"
    )?;

    stake_data.staked_amount = stake_data
        .staked_amount
        .checked_sub(amount)
        .ok_or(StakeError::Underflow)?;

    Ok(())
}

    pub fn claim_points(ctx: Context<ClaimPoints>) -> Result<()> {
        let stake_data = &mut ctx.accounts.stake_data;
        let clock = Clock::get()?;

        update_points(stake_data, clock.unix_timestamp)?;

        let claimed = stake_data.total_points / 1_000_000;
        msg!("Claimed points: {}", claimed);
        stake_data.total_points = 0;

        Ok(())
    }

    pub fn get_points(ctx: Context<GetPoints>) -> Result<()> {
        let stake_data = &ctx.accounts.stake_data;
        let clock = Clock::get()?;

        let time_elapsed = clock
            .unix_timestamp
            .checked_sub(stake_data.last_update_time)
            .ok_or(StakeError::InvalidTimestamp)? as u64;

        let new_points = calculate_points_earned(stake_data.staked_amount, time_elapsed)?;
        let total = stake_data
            .total_points
            .checked_add(new_points)
            .ok_or(StakeError::Overflow)?;

        msg!("Total points: {}", total / 1_000_000);
        Ok(())
    }
}

// ========== Helper Functions ==========

fn update_points(stake_data: &mut StakeAccount, current_time: i64) -> Result<()> {
    let elapsed = current_time
        .checked_sub(stake_data.last_update_time)
        .ok_or(StakeError::InvalidTimestamp)? as u64;

    if elapsed > 0 && stake_data.staked_amount > 0 {
        let new_points = calculate_points_earned(stake_data.staked_amount, elapsed)?;
        stake_data.total_points = stake_data
            .total_points
            .checked_add(new_points)
            .ok_or(StakeError::Overflow)?;
    }

    stake_data.last_update_time = current_time;
    Ok(())
}

fn calculate_points_earned(staked: u64, elapsed: u64) -> Result<u64> {
    let points = (staked as u128)
        .checked_mul(elapsed as u128)
        .ok_or(StakeError::Overflow)?
        .checked_mul(POINTS_PER_SOL_PER_DAY as u128)
        .ok_or(StakeError::Overflow)?
        .checked_div(LAMPORTS_PER_SOL as u128)
        .ok_or(StakeError::Overflow)?
        .checked_div(SECONDS_PER_DAY as u128) // Fixed: use SECONDS_PER_DAY
        .ok_or(StakeError::Overflow)?;

    Ok(points as u64)
}

#[derive(Accounts)]
pub struct CreatePdaAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        seeds = [b"stake_data", payer.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 8 + 1
    )]
    pub stake_data: Account<'info, StakeAccount>,

    #[account(
        seeds = [b"vault", payer.key().as_ref()],
        bump,
    )]
    /// CHECK: Safe. PDA vault will receive SOL, no data
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_data", signer.key().as_ref()],
        bump = stake_data.bump,
        constraint = stake_data.owner == signer.key() @ StakeError::Unauthorized,
    )]
    pub stake_data: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA Vault receiving SOL
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_data", signer.key().as_ref()],
        bump = stake_data.bump,
    )]
    pub stake_data: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,  // Anchor automatically finds and passes this
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimPoints<'info> {
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_data", signer.key().as_ref()],
        bump = stake_data.bump,
        constraint = stake_data.owner == signer.key() @ StakeError::Unauthorized,
    )]
    pub stake_data: Account<'info, StakeAccount>,
}

#[derive(Accounts)]
pub struct GetPoints<'info> {
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"stake_data", signer.key().as_ref()],
        bump = stake_data.bump,
        constraint = stake_data.owner == signer.key() @ StakeError::Unauthorized,
    )]
    pub stake_data: Account<'info, StakeAccount>,
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub total_points: u64,
    pub last_update_time: i64,
    pub bump: u8,
}

#[error_code]
pub enum StakeError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Arithmetic underflow")]
    Underflow,
    #[msg("Insufficient staked amount")]
    InsufficientStake,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
}