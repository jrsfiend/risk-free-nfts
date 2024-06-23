use anchor_lang::prelude::*;
use anchor_spl::{token_2022::Token2022, token_interface::{spl_token_metadata_interface::state::TokenMetadata, Mint, TokenAccount, TokenInterface}};
use spl_stake_pool;
use spl_tlv_account_resolution::{account::ExtraAccountMeta, state::ExtraAccountMetaList};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};
use anchor_lang::{solana_program::program::invoke_signed, system_program::{create_account, CreateAccount}};
use std::str::FromStr;

use anchor_lang::solana_program::program::invoke;

declare_id!("EAkZtJmvFuBMntwcdbGF1JvgiQ3CpiJhUqohYgr3UaMF");
fn initialize_extra_account_meta_list<'info>(
    authority: AccountInfo<'info>,
    extra_account_meta_list: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    program_id: Pubkey,
    bump: u8,
    system_program: AccountInfo<'info>,
    extra_account_metas: Vec<ExtraAccountMeta>,
) -> Result<()> {
    let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len())? as u64;
    let lamports = Rent::get()?.minimum_balance(account_size as usize);
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"extra-account-metas",
        &mint.key.as_ref(),
        &[bump],
    ]];
    create_account(
        CpiContext::new(
           system_program,
            CreateAccount {
                from: authority,
                to: extra_account_meta_list.clone(),
            },
        )
        .with_signer(signer_seeds),
        lamports,
        account_size,
        &program_id,
    )?;


    // initialize ExtraAccountMetaList account with extra accounts
    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut extra_account_meta_list.try_borrow_mut_data()?,
        &extra_account_metas,
    )?;

    Ok(())
}
#[program]
pub mod candy_lst_machine {
   


    use spl_tlv_account_resolution::seeds::Seed;

    use super::*;

    

    pub fn transfer_hook(ctx: Context<TransferHook>) -> Result<()> {
        
let account_metas = vec![
    // index 0, stake pool
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_pool.key(), false, true)?,
    // index 1, stake pool withdraw authority
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_pool_withdraw_authority.key(), false, true)?,
    // index 2, pool token receiver account
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.pool_token_receiver_account.key(), false, true)?,
    // index 3, reserve stake account
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.reserve_stake_account.key(), false, true)?,
    // index 5, manager fee account
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.manager_fee_account.key(), false, true)?,
    // index 6, pool mint
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.pool_mint.key(), false, true)?,
    // index 7, token program
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.token_program.key(), false, false)?,
    // index 8, system program
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.system_program.key(), false, false)?,
    // index 9, clock
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.clock.key(), false, false)?,
    // index 10, stake history
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_history.key(), false, false)?,
    // index 11, stake program
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_program.key(), false, false)?,
    // index 12, rent
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.rent.key(), false, false)?,
    // index 13, destination token's owner
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.destination_token.owner, false, true)?,
    ExtraAccountMeta::new_with_seeds(
        &[Seed::Literal {
            bytes: "state".as_bytes().to_vec(),
        }],
        false, // is_signer
        true,  // is_writable
    )?,
ExtraAccountMeta::new_with_pubkey(&ctx.accounts.extra_accounts.key(), false, true)?,
];

        if ctx.accounts.destination_token.owner == Pubkey::from_str("1nc1nerator11111111111111111111111111111111").unwrap() {
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"extra-account-metas",
                &ctx.accounts.mint.to_account_info().key.as_ref(),
                &[ctx.bumps.extra_account_meta_list],
            ]];
            invoke_signed(
                &spl_stake_pool::instruction::withdraw_sol(
                    &spl_stake_pool::id(),
                    &ctx.accounts.stake_pool.key(),
                    &ctx.accounts.stake_pool_withdraw_authority.key(),
                    &ctx.accounts.extra_account_meta_list.key(),
                    &ctx.accounts.pool_token_receiver_account.key(),
                    &ctx.accounts.reserve_stake_account.key(),
                    &ctx.accounts.winner_winner_chickum_dinner.key(),
                    &ctx.accounts.manager_fee_account.key(),
                    &ctx.accounts.pool_mint.key(),
                    &anchor_spl::token::ID,
                    ctx.accounts.state.last
                ),
                &[
                    ctx.accounts.extra_account_meta_list.to_account_info(),
                    ctx.accounts.winner_winner_chickum_dinner.to_account_info(),
                    ctx.accounts.stake_pool.to_account_info(),
                    ctx.accounts.stake_pool_withdraw_authority.to_account_info(),
                    ctx.accounts.pool_token_receiver_account.to_account_info(),
                    ctx.accounts.reserve_stake_account.to_account_info(),
                    ctx.accounts.manager_fee_account.to_account_info(),
                    ctx.accounts.pool_mint.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.clock.to_account_info(),
                    ctx.accounts.stake_history.to_account_info(),
                    ctx.accounts.stake_program.to_account_info(),
                    ctx.accounts.rent.to_account_info(),
                ],
                signer_seeds
            )?;
        }

        // initialize ExtraAccountMetaList account with extra accounts
        ExtraAccountMetaList::update::<ExecuteInstruction>(
            &mut ctx.accounts.extra_accounts.try_borrow_mut_data()?,
            &account_metas,
        )?;
        Ok(())
    }

    pub fn mint_nft(ctx: Context<MintNFT>) -> Result<()> {
        let balance_before = ctx.accounts.pool_token_receiver_account.amount;
        invoke(
            &spl_stake_pool::instruction::deposit_sol(
                &spl_stake_pool::id(),
                &ctx.accounts.stake_pool.key(),
                &ctx.accounts.stake_pool_withdraw_authority.key(),
                &ctx.accounts.reserve_stake_account.key(),
                &ctx.accounts.payer.key(),
                &ctx.accounts.pool_token_receiver_account.key(),
                &ctx.accounts.manager_fee_account.key(),
                &ctx.accounts.manager_fee_account.key(),
                &ctx.accounts.pool_mint.key(),
                &anchor_spl::token::ID,
                1_000_000_000,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.reserve_stake_account.to_account_info(),
                ctx.accounts.pool_token_receiver_account.to_account_info(),
                ctx.accounts.stake_pool_withdraw_authority.to_account_info(),
                ctx.accounts.manager_fee_account.to_account_info(),
                ctx.accounts.pool_mint.to_account_info(),
                ctx.accounts.stake_pool.to_account_info(),
                ctx.accounts.stake_pool_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.potoken_program.to_account_info(),
            ],
        )?;
        ctx.accounts.pool_token_receiver_account.reload()?;
    let balance_after = ctx.accounts.pool_token_receiver_account.amount;
    let difference = balance_after - balance_before;

    let state = &mut ctx.accounts.state;
    state.last = difference;


let account_metas = vec![
    // index 0, stake pool
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_pool.key(), false, true)?,
    // index 1, stake pool withdraw authority
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_pool_withdraw_authority.key(), false, true)?,
    // index 2, pool token receiver account
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.pool_token_receiver_account.key(), false, true)?,
    // index 3, reserve stake account
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.reserve_stake_account.key(), false, true)?,
    // index 5, manager fee account
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.manager_fee_account.key(), false, true)?,
    // index 6, pool mint
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.pool_mint.key(), false, true)?,
    // index 7, token program
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.token_program.key(), false, false)?,
    // index 8, system program
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.system_program.key(), false, false)?,
    // index 9, clock
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.clock.key(), false, false)?,
    // index 10, stake history
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_history.key(), false, false)?,
    // index 11, stake program
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_program.key(), false, false)?,
    // index 12, rent
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.rent.key(), false, false)?,
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.payer.key(), false, true)?,
    ExtraAccountMeta::new_with_seeds(
        &[Seed::Literal {
            bytes: "state".as_bytes().to_vec(),
        }],
        false, // is_signer
        true,  // is_writable
    )?,
    
    ExtraAccountMeta::new_with_pubkey(&ctx.accounts.extra_account_meta_list.key(), false, true)?,


];

// ... existing code ...
    initialize_extra_account_meta_list(ctx.accounts.payer.to_account_info(), ctx.accounts.extra_account_meta_list.to_account_info(), ctx.accounts.mint.to_account_info(), crate::id(), ctx.bumps.extra_account_meta_list, ctx.accounts.system_program.to_account_info(),account_metas)?;
        Ok(())
    }


    // fallback instruction handler as workaround to anchor instruction discriminator check
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;

        // match instruction discriminator to transfer hook interface execute instruction  
        // token2022 program CPIs this instruction on token transfer
        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();

                // invoke custom transfer hook instruction on our program
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => return Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}


#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        token::mint = mint, 
        token::authority = owner,
    )]
    pub source_token: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        token::mint = mint,
    )]
    pub destination_token: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: source token account owner, can be SystemAccount or PDA owned by another program
    pub owner: UncheckedAccount<'info>,
    /// CHECK: ExtraAccountMetaList Account,
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()], 
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    
    #[account(mut)]
    /// CHECK:
    pub stake_pool: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub stake_pool_withdraw_authority: AccountInfo<'info>,
    #[account(mut, token::authority = extra_account_meta_list, token::mint = pool_mint)]
    pub pool_token_receiver_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK:
    pub reserve_stake_account: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK:
    pub manager_fee_account: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK:
    pub pool_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
    pub stake_history: Sysvar<'info, StakeHistory>,
    /// CHECK:
    pub stake_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub winner_winner_chickum_dinner: AccountInfo<'info>,
    #[account(
        seeds = [b"state"],//, mint.key().as_ref()],
        bump,
        mut
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub extra_accounts: AccountInfo<'info>,
}
#[account]
pub struct State {
    pub last: u64,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    /// CHECK:
    pub stake_pool: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK:
    pub stake_pool_withdraw_authority: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK:
    pub reserve_stake_account: AccountInfo<'info>,
    #[account(mut, token::authority = extra_account_meta_list, token::mint = pool_mint)]
    /// CHECK:
    pub pool_token_receiver_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK:
    pub manager_fee_account: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK:
    pub pool_mint: AccountInfo<'info>,
    pub potoken_program: Interface<'info, TokenInterface>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:
    pub stake_pool_program: AccountInfo<'info>,
    
    #[account(mut,seeds = [b"extra-account-metas", mint.key().as_ref()], bump)]
    /// CHECK:
    pub extra_account_meta_list: UncheckedAccount<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub stake_history: Sysvar<'info, StakeHistory>,
    /// CHECK:
    pub stake_program: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 100,
        seeds = [b"state"],//, mint.key().as_ref() ],
        bump,
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub extra_accounts: AccountInfo<'info>,
    
}