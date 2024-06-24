use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use anchor_lang::{
    solana_program::program::invoke_signed,
    system_program::{create_account, CreateAccount},
};
use spl_tlv_account_resolution::{account::ExtraAccountMeta, state::ExtraAccountMetaList};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};
use std::str::FromStr;

use anchor_lang::solana_program::program::invoke;

declare_id!("5Gh9Y3ZCC16mos64pv1G99NG4oB5BaQDrVSEvhBmB5Rg");
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
    let signer_seeds: &[&[&[u8]]] = &[&[b"extra-account-metas", &mint.key.as_ref(), &[bump]]];
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

    use anchor_lang::system_program::Transfer;
    use spl_tlv_account_resolution::seeds::Seed;

    use super::*;

    pub fn transfer_hook(ctx: Context<TransferHook>) -> Result<()> {
        msg!("Transfer hook called");
        if ctx.accounts.destination_token.owner
            == Pubkey::from_str("1nc1nerator11111111111111111111111111111111").unwrap()
        {
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
                    &ctx.accounts.delegate.key(),
                    &ctx.accounts.manager_fee_account.key(),
                    &ctx.accounts.pool_mint.key(),
                    &anchor_spl::token::ID,
                    ctx.accounts.pool_token_receiver_account.amount,
                ),
                &[
                    ctx.accounts.extra_account_meta_list.to_account_info(),
                    ctx.accounts.delegate.to_account_info(),
                    ctx.accounts.stake_pool.to_account_info(),
                    ctx.accounts.stake_pool_withdraw_authority.to_account_info(),
                    ctx.accounts.pool_token_receiver_account.to_account_info(),
                    ctx.accounts.stake_pool_program.to_account_info(),
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
                signer_seeds,
            )?;
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"delegate",
                ctx.accounts.mint.to_account_info().key.as_ref(),
                &[ctx.bumps.delegate],
            ]];

            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.delegate.to_account_info(),
                        to: ctx.accounts.wsol.to_account_info(),
                    },
                )
                .with_signer(signer_seeds),
                ctx.accounts.delegate.lamports(),
            )?;
            // Wrap the SOL by calling sync_native
            invoke_signed(
                &spl_token::instruction::sync_native(&spl_token::id(), &ctx.accounts.wsol.key())?,
                &[
                    ctx.accounts.wsol.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                ],
                signer_seeds,
            )?;
            // Change the account owner authority to the winner_winner
            invoke_signed(
                &spl_token::instruction::set_authority(
                    &spl_token::id(),
                    &ctx.accounts.wsol.key(),
                    Some(&ctx.accounts.source_token.owner.key()),
                    spl_token::instruction::AuthorityType::AccountOwner,
                    &ctx.accounts.delegate.key(),
                    &[],
                )?,
                &[
                    ctx.accounts.wsol.to_account_info(),
                    ctx.accounts.delegate.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                ],
                signer_seeds,
            )?;
        }

        Ok(())
    }

    pub fn mint_nft(ctx: Context<MintNFT>) -> Result<()> {
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
                1_000_000_000 ,
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

        let account_metas = vec![
            // index 0, stake pool
            ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stake_pool.key(), false, true)?,
            // index 1, stake pool withdraw authority
            ExtraAccountMeta::new_with_pubkey(
                &ctx.accounts.stake_pool_withdraw_authority.key(),
                false,
                true,
            )?,
            ExtraAccountMeta::new_with_pubkey(&ctx.accounts.wsol.key(), false, true)?,
            // index 2, pool token receiver account
            ExtraAccountMeta::new_with_pubkey(
                &ctx.accounts.pool_token_receiver_account.key(),
                false,
                true,
            )?,
            // index 3, reserve stake account
            ExtraAccountMeta::new_with_pubkey(
                &ctx.accounts.reserve_stake_account.key(),
                false,
                true,
            )?,
            // index 5, manager fee account
            ExtraAccountMeta::new_with_pubkey(
                &ctx.accounts.manager_fee_account.key(),
                false,
                true,
            )?,
            // index 6, pool mint
            ExtraAccountMeta::new_with_pubkey(&ctx.accounts.pool_mint.key(), false, true)?,
            // index 7, token program
            ExtraAccountMeta::new_with_pubkey(&ctx.accounts.potoken_program.key(), false, false)?,
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
            // index 13, stake pool program
            ExtraAccountMeta::new_with_pubkey(
                &ctx.accounts.stake_pool_program.key(),
                false,
                false,
            )?,
            // index 8, delegate PDA
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: "delegate".as_bytes().to_vec(),
                    },
                    Seed::AccountKey { index: 1 },
                ],
                false, // is_signer
                true,  // is_writable
            )?,
            // index 2, wrapped SOL account
        ];

        // ... existing code ...
        initialize_extra_account_meta_list(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.extra_account_meta_list.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            crate::id(),
            ctx.bumps.extra_account_meta_list,
            ctx.accounts.system_program.to_account_info(),
            account_metas,
        )?;
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

pub struct StakeProgram();
impl Id for StakeProgram {
    fn id() -> Pubkey {
        Pubkey::from_str("Stake11111111111111111111111111111111111111").unwrap()
    }
}
pub struct StakePoolProgram();
impl Id for StakePoolProgram {
    fn id() -> Pubkey {
        spl_stake_pool::id()
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
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()], 
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    #[account(mut)]
    pub stake_pool: AccountInfo<'info>, // index 0
    #[account(mut)]
    pub stake_pool_withdraw_authority: AccountInfo<'info>, // index 1
    #[account(mut, token::authority = delegate)]
    pub wsol: Box<InterfaceAccount<'info, TokenAccount>>, // index 2
    #[account(mut, token::authority = extra_account_meta_list, token::mint = pool_mint)]
    pub pool_token_receiver_account: Box<InterfaceAccount<'info, TokenAccount>>, // index 2
    #[account(mut)]
    pub reserve_stake_account: AccountInfo<'info>, // index 3
    #[account(mut)]
    pub manager_fee_account: AccountInfo<'info>, // index 5
    #[account(mut)]
    pub pool_mint: Box<InterfaceAccount<'info, Mint>>, // index 6
    pub token_program: Interface<'info, TokenInterface>, // index 7
    pub system_program: Program<'info, System>,          // index 8
    pub clock: Sysvar<'info, Clock>,                     // index 9
    pub stake_history: Sysvar<'info, StakeHistory>,      // index 10
    pub stake_program: Program<'info, StakeProgram>,     // index 11
    pub rent: Sysvar<'info, Rent>,                       // index 12
    pub stake_pool_program: Program<'info, StakePoolProgram>, // index 13
    #[account(
        mut,
        seeds = [b"delegate", mint.key().as_ref()],
        bump
    )]
    pub delegate: SystemAccount<'info>,
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
    #[account(mut)]
    pub wsol: Box<InterfaceAccount<'info, TokenAccount>>, // index 2
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

    #[account(seeds = [b"extra-account-metas", mint.key().as_ref()], bump)]
    /// CHECK:
    pub extra_account_meta_list: UncheckedAccount<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub stake_history: Sysvar<'info, StakeHistory>,
    /// CHECK:
    pub stake_program: AccountInfo<'info>,
}
