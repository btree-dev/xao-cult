import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { useWeb3 } from './useWeb3';
import { useUserContractsWithSummaries } from './useGetContracts';
import { useUserTickets } from './useUserTickets';
import { useSwapHistory } from './useSwapHistory';
import { useTicketPurchases } from './useTicketPurchases';
import { SHOW_CONTRACT_ABI } from '../lib/web3/eventcontract';
import { isSwapSupportedChain } from '../lib/web3/tokens';
import { loadConversations } from '../lib/xaomsg/conversationStore';
import { deriveNotifications } from '../lib/notifications/derive';
import {
  type ContractNotifInput, type TicketNotifInput, type ChatNotifInput,
  type TxNotifInput, type NotificationItem,
} from '../lib/notifications/types';
import { getReadIds, markAllRead as persistMarkAll, markRead as persistMarkRead, pruneReadIds } from '../lib/notifications/readState';

/**
 * Aggregates every in-app notification source (on-chain contracts + their
 * payment schedules and event times, owned tickets, Waku chat, tx history) and
 * derives the notification list + unread count for the connected wallet. Pure
 * rule logic lives in lib/notifications/derive; this hook only gathers data and
 * manages localStorage read state. No server / push — MVP is in-app only.
 */
export function useNotifications() {
  const { address, chain } = useWeb3();
  const chainId = chain?.id;

  const { contracts: summaries } = useUserContractsWithSummaries(chainId, address as `0x${string}` | undefined);
  const { tickets } = useUserTickets(chainId, address as `0x${string}` | undefined);
  const swapChain = isSwapSupportedChain(chainId) ? chainId : undefined;
  const { entries: swaps } = useSwapHistory(address as `0x${string}` | undefined, swapChain);
  const { entries: purchases } = useTicketPurchases(address as `0x${string}` | undefined, chainId);

  // Extra on-chain reads per contract: event times + this-wallet's payment
  // schedules (the summary hook doesn't carry these).
  const addrs = useMemo(() => summaries.map((s) => s.contractAddress), [summaries]);
  // Deposit/payout schedule reads are omitted for now — those notifications are
  // skipped until the deposit mechanic is confirmed (see derive.ts). Only the
  // event-time getters are read.
  const CALLS_PER = 3;
  const readCfg = useMemo(() => addrs.flatMap((address) => ([
    { address, abi: SHOW_CONTRACT_ABI as any, functionName: 'loadInTime' },
    { address, abi: SHOW_CONTRACT_ABI as any, functionName: 'doorsTime' },
    { address, abi: SHOW_CONTRACT_ABI as any, functionName: 'setTime' },
  ])), [addrs]);
  const { data: detailData } = useReadContracts({ contracts: readCfg as any, query: { enabled: readCfg.length > 0 } });

  const contractInputs = useMemo<ContractNotifInput[]>(() => {
    return summaries.map((s, i) => {
      const base = i * CALLS_PER;
      const num = (o: number) => {
        const r = detailData?.[base + o];
        return r && r.status === 'success' ? Number(r.result as bigint) : undefined;
      };
      return {
        contractAddress: s.contractAddress,
        party1: s.party1Address,
        party2: s.party2Address,
        eventName: s.eventName,
        status: s.status,
        showDate: Number(s.showDate),
        loadInTime: num(0),
        doorsTime: num(1),
        setTime: num(2),
        myDepositsDue: [],
        myPayoutsDue: [],
      };
    });
  }, [summaries, detailData]);

  // Event times for a ticket come from its contract's on-chain data (owned
  // tickets don't carry showDate/doorsTime themselves).
  const ticketInputs = useMemo<TicketNotifInput[]>(() => {
    const byAddr = new Map(contractInputs.map((c) => [c.contractAddress.toLowerCase(), c]));
    return tickets.map((t) => {
      const c = byAddr.get(t.contractAddress.toLowerCase());
      return {
        contractAddress: t.contractAddress,
        tokenId: String(t.tokenId),
        eventName: c?.eventName || t.title || 'Your event',
        showDate: c?.showDate ?? 0,
        doorsTime: c?.doorsTime,
      };
    });
  }, [tickets, contractInputs]);

  const [chatInputs, setChatInputs] = useState<ChatNotifInput[]>([]);
  useEffect(() => {
    if (!address) { setChatInputs([]); return; }
    const convos = loadConversations(address as `0x${string}`);
    setChatInputs(convos.map((c) => ({
      threadId: c.threadId, peer: c.peer, lastActivityMs: c.lastActivityUnixMs, preview: c.lastPreview,
    })));
  }, [address]);

  const txInputs = useMemo<TxNotifInput[]>(() => {
    const out: TxNotifInput[] = [];
    for (const s of swaps || []) {
      out.push({ hash: s.txHash, kind: 'swap', timestampMs: s.timestamp * 1000, summary: `Swapped ${s.amountInFormatted} ${s.tokenIn.symbol} → ${s.amountOutFormatted} ${s.tokenOut.symbol}` });
    }
    for (const p of purchases || []) {
      out.push({ hash: p.txHash, kind: 'payment', timestampMs: (p.timestamp || 0) * 1000, summary: `Ticket purchased — ${p.eventName} ($${p.priceFormatted})` });
    }
    return out;
  }, [swaps, purchases]);

  const items = useMemo<NotificationItem[]>(() => {
    if (!address) return [];
    return deriveNotifications(
      { nowMs: Date.now(), contracts: contractInputs, tickets: ticketInputs, chat: chatInputs, transactions: txInputs },
      address,
    );
  }, [address, contractInputs, ticketInputs, chatInputs, txInputs]);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  useEffect(() => { setReadIds(getReadIds(address)); }, [address]);

  // Keep the persisted read set from growing without bound as events age out.
  useEffect(() => {
    if (address && items.length) pruneReadIds(address, items.map((i) => i.id));
  }, [address, items]);

  const unreadCount = useMemo(() => items.reduce((n, i) => n + (readIds.has(i.id) ? 0 : 1), 0), [items, readIds]);

  const markAllRead = useCallback(() => {
    if (!address) return;
    const ids = items.map((i) => i.id);
    persistMarkAll(address, ids);
    setReadIds(new Set(ids));
  }, [address, items]);

  const markRead = useCallback((id: string) => {
    if (!address) return;
    persistMarkRead(address, [id]);
    setReadIds((prev) => new Set(prev).add(id));
  }, [address]);

  return { items, unreadCount, readIds, markAllRead, markRead };
}
