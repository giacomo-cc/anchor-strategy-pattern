use anchor_lang::prelude::*;

declare_id!("9zNguHtdifqfEVhCH1FSURnUUuheq5uu8MtyGGGi8SQY");

#[program]
pub mod strategy_b {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {

        // random rate
        let clock = Clock::get()?;
        ctx.accounts.strategy_state.value = 0;
        ctx.accounts.strategy_state.refreshed_slot = clock.slot;

        Ok(())
    }

    pub fn use_strategy(ctx: Context<UseStrategy>) -> Result<()> {
        
        // random rate
        let clock = Clock::get()?;
        ctx.accounts.strategy_state.value = clock.unix_timestamp.checked_rem(10000).unwrap() as u64;
        ctx.accounts.strategy_state.refreshed_slot = clock.slot;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(init, payer = signer, space = 8+16)]
    pub strategy_state: Account<'info, StrategyState>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UseStrategy<'info> {
    /// CHECK: 
    #[account(mut)]
    pub strategy_state: Account<'info, StrategyState>,

    #[account()]
    pub signer: Signer<'info>,
}

#[account]
pub struct StrategyState {
    pub value: u64,
    pub refreshed_slot: u64,
}