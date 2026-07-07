/**
 * ShamCash API service.
 *
 * ShamCash is a read-only transaction monitoring API for the Syrian mobile wallet.
 * It does NOT support payment initiation. The payment model is:
 *   1. Merchant creates an order with a unique reference code
 *   2. Customer manually sends money via ShamCash app citing that reference
 *   3. This service polls GET /transactions to confirm the incoming transfer
 *
 * Docs: https://shamcash-api.com/en/docs
 * Base URL: https://api.shamcash-api.com/v1
 *
 * IMPORTANT: All calls are server-side only. The API token is never exposed to the client.
 */

const BASE_URL = 'https://api.shamcash-api.com/v1';
const TIMEOUT_MS = 15_000;

// ── Response types ────────────────────────────────────────────────────────────

interface ShamCashEnvelope<T> {
  status: 'success' | 'error';
  code: string;
  message: string;
  data: T;
}

export interface ShamCashAccount {
  id: string;
  status: 'active' | 'inactive';
  subscription_expires_at: string | null;
}

export interface ShamCashBalance {
  account_id: string;
  currency: string;
  amount: number;
}

export interface ShamCashTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  note: string | null;
  sender: string | null;
  occurred_at: string; // ISO 8601 with +03:00 offset
  type: 'incoming' | 'outgoing';
}

export interface TransactionsFilter {
  account_id: string;
  start_at?: string;  // YYYY-MM-DD or full ISO 8601
  end_at?: string;
  limit?: number;
  cursor?: string;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ShamCashError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number
  ) {
    super(`[ShamCash ${code}] ${message}`);
    this.name = 'ShamCashError';
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function shamcashFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const token = process.env.SHAMCASH_API_TOKEN;
  if (!token || token === 'PASTE_YOUR_TOKEN_HERE') {
    throw new ShamCashError(
      'CONFIG_MISSING',
      'SHAMCASH_API_TOKEN is not configured in environment variables.'
    );
  }

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
      // Disable caching — always fetch fresh transaction data
      cache: 'no-store',
    });
  } catch (err: any) {
    throw new ShamCashError(
      'NETWORK_ERROR',
      err?.name === 'AbortError'
        ? 'Request timed out after 15s'
        : `Network error: ${err?.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  let payload: ShamCashEnvelope<T>;
  try {
    payload = await res.json();
  } catch {
    throw new ShamCashError(
      'PARSE_ERROR',
      `Could not parse response from ShamCash (HTTP ${res.status})`
    );
  }

  if (!res.ok || payload.status !== 'success') {
    throw new ShamCashError(payload.code, payload.message, res.status);
  }

  return payload.data;
}

// ── Public API methods ────────────────────────────────────────────────────────

/** List all linked ShamCash accounts for this API token. */
export async function getAccounts(): Promise<ShamCashAccount[]> {
  return shamcashFetch<ShamCashAccount[]>('/accounts');
}

/** Get balances for a specific linked account. */
export async function getBalances(accountId: string): Promise<ShamCashBalance[]> {
  return shamcashFetch<ShamCashBalance[]>('/balances', {
    account_id: accountId,
  });
}

/** List incoming transactions, optionally filtered by date range. */
export async function getTransactions(
  filter: TransactionsFilter
): Promise<ShamCashTransaction[]> {
  return shamcashFetch<ShamCashTransaction[]>('/transactions', {
    account_id: filter.account_id,
    start_at: filter.start_at,
    end_at: filter.end_at,
    limit: filter.limit ?? 50,
    cursor: filter.cursor,
  });
}

/**
 * Check if a payment has been received for a given order reference code.
 *
 * Strategy: Query incoming transactions from the order creation time,
 * then match by reference code in the transaction note and amount.
 *
 * Returns the matching transaction if found, null otherwise.
 */
export async function findPaymentForOrder(opts: {
  referenceCode: string;
  expectedAmount: number;
  createdAt: Date;
}): Promise<ShamCashTransaction | null> {
  const accountId = process.env.SHAMCASH_ACCOUNT_ID;
  if (!accountId || accountId === 'PASTE_YOUR_ACCOUNT_ID_HERE') {
    throw new ShamCashError(
      'CONFIG_MISSING',
      'SHAMCASH_ACCOUNT_ID is not configured in environment variables.'
    );
  }

  // Start 5 minutes before order creation to account for clock drift
  const startAt = new Date(opts.createdAt.getTime() - 5 * 60 * 1000);
  const startAtStr = startAt.toISOString().split('T')[0]; // YYYY-MM-DD

  const transactions = await getTransactions({
    account_id: accountId,
    start_at: startAtStr,
    limit: 100,
  });

  // Match: incoming transfer, correct amount, note contains reference code
  const match = transactions.find(
    (tx) =>
      tx.type === 'incoming' &&
      Math.abs(tx.amount - opts.expectedAmount) < 1 && // allow ±1 rounding
      tx.note?.includes(opts.referenceCode)
  );

  return match ?? null;
}
