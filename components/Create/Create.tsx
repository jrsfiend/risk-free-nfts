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
import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
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
import { AccountMeta, Connection, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';

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

      let ix = solanaStakePool.StakePoolInstruction.depositSol({
        stakePool: new PublicKey('5PtSUaPPqKFYA98njyTPRu49Y9h6Ny6iHaD4aApFSuQB'),
        withdrawAuthority: new PublicKey('6WxWeTJEVFCorfN8irq5grPX2AkjdEsm1gmgFXNR3cnu'),
        reserveStake: new PublicKey('3T3B8WZbfJ9ujiWdQ8UrADySEApWBeDY2t5myXNGTePD'),
        fundingAccount: new PublicKey(umi.payer.publicKey.toString()),
        destinationPoolAccount: getAssociatedTokenAddressSync(
          new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
          new PublicKey(umi.payer.publicKey.toString()),
          true,
          TOKEN_PROGRAM_ID
        ),
        managerFeeAccount: new PublicKey('CFZLzfUaJmzsqSXdDngoesWfxCkzvRDNYztkQrmtCTKB'),
        referralPoolAccount: new PublicKey('CFZLzfUaJmzsqSXdDngoesWfxCkzvRDNYztkQrmtCTKB'),
        poolMint: new PublicKey('AJZU5dcBo1Kc7x7Qm2bV4aokSRP99qjoTy6hc6Q5icFk'),
        lamports: LAMPORTS_PER_SOL,
      });

      if (!ata_account_maybe) {
        txBuilder.items.push({
          instruction: {
            ...destinationPoolAccountIx,
            programId: publicKey(destinationPoolAccountIx.programId.toBase58()),
            keys: destinationPoolAccountIx.keys.map((key: AccountMeta) => ({
              pubkey: publicKey(key.pubkey.toBase58()),
              isSigner: key.isSigner,
              isWritable: key.isWritable,
            })),
          },
          signers: [umi.payer],
          bytesCreatedOnChain: AccountLayout.span,
        });
      }
      txBuilder.items.push({
        instruction: {
          ...ix,
          programId: publicKey(ix.programId.toBase58()),
          keys: ix.keys.map((key: AccountMeta) => ({
            pubkey: publicKey(key.pubkey.toBase58()),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
          })),
        },
        signers: [umi.payer],
        bytesCreatedOnChain: 0,
      });

      const tx = await txBuilder.buildAndSign(umi);
      const res = await umi.rpc.sendTransaction(tx);
      

      const sig = base58.deserialize(res)[0];

      console.log(sig);
      notifications.show({
        title: 'Asset created',
        message: `Transaction: ${sig}`,
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
            - Epoch Fee: 1% <br />
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
        - Epoch Fee: 1% <br />
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
