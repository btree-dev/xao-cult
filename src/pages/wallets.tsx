import type { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';
import BackNavbar from '../components/BackNav';
import styles from '../styles/CreateContract.module.css';
import { useState } from 'react';
import { useReadContracts } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '../wagmi';
import { useWeb3 } from '../hooks/useWeb3';
import { XAO_WALLET_FACTORY_ABI, XAO_WALLET_ABI } from '../lib/web3/eventcontract';
import { CONTRACT_ADDRESSES } from '../lib/web3/chains';
import { baseSepolia } from 'wagmi/chains';

const PRIMARY_ROLES = ['Artist', 'Promoter', 'Venue', 'Booking Agent', 'Production', 'Other'];

const panelStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '12px',
};
const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' };
const valueStyle: React.CSSProperties = { color: 'white', fontSize: '14px', marginBottom: '12px', wordBreak: 'break-all' };

const Wallets: NextPage = () => {
  const { address, chain } = useWeb3();

  const factoryAddr = (
    CONTRACT_ADDRESSES[(chain?.id ?? baseSepolia.id) as keyof typeof CONTRACT_ADDRESSES]?.XAOWalletFactory || '0x'
  ) as `0x${string}`;

  const hasFactory = factoryAddr !== '0x' && factoryAddr !== '0x0000000000000000000000000000000000000000';

  // ─── READ: does this user already have a wallet? ─────────────────────────

  const { data: walletLookup, refetch: refetchWallet } = useReadContracts({
    contracts: address && hasFactory ? [
      { address: factoryAddr, abi: XAO_WALLET_FACTORY_ABI, functionName: 'walletOf', args: [address] },
    ] : [],
    query: { enabled: !!(address && hasFactory) },
  });

  const walletAddr = walletLookup?.[0]?.status === 'success'
    ? (walletLookup[0].result as `0x${string}`)
    : undefined;
  const hasWallet = !!(walletAddr && walletAddr !== '0x0000000000000000000000000000000000000000');

  // ─── READ: wallet details ─────────────────────────────────────────────────

  const { data: walletData, refetch: refetchWalletData } = useReadContracts({
    contracts: hasWallet ? [
      { address: walletAddr!, abi: XAO_WALLET_ABI, functionName: 'xaoUsername' },
      { address: walletAddr!, abi: XAO_WALLET_ABI, functionName: 'primaryRole' },
      { address: walletAddr!, abi: XAO_WALLET_ABI, functionName: 'didDocumentCID' },
      { address: walletAddr!, abi: XAO_WALLET_ABI, functionName: 'profileMetadataCID' },
      { address: walletAddr!, abi: XAO_WALLET_ABI, functionName: 'getContracts' },
    ] : [],
    query: { enabled: hasWallet },
  });

  const xaoUsername = walletData?.[0]?.status === 'success' ? String(walletData[0].result) : '';
  const primaryRole = walletData?.[1]?.status === 'success' ? Number(walletData[1].result) : 0;
  const didCID = walletData?.[2]?.status === 'success' ? String(walletData[2].result) : '';
  const profileCID = walletData?.[3]?.status === 'success' ? String(walletData[3].result) : '';
  const registeredContracts = walletData?.[4]?.status === 'success' ? (walletData[4].result as string[]) : [];

  // ─── DEPLOY STATE ─────────────────────────────────────────────────────────

  const [username, setUsername] = useState('');
  const [role, setRole] = useState(0);
  const [didInput, setDidInput] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  // ─── UPDATE PROFILE STATE ─────────────────────────────────────────────────

  const [newDidCID, setNewDidCID] = useState('');
  const [newProfileCID, setNewProfileCID] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!hasFactory || !username.trim()) return;
    try {
      setIsDeploying(true);
      const txHash = await writeContract(config, {
        address: factoryAddr,
        abi: XAO_WALLET_FACTORY_ABI,
        functionName: 'deploy',
        args: [username.trim(), role, didInput.trim()],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      await refetchWallet();
      await refetchWalletData();
    } catch (err: any) {
      console.error(err);
      alert('Failed to deploy wallet: ' + (err?.shortMessage || err?.message || 'unknown error'));
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!hasWallet || !walletAddr) return;
    try {
      setIsUpdating(true);
      const txHash = await writeContract(config, {
        address: walletAddr,
        abi: XAO_WALLET_ABI,
        functionName: 'updateProfile',
        args: [newDidCID.trim(), newProfileCID.trim()],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      await refetchWalletData();
      setNewDidCID('');
      setNewProfileCID('');
    } catch (err: any) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const renderWalletInfo = () => (
    <div style={panelStyle}>
      <h3 style={{ color: 'white', fontSize: '15px', marginBottom: '12px' }}>Your XAO Smart Wallet</h3>

      <p style={labelStyle}>Wallet Address</p>
      <p style={{ ...valueStyle, fontSize: '12px' }}>{walletAddr}</p>

      <p style={labelStyle}>XAO Username</p>
      <p style={valueStyle}>{xaoUsername || '—'}</p>

      <p style={labelStyle}>Primary Role</p>
      <p style={valueStyle}>{PRIMARY_ROLES[primaryRole] ?? 'Unknown'}</p>

      {didCID && (
        <>
          <p style={labelStyle}>DID Document CID</p>
          <p style={{ ...valueStyle, fontSize: '12px' }}>{didCID}</p>
        </>
      )}

      {profileCID && (
        <>
          <p style={labelStyle}>Profile Metadata CID</p>
          <p style={{ ...valueStyle, fontSize: '12px' }}>{profileCID}</p>
        </>
      )}

      <p style={labelStyle}>Registered Contracts</p>
      <p style={valueStyle}>{registeredContracts.length === 0 ? 'None' : ''}</p>
      {registeredContracts.map((addr, i) => (
        <p key={i} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '4px' }}>{addr}</p>
      ))}
    </div>
  );

  const renderUpdateProfile = () => (
    <div style={panelStyle}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Update Profile</h3>
      <p style={{ ...labelStyle, marginBottom: '10px' }}>
        Upload your DID document or profile JSON to IPFS and paste the CIDs below.
      </p>
      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="DID document IPFS CID"
          value={newDidCID}
          onChange={e => setNewDidCID(e.target.value)}
          className={styles.input}
        />
      </div>
      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="Profile metadata IPFS CID"
          value={newProfileCID}
          onChange={e => setNewProfileCID(e.target.value)}
          className={styles.input}
        />
      </div>
      <button
        className={styles.arbitrateButton}
        onClick={handleUpdateProfile}
        disabled={isUpdating || (!newDidCID.trim() && !newProfileCID.trim())}
      >
        {isUpdating ? 'Updating…' : 'Update Profile'}
      </button>
    </div>
  );

  const renderDeployForm = () => (
    <div style={{ ...panelStyle, border: '1px solid rgba(255,153,0,0.3)' }}>
      <h3 style={{ color: '#ff9900', fontSize: '14px', marginBottom: '8px' }}>Create Your XAO Wallet</h3>
      <p style={{ ...labelStyle, marginBottom: '12px' }}>
        Your XAO smart wallet is your on-chain identity. It stores your username, role, and acts as an anchor for all your show contracts.
      </p>

      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="XAO username (e.g. @artist_xyz)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.inputRow}>
        <select
          value={role}
          onChange={e => setRole(Number(e.target.value))}
          className={styles.input}
          style={{ background: '#111', color: 'white' }}
        >
          {PRIMARY_ROLES.map((r, i) => (
            <option key={i} value={i}>{r}</option>
          ))}
        </select>
      </div>

      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="DID document IPFS CID (optional)"
          value={didInput}
          onChange={e => setDidInput(e.target.value)}
          className={styles.input}
        />
      </div>

      <button
        className={styles.arbitrateButton}
        onClick={handleDeploy}
        disabled={isDeploying || !username.trim()}
        style={{ background: 'rgba(255,153,0,0.2)', borderColor: '#ff9900', color: '#ff9900' }}
      >
        {isDeploying ? 'Deploying…' : 'Create Wallet'}
      </button>
    </div>
  );

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>XAO Wallet — XAO Cult</title>
          <meta name="description" content="Your XAO smart wallet" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar pageTitle="XAO Wallet" showRectangleRight={false} />

        <main style={{ padding: '16px', maxWidth: '420px', margin: '0 auto' }}>
          {!address && (
            <div style={panelStyle}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Connect your wallet to view or create your XAO smart wallet.
              </p>
            </div>
          )}

          {address && !hasFactory && (
            <div style={panelStyle}>
              <p style={{ color: '#ff9900', fontSize: '14px' }}>
                XAOWalletFactory not deployed on this network yet.
              </p>
            </div>
          )}

          {address && hasFactory && (
            <>
              {hasWallet ? (
                <>
                  {renderWalletInfo()}
                  {renderUpdateProfile()}
                </>
              ) : (
                renderDeployForm()
              )}
            </>
          )}
        </main>
      </div>
    </Layout>
  );
};

export default Wallets;
