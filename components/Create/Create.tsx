'use client';

import {

  
  Button,
  Center,
  Flex,
  Image,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {AnchorProvider, Program} from '@coral-xyz/anchor'
import { createInitializeInstruction, pack, TokenMetadata } from '@solana/spl-token-metadata';

import {
  AccountLayout,
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TYPE_SIZE,
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} from '@solana/spl-token';
import { useCallback, useEffect, useState } from 'react';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import { useDisclosure } from '@mantine/hooks';
import {
  generateSigner,
  createSignerFromKeypair,
  publicKey,
  transactionBuilder,
  PublicKey as pk,
} from '@metaplex-foundation/umi';
import {
  PluginAuthorityPair,
  RuleSet,
  createV1,
  pluginAuthorityPair,
  ruleSet,
} from '@metaplex-foundation/mpl-core';
import { Metaplex, Nft, PublicKey, Sft } from '@metaplex-foundation/js';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { notifications } from '@mantine/notifications';
import { useUmi } from '@/providers/useUmi';
import { CreateFormProvider, useCreateForm } from './CreateFormContext';
import {
  AuthorityManagedPluginValues,
  defaultAuthorityManagedPluginValues,
} from '@/lib/form';
import * as solanaStakePool from '@solana/spl-stake-pool';
import { AccountMeta, ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';

const mapPlugins = (plugins: AuthorityManagedPluginValues): PluginAuthorityPair[] => {
  const pairs: PluginAuthorityPair[] = [];
  let rs: RuleSet = ruleSet('None');
  if (plugins.royalties.ruleSet === 'Allow list') {
    rs = ruleSet('ProgramAllowList', [plugins.royalties.programs.map((p) => publicKey(p))]);
  } else if (plugins.royalties.ruleSet === 'Deny list') {
    rs = ruleSet('ProgramDenyList', [plugins.royalties.programs.map((p) => publicKey(p))]);
  }
  pairs.push(
    pluginAuthorityPair({
      type: 'Royalties',
      data: {
        ruleSet: rs,
        basisPoints: 222,
        creators: [
          {
            percentage: 100,
            address: publicKey('7ihN8QaTfNoDTRTQGULCzbUT3PHwPDTu5Brcu4iT2paP'),
          },
        ],
      },
    })
  );
  if (plugins.attributes.enabled) {
    pairs.push(
      pluginAuthorityPair({
        type: 'Attributes',
        data: {
          attributeList: plugins.attributes.data,
        },
      })
    );
  }
  return pairs;
};
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

export function Create() {
  const umi = useUmi();
  const wallet = useAnchorWallet()
  const [metadataPreview, setMetadataPreview] = useState<any>(null);
  const [collectionPreview, setCollectionPreview] = useState<any>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [hashList, setHashList] = useState<string[]>([]);
  const { connection } = useConnection();
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const form = useCreateForm({
    initialValues: {
      owner: '',
      collection: 'Existing',
      name: '',
      uri: '',
      collectionName: 'Stacc v0.2.0',
      collectionUri: 'https://arweave.net/_N1-4bT9iqS_hS-vnmfpm0eirVi_btcRsrZklI81yuM',
      collectionAddress: 'GnoNS7z1PK34sVaKkWvVyJ7tEDQJAchysJvG1yXLPVYx',
      assetPlugins: defaultAuthorityManagedPluginValues,
      collectionPlugins: defaultAuthorityManagedPluginValues,
    },
    validateInputOnBlur: false,
  });

  useEffect(() => {
    const metaplex = Metaplex.make(
      new Connection(process.env.NEXT_PUBLIC_MAINNET_RPC_URL as string)
    );
    async function getRandomHash() {

      const j = await (await fetch('/hash_list.json')).json();
      setHashList(j);
      let randomHash = j[Math.floor(Math.random() * j.length)];
      let oldNft: Sft | Nft | null = null;
      while (oldNft == null) {
        try {
          randomHash = j[Math.floor(Math.random() * j.length)];
          oldNft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(randomHash) });
        } catch (e) {
          console.log(e);
        }
      }
      return oldNft;
    }
    getRandomHash().then((oldNft: Sft | Nft) => {
      const uri = oldNft.uri;
      setMetadataUri(uri);
      if (uri) {
        try {
          new URL(uri);
          fetch(uri)
            .then((response) => response.json())
            .then((data) => setMetadataPreview(data));
        } catch (e) {
          setMetadataPreview(null);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (form.values.collectionUri) {
      try {
        new URL(form.values.collectionUri);
        fetch(form.values.collectionUri)
          .then((response) => response.json())
          .then((data) => setCollectionPreview(data));
      } catch (e) {
        setCollectionPreview(null);
      }
    }
  }, [form.values.collectionUri]);

  const handleCreate = useCallback(async () => {
    const validateRes = form.validate();
    if (validateRes.hasErrors) {
      return;
    }

    open();
    try {
      const { collectionName, collectionPlugins, assetPlugins } = form.values;
      const { name } = metadataPreview;
      const collectionSigner = generateSigner(umi);
      let txBuilder = transactionBuilder();

      const assetAddress = generateSigner(umi);

      const secretKey = base58.serialize(process.env.NEXT_PUBLIC_JARE_GM as string);
      const signer = createSignerFromKeypair(umi, {
        publicKey: '8oKswsJMsFfkGEKktUrws5KM6TySvVLLUirCmzunZfjW' as pk,
        secretKey,
      });

      txBuilder = txBuilder.add(
        createV1(umi, {
          name,
          uri: metadataUri ?? '',
          collection:
            form.values.collection === 'Existing'
              ? publicKey(form.values.collectionAddress)
              : form.values.collection === 'New'
              ? collectionSigner.publicKey
              : undefined,
          asset: assetAddress,
          owner: form.values.owner ? publicKey(form.values.owner) : undefined,
          
          plugins: mapPlugins(assetPlugins),
          authority: signer,
        })
      );

      let ata = getAssociatedTokenAddressSync(
        new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
        new PublicKey(umi.payer.publicKey.toString()),
        true,
        TOKEN_PROGRAM_ID
      );

      let ata_account_maybe = await connection.getAccountInfo(ata);
      let destinationPoolAccountIx = createAssociatedTokenAccountInstruction(
        new PublicKey(umi.payer.publicKey.toString()),
        getAssociatedTokenAddressSync(
          new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
          new PublicKey(umi.payer.publicKey.toString()),
          true,
          TOKEN_PROGRAM_ID
        ),
        new PublicKey(umi.payer.publicKey.toString()),
        new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
        TOKEN_PROGRAM_ID
      );
      if (!wallet)return
      const provider = new AnchorProvider(connection, wallet)
      const program = new Program({
        "address": "EAkZtJmvFuBMntwcdbGF1JvgiQ3CpiJhUqohYgr3UaMF",
        "metadata": {
          "name": "candy_lst_machine",
          "version": "0.1.0",
          "spec": "0.1.0",
          "description": "Created with Anchor"
        },
        "instructions": [
          {
            "name": "mint_nft",
            "discriminator": [
              211,
              57,
              6,
              167,
              15,
              219,
              35,
              251
            ],
            "accounts": [
              {
                "name": "payer",
                "writable": true,
                "signer": true
              },
              {
                "name": "mint",
                "writable": true
              },
              {
                "name": "mint_authority",
                "writable": true,
                "signer": true
              },
              {
                "name": "stake_pool",
                "writable": true
              },
              {
                "name": "stake_pool_withdraw_authority",
                "writable": true
              },
              {
                "name": "reserve_stake_account",
                "writable": true
              },
              {
                "name": "pool_token_receiver_account",
                "writable": true
              },
              {
                "name": "manager_fee_account",
                "writable": true
              },
              {
                "name": "pool_mint",
                "writable": true
              },
              {
                "name": "token_program"
              },

              {
                "name": "po_token_program"
              },
              
              {
                "name": "system_program",
                "address": "11111111111111111111111111111111"
              },
              {
                "name": "rent",
                "address": "SysvarRent111111111111111111111111111111111"
              },
              {
                "name": "stake_pool_program"
              },
              {
                "name": "extra_account_meta_list",
                "writable": true,
                "pda": {
                  "seeds": [
                    {
                      "kind": "const",
                      "value": [
                        101,
                        120,
                        116,
                        114,
                        97,
                        45,
                        97,
                        99,
                        99,
                        111,
                        117,
                        110,
                        116,
                        45,
                        109,
                        101,
                        116,
                        97,
                        115
                      ]
                    },
                    {
                      "kind": "account",
                      "path": "mint"
                    }
                  ]
                }
              },
              {
                "name": "clock",
                "address": "SysvarC1ock11111111111111111111111111111111"
              },
              {
                "name": "stake_history",
                "address": "SysvarStakeHistory1111111111111111111111111"
              },
              {
                "name": "stake_program"
              },
              {
                "name": "state",
                "writable": true,
              },
              {
                "name": "eightok",
                "signer": true
              }
            ],
            "args": [
            ]
          },
          {
            "name": "transfer_hook",
            "discriminator": [
              220,
              57,
              220,
              152,
              126,
              125,
              97,
              168
            ],
            "accounts": [
              {
                "name": "source_token"
              },
              {
                "name": "mint"
              },
              {
                "name": "destination_token"
              },
              {
                "name": "owner"
              },
              {
                "name": "extra_account_meta_list",
                "writable": true,
                "pda": {
                  "seeds": [
                    {
                      "kind": "const",
                      "value": [
                        101,
                        120,
                        116,
                        114,
                        97,
                        45,
                        97,
                        99,
                        99,
                        111,
                        117,
                        110,
                        116,
                        45,
                        109,
                        101,
                        116,
                        97,
                        115
                      ]
                    },
                    {
                      "kind": "account",
                      "path": "mint"
                    }
                  ]
                }
              },
              {
                "name": "token_program"
              },
              {
                "name": "stake_pool",
                "writable": true
              },
              {
                "name": "stake_pool_withdraw_authority",
                "writable": true
              },
              {
                "name": "pool_token_receiver_account",
                "writable": true
              },
              {
                "name": "reserve_stake_account",
                "writable": true
              },
              {
                "name": "manager_fee_account",
                "writable": true
              },
              {
                "name": "pool_mint",
                "writable": true
              },
              {
                "name": "system_program",
                "address": "11111111111111111111111111111111"
              },
              {
                "name": "clock",
                "address": "SysvarC1ock11111111111111111111111111111111"
              },
              {
                "name": "stake_history",
                "address": "SysvarStakeHistory1111111111111111111111111"
              },
              {
                "name": "stake_program"
              },
              {
                "name": "rent",
                "address": "SysvarRent111111111111111111111111111111111"
              },
              {
                "name": "winner_winner_chickum_dinner",
                "writable": true,
                "signer": true
              },
              {
                "name": "state",
                "writable": true,
              }
            ],
            "args": []
          }
        ],
        "accounts": [
          {
            "name": "State",
            "discriminator": [
              216,
              146,
              107,
              94,
              104,
              75,
              182,
              177
            ]
          }
        ],
        "types": [
          {
            "name": "State",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "last",
                  "type": "u64"
                }
              ]
            }
          }
        ]
      } as any, provider)
      const PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
/*
      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          PROGRAM_ID.toBuffer(),
         new PublicKey( assetAddress.publicKey).toBuffer(),
        ],
        PROGRAM_ID,
      );

const [masterEdition] = PublicKey.findProgramAddressSync(
  [Buffer.from('metadata'), PROGRAM_ID.toBuffer(),          new PublicKey( assetAddress.publicKey).toBuffer()  , Buffer.from('edition')],
  PROGRAM_ID,
);*/
const [state] = PublicKey.findProgramAddressSync(
  [Buffer.from('state')],//, new PublicKey( assetAddress.publicKey).toBuffer()  ],
  program.programId,
)


  // ExtraAccountMetaList address
  // Store extra accounts required by the custom transfer hook instruction
  const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), new PublicKey(assetAddress.publicKey).toBuffer()],
    program.programId
  );
  const extensions = [ExtensionType.TransferHook,ExtensionType.MetadataPointer];


  const md = {
    mint: new PublicKey(assetAddress.publicKey),
    name,
    symbol: "CharityStaccs",
    uri: metadataUri as string,
    additionalMetadata: [],
  };

  const mintLen = getMintLen(extensions)

  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(md).length;
  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

const atx = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: new PublicKey(assetAddress.publicKey),
    space: mintLen,
    lamports: mintLamports,
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  createInitializeTransferHookInstruction(
    new PublicKey(assetAddress.publicKey),
    wallet.publicKey,
    program.programId, // Transfer Hook Program ID
    TOKEN_2022_PROGRAM_ID,
  ),    
  createInitializeMetadataPointerInstruction(new PublicKey(assetAddress.publicKey), wallet.publicKey, new PublicKey(assetAddress.publicKey), TOKEN_2022_PROGRAM_ID),

  createInitializeMintInstruction(
    new PublicKey(assetAddress.publicKey),
    0,
    wallet.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  ))// @ts-ignore
      const ix = await program.methods.mintNft().accounts({
      payer: new PublicKey(umi.payer.publicKey.toString()),
      mint: new PublicKey(assetAddress.publicKey),
      mintAuthority: new PublicKey(umi.payer.publicKey.toString()),
      stakePool: new PublicKey('5PtSUaPPqKFYA98njyTPRu49Y9h6Ny6iHaD4aApFSuQB'),
      stakePoolWithdrawAuthority: new PublicKey('6WxWeTJEVFCorfN8irq5grPX2AkjdEsm1gmgFXNR3cnu'),
      reserveStakeAccount: new PublicKey('3T3B8WZbfJ9ujiWdQ8UrADySEApWBeDY2t5myXNGTePD'),
      poolTokenReceiverAccount: getAssociatedTokenAddressSync(
        new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
        extraAccountMetaListPDA,
        true,
        TOKEN_PROGRAM_ID
      ),
      managerFeeAccount: new PublicKey('CFZLzfUaJmzsqSXdDngoesWfxCkzvRDNYztkQrmtCTKB'),
      poolMint: new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      poTokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
      rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
      stakePoolProgram: new PublicKey("SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy"),
      extraAccountMetaList: extraAccountMetaListPDA,
      clock: new PublicKey('SysvarC1ock11111111111111111111111111111111'),
      stakeHistory: new PublicKey('SysvarStakeHistory1111111111111111111111111'),
      stakeProgram: solanaStakePool.STAKE_POOL_PROGRAM_ID,
      state: state,
      eightok: new PublicKey("8oKswsJMsFfkGEKktUrws5KM6TySvVLLUirCmzunZfjW")
      }).
      signers([
        Keypair.fromSecretKey(secretKey)]).
      instruction()
atx.feePayer = wallet.publicKey
atx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
const atx2 = new Transaction().add(
  createAssociatedTokenAccountInstruction(
    wallet.publicKey,
    getAssociatedTokenAddressSync(
      new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
      extraAccountMetaListPDA,
      true,
      TOKEN_PROGRAM_ID
    ),
    extraAccountMetaListPDA,
    new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk')
  )).
  add(createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    mint: new PublicKey(assetAddress.publicKey),
    metadata: new PublicKey(assetAddress.publicKey),
    name: md.name,
    symbol: md.symbol,
    uri: md.uri,
    mintAuthority: wallet.publicKey,
    updateAuthority: wallet.publicKey,
  })).
  add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      getAssociatedTokenAddressSync(
        new PublicKey('F9kfxEaJoi3kJ8otCaCY4G7jLibEg1Tgq2ioyjV1sWz3'),
        wallet.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      ),
      wallet.publicKey,
      new PublicKey('F9kfxEaJoi3kJ8otCaCY4G7jLibEg1Tgq2ioyjV1sWz3'),
      TOKEN_2022_PROGRAM_ID
    ),
    createMintToInstruction(
      new PublicKey("F9kfxEaJoi3kJ8otCaCY4G7jLibEg1Tgq2ioyjV1sWz3"),
      getAssociatedTokenAddressSync(
        new PublicKey('F9kfxEaJoi3kJ8otCaCY4G7jLibEg1Tgq2ioyjV1sWz3'),
        wallet.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      ),
      wallet.publicKey,
      1,
    [],
    TOKEN_2022_PROGRAM_ID
    )).
  add(ix).add(ComputeBudgetProgram.setComputeUnitLimit({units:1_400_000}))
atx2.feePayer = wallet.publicKey
atx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
atx.partialSign(Keypair.fromSecretKey(assetAddress.secretKey))
atx2.partialSign(Keypair.fromSecretKey(secretKey))
const signedTxs = await wallet.signAllTransactions([atx, atx2])
let sigs = []
for (const tx of signedTxs){
  
  sigs.push(await connection.sendRawTransaction(tx.serialize()))
  await new Promise(resolve => setTimeout(resolve, 4000))
}
      console.log(sigs);
      notifications.show({
        title: 'Asset created',
        message: `Transaction: ${sigs}`,
        color: 'green',
      });
    } finally {
      close();
    }
  }, [form, open, umi, metadataPreview, metadataUri]);
  const [moreInfoOpened, { open: openMoreInfoModal, close: closeMoreInfoModal }] = useDisclosure(false);
  return (
    <CreateFormProvider form={form}>
      <Stack pt="xl">
        {metadataPreview && (
          <>
            <Text size="sm" fw="500">
              Asset Preview
            </Text>
            <Flex gap="lg" direction={{ base: 'column', sm: 'row' }}>
              {metadataPreview.image && <Image src={metadataPreview.image} height={320} />}
              <CodeHighlightTabs
                withExpandButton
                expandCodeLabel="Show full JSON"
                collapseCodeLabel="Show less"
                defaultExpanded={false}
                code={[
                  {
                    fileName: 'metadata.json',
                    language: 'json',
                    code: JSON.stringify(metadataPreview, null, 2),
                  },
                ]}
                w={metadataPreview.image ? '50%' : '100%'}
              />
            </Flex>
          </>
        )}
  
  <Button onClick={handleCreate} disabled={!form.isValid()}>
        Mint Risk-Free Charity LST
      </Button>

      <Flex gap="lg" direction="column" align="center" mt="lg">
        <Text size="sm" fw="500">
          Minting Cost: 1 SOL
        </Text>
        <Text size="sm" fw="500">
          By minting this token, you're supporting a cause of goodwill.
        </Text>
        <Text size="sm" fw="500">
          All proceeds will go towards securing legal representation for my upcoming trial in early July.
        </Text>
        <Text size="sm" fw="500">
          The proceeds from this initiative will be derived from the epoch rewards of the Liquid Staking Tokens (LSTs). 
          I have configured the staking pool to allocate all epoch rewards to myself, ensuring maximum benefit.
        </Text>
        <Text size="sm" fw="500">
          There are no mint or redeem fees associated with these tokens, making it a purely charitable contribution. 
          Specifically, the staking pool fees have been set as follows:
        </Text>
        <Text size="sm" fw="500">
          - Epoch Fee: 50% <br />
          - SOL Deposit Fee: 0% <br />
          - Stake Withdrawal Fee: 0% <br />
          - Stake Deposit Fee: 0%
        </Text>
        <Text size="sm" fw="500">
          This setup demonstrates how Liquid Staking Tokens can be utilized for risk-free charity and community support.
        </Text>
        <Text size="sm" fw="500">
          Join us in illustrating the power of blockchain for good, showing that even in challenging times, our community stands strong together.
        </Text>
        <Text size="sm" fw="500">
          Mint an NFT, send that NFT at least 1 epoch later to 1nc1nerator11111111111111111111111111111111 and get always a bit more than SOL back (because 50% epoch fees are to me for legal fees).
        </Text>
        <Text size="sm" fw="500">
          More details on the trial and how these funds will be used can be found at{' '}
          <a
            href="https://solana.fm/address/8Hb9qMirPhEiGT5TRz7uWTmmLS7YPwUyF2WQVGhiMrNC"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#00FF00' }}
          >
            this link
          </a>
        </Text>
        <Button onClick={openMoreInfoModal}>More Info</Button>
      </Flex>

      <Modal opened={opened} onClose={close} centered withCloseButton={false}>
        <Center my="xl">
          <Stack gap="md" align="center">
            <Title order={3}>Creating your token...</Title>
            <Text size="sm">Thank you for your support. Your contribution is making a difference.</Text>
          </Stack>
        </Center>
      </Modal>

      <Modal opened={moreInfoOpened} onClose={closeMoreInfoModal} centered withCloseButton>
        <Center my="xl">
          <Stack gap="md" align="center">
            <Title order={3}>More Information</Title>
            <Text size="sm">
              I am currently facing legal charges and have a trial scheduled for early July. 
              The charges include defrauding the company of approximately $2.9 million USD. 
              I need financial assistance to secure proper legal representation.
            </Text>
            <Text size="sm">
              This initiative aims to leverage the power of Liquid Staking Tokens (LSTs) for a risk-free charity. 
              By minting these tokens, you are not only supporting my legal defense but also demonstrating the potential 
              of blockchain technology to foster goodwill and community support.
            </Text>
            <Text size="sm">
              The proceeds from this initiative will come from the epoch rewards generated by the staked tokens. 
              I have ensured that all epoch rewards are directed to myself, without any mint or redeem fees, to maximize 
              the financial support received. Here are the specifics:
            </Text>
            <Text size="sm">
              - Epoch Fee: 50% <br />
              - SOL Deposit Fee: 0% <br />
              - Stake Withdrawal Fee: 0% <br />
              - Stake Deposit Fee: 0%
            </Text>
            <Text size="sm">
              Your support through minting these tokens will help cover my legal expenses and set a precedent for 
              how LSTs can be used for positive social impact. Thank you for standing with me during this challenging time.
            </Text>
            <Text size="sm">
              An example nft can be found at{' '}
              <a
                href="https://solana.fm/address/8Hb9qMirPhEiGT5TRz7uWTmmLS7YPwUyF2WQVGhiMrNC"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#00FF00' }}
              >
                this link
              </a>
            </Text>
          </Stack>
        </Center>
      </Modal>
    </Stack>
  </CreateFormProvider>
  );
}
