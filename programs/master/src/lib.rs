use anchor_lang::prelude::*;

declare_id!("26Spr9AsbeLdhrjbmVZA9N4L3XFfV2zzdKFesRahLtEE");

#[program]
pub mod master {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        
        let state = &mut ctx.accounts.master_state;
        state.refreshed_slot = 0;
        state.strategy_value = 0;
        state.strategy_state = ctx.accounts.strategy_state.key();

        Ok(())
    }

    pub fn refresh(ctx: Context<Refresh>) -> Result<()> {

        let account_data =  ctx.accounts.strategy_state.try_borrow_data()?;
        let mut account_data_slice: &[u8] = &account_data;
        let strategy_state = StrategyState::try_deserialize_unchecked(&mut account_data_slice)?;

        let state = &mut ctx.accounts.master_state;
        state.refreshed_slot = strategy_state.refreshed_slot;
        state.strategy_value = strategy_state.value;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Tranche config account, where all the parameters are saved
    #[account(init, payer = signer, space = 8+16+32)]
    pub master_state: Account<'info, MasterState>,

    /// CHECK: 
    #[account()]
    pub strategy_state: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refresh<'info> {

    #[account(mut, has_one = strategy_state)]
    pub master_state: Account<'info, MasterState>,

    /// CHECK: 
    #[account()]
    pub strategy_state: AccountInfo<'info>,

    #[account()]
    pub signer: Signer<'info>,
}

#[account]
pub struct MasterState {
    pub strategy_value: u64,
    pub refreshed_slot: u64,
    pub strategy_state: Pubkey,
}

#[account]
pub struct StrategyState {
    pub value: u64,
    pub refreshed_slot: u64,
}