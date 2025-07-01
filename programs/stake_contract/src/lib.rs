use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("GiSpyqsUFLfHZ3Vshoshg21AmuFzm814xQ2vFuF7GDuJ");

const POINTS_PER_SOL_PER_DAY :u64 = 1_000_000;
const LAMPORTS_PER_SOL :u64 = 1_000_000_000;
const SECONDS_PER_SOL:u64 = 86_400;

#[program]
pub mod stake_contract {
    use anchor_lang::{accounts::signer, solana_program::example_mocks::solana_sdk::clock};

    use super::*;

    pub fn create_pda_account(ctx:Context<CreatPdaAccount>)->Result<()>{
        let pda_account = &mut ctx.accounts.pda_account;
        let clock = Clock::get()?;

        pda_account.owner = ctx.accounts.payer.key();
        pda_account.staked_amount = 0;
        pda_account.total_points =0;
        pda_account.last_update_time = clock.unix_timestamp;
        pda_account.bump = ctx.bumps.pda_account;

        msg!("PDA account created succesfully");
        Ok(())
    }

    pub fn stake(ctx:Context<Stake> , amount:u64) ->Result<()>{
        require!(amount > 0 , StakeError::InvalidAmount);

        let pda_account = &mut ctx.accounts.pda_account;
        let clock = Clock::get()?;

        // upadate point before changing staked amount 
        update_points(pda_account, clock.unix_timestamp)?;

        // transfer sol from user to pda 
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
             system_program::Transfer {
                from:ctx.accounts.signer.to_account_info(),
                to: pda_account.to_account_info(),
             },
        );
        system_program::transfer(cpi_context, amount)?;

        // update staked amount 
        pda_account.staked_amount = pda_account.staked_amount.checked_add(amount).ok_or(StakeError::Overflow)?;

        msg!("staked {} lamports. Total staked: {} , Total point: {}" , amount , pda_account.staked_amount , pda_account.total_points / POINTS_PER_SOL_PER_DAY );

        Ok(())
    }

    pub  fn unstake(ctx:Context<Unstake> , amount:u64) -> Result<()>{
        require!(amount > 0 , StakeError::InvalidAmount);

        let pda_account = &mut ctx.accounts.pda_account;
        let clock = Clock::get()?;

        update_points(pda_account, clock.unix_timestamp)?;

        //transfer sol from pda back to user 
        let seed = &[
            b"client1",
            ctx.accounts.signer.key.as_ref(),
            &[pda_account.bump],
        ];
        let signer = &[&seed[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from :pda_account.to_account_info(),
                to:ctx.accounts.signer.to_account_info(),
            },
            signer
        );

        system_program::transfer(cpi_context, amount)?;

        //update stacked amount
        pda_account.staked_amount = pda_account.staked_amount.checked_sub(amount).ok_or(StakeError::Underflow)?; 

        msg!("Unstaked {} lamports , Remaining stakeed {} , Total points {} " , amount , pda_account.staked_amount , pda_account.total_points / 1_000_000);
        Ok(())
    }

    pub fn claim_points(ctx:Context<ClaimPints>) -> Result<()>{
        Ok(())
    }

    pub fn get_points(ctx:Context<GetPoints>)->Result<()>{
        Ok(())
    }
}

fn update_points(pda_account : &mut StakeAccount  , current_time:i64) -> Result<()>{
    let time_elapsed = current_time.checked_sub(pda_account.last_update_time).ok_or(StakeError::InvalidTimestamp)? as u64;

    if time_elapsed > 0 && pda_account.staked_amount > 0 {
        let new_points = calculate_points_earned(pda_account.staked_amount  , time_elapsed)?;
        pda_account.total_points = pda_account.total_points.checked_add(new_points).ok_or(StakeError::Overflow)?;
    }

    pda_account.last_update_time = current_time;
    Ok(())
}

fn calculate_points_earned(staked_amount:u64  , time_elapsed_second:u64) -> Result<(u64)>{

    let points = (staked_amount as u128)
        .checked_mul(time_elapsed_second as u128)
        .ok_or(StakeError::Overflow)?
        .checked_mul(POINTS_PER_SOL_PER_DAY as u128)
        .ok_or(StakeError::Overflow)?
        .checked_div(LAMPORTS_PER_SOL as u128)
        .ok_or(StakeError::Overflow)?
        .checked_div(SECONDS_PER_SOL as u128)
        .ok_or(StakeError::Overflow)?;


    Ok((points as u64))
}

#[derive(Accounts)]
pub struct CreatPdaAccount<'info> {
    #[account(mut)]
    pub payer :Signer<'info>,
    #[account(
    init,
    seeds=[b"client1",payer.key().as_ref()],
    bump,
    payer=payer,
    space=8+ 32 + 8+8+8+1 
    )]

    pub pda_account:Account<'info, StakeAccount>,
    pub system_program:Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
   #[account(mut)]
   pub signer :Signer<'info>,
   #[account(mut,
    seeds = [b"client1" , signer.key().as_ref()],
    bump=pda_account.bump,
    constraint= pda_account.owner == signer.key() @ StakeError::Unauthorized,
  )]
   pub pda_account:Account<'info, StakeAccount>,
   pub system_program:Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub signer :Signer<'info>,
    #[account(mut,
    seeds = [b"client1" , signer.key().as_ref()],
    bump=pda_account.bump,
    constraint= pda_account.owner == signer.key() @ StakeError::Unauthorized,
  )]
    pub pda_account:Account<'info, StakeAccount>,
    pub system_program:Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetPoints<'info> {
    #[account(mut)]
    pub signer :Signer<'info>,
    #[account(
    seeds = [b"client1" , signer.key().as_ref()],
    bump=pda_account.bump,
    constraint= pda_account.owner == signer.key() @ StakeError::Unauthorized,
  )]
    pub pda_account:Account<'info, StakeAccount>,
}

#[derive(Accounts)]
pub struct ClaimPints<'info> {
    #[account(mut)]
    pub signer :Signer<'info>,
    #[account(
    seeds = [b"client1" , signer.key().as_ref()],
    bump=pda_account.bump,
    constraint= pda_account.owner == signer.key() @ StakeError::Unauthorized,
  )]
    pub pda_account:Account<'info, StakeAccount>,
}

#[account]
pub struct StakeAccount {
    pub owner:Pubkey,
    pub staked_amount:u64,
    pub total_points:u64,
    pub last_update_time:i64,
    pub bump:u8
}

#[error_code]
pub enum StakeError {
    #[msg("Amount must br greater than 0")]
    InvalidAmount,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Arithematic overflow")]
    Overflow,
    #[msg("Invalid Timestamp")]
    InvalidTimestamp,
    #[msg("Arithematic ondeflow")]
    Underflow,
}