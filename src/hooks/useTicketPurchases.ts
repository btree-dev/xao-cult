import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem, type Address, type Hash } from 'viem';
import { useUserTickets } from './useUserTickets';

// XAOTicket.TicketSold(tokenId indexed, tierId indexed, buyer indexed, priceUSDC)
const TICKET_SOLD_EVENT = parseAbiItem(
  'event TicketSold(uint256 indexed tokenId, uint256 indexed tierId, address indexed buyer, uint256 priceUSDC)',
);

// v1: recent window only (full history would need an indexer). A wider window
// than swaps since purchases are less frequent. Base Sepolia caps getLogs at
// 2000 blocks/request, so the range is chunked.
const HISTORY_BLOCK_WINDOW = BigInt(50_000);
const MAX_LOGS_RANGE = BigInt(2000);

export interface TicketPurchaseEntry {
  txHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  tokenId: number;
  eventName: string;
  tierName: string;
  priceFormatted: string; // USDC, 2dp
  collection: Address;
}

/**
 * The connected wallet's ticket-purchase transactions (buyTicket → TicketSold),
 * across every collection it holds a ticket in. Reads only — no wallet needed.
 */
export function useTicketPurchases(address?: `0x${string}`, chainId?: number) {
  const publicClient = usePublicClient({ chainId });
  // Reuse the ticket enumeration to know which collections to scan and to map
  // each purchase back to a human event/tier name.
  const { tickets } = useUserTickets(chainId, address);
  const [entries, setEntries] = useState<TicketPurchaseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `tickets` is a fresh array reference on nearly every render, which would
  // re-fire the loader in a loop (the "loading over and over" flicker). Depend
  // on a STABLE content key instead, and read the latest tickets via a ref so
  // the loader identity only changes when the actual data changes.
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;
  const ticketsKey = useMemo(
    () => tickets.map((t) => `${t.ticketCollection.toLowerCase()}-${t.tokenId}`).sort().join('|'),
    [tickets],
  );

  const load = useCallback(async () => {
    const tks = ticketsRef.current;
    const collections = Array.from(new Set(tks.map((t) => t.ticketCollection.toLowerCase()))) as Address[];
    const eventByCollection = new Map<string, string>();
    const tierByToken = new Map<string, string>();
    tks.forEach((t) => {
      eventByCollection.set(t.ticketCollection.toLowerCase(), t.title);
      tierByToken.set(`${t.ticketCollection.toLowerCase()}-${t.tokenId}`, t.tierName);
    });

    if (!publicClient || !address || collections.length === 0) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > HISTORY_BLOCK_WINDOW ? latest - HISTORY_BLOCK_WINDOW : BigInt(0);

      const ranges: Array<{ from: bigint; to: bigint }> = [];
      for (let start = fromBlock; start <= latest; start += MAX_LOGS_RANGE + BigInt(1)) {
        const end = start + MAX_LOGS_RANGE > latest ? latest : start + MAX_LOGS_RANGE;
        ranges.push({ from: start, to: end });
      }

      const chunks = await Promise.all(
        ranges.map((r) =>
          publicClient.getLogs({
            address: collections,
            event: TICKET_SOLD_EVENT,
            args: { buyer: address },
            fromBlock: r.from,
            toBlock: r.to,
          }),
        ),
      );
      const logs = chunks.flat();

      const blockNums = Array.from(new Set(logs.map((l) => l.blockNumber!)));
      const ts = new Map<bigint, number>();
      await Promise.all(
        blockNums.map(async (bn) => {
          const b = await publicClient.getBlock({ blockNumber: bn });
          ts.set(bn, Number(b.timestamp));
        }),
      );

      const parsed: TicketPurchaseEntry[] = logs.map((log) => {
        const coll = log.address.toLowerCase();
        const tokenId = Number(log.args.tokenId as bigint);
        return {
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: ts.get(log.blockNumber!) ?? 0,
          tokenId,
          eventName: eventByCollection.get(coll) || 'Event',
          tierName: tierByToken.get(`${coll}-${tokenId}`) || 'Ticket',
          priceFormatted: Number(formatUnits(log.args.priceUSDC as bigint, 6)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          collection: log.address as Address,
        };
      });
      parsed.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEntries(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket purchases');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, address, ticketsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, refetch: load };
}
