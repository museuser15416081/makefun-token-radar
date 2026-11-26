// Token Radar advanced model: data-driven category multiples from snapshot live tokens,
// multi-factor valuation (TVL, category comp, 7d growth, maturity age, chain breadth),
// 240+ ranked pre-token protocols, and rich category-specific farm plans.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface ModelConstants {
  global_median_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_weight: number;
  category_multiples: Record<string, number>;
}

export const MODEL_VERSION = 'radar-v2-dynamic-comps';
export const TARGET_BOARD_SIZE = 240;

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** Compute median FDV/TVL ratios for each category from live tokens in the snapshot. */
function computeCategoryMultiples(protocols: SnapshotProtocol[]): { multiples: Record<string, number>; globalMedian: number } {
  const byCat: Record<string, number[]> = {};
  const allComps: number[] = [];

  for (const p of protocols) {
    if (p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category && p.category !== 'CEX') {
      const ratio = p.mcap_usd / p.tvl_usd;
      if (ratio > 0.01 && ratio < 50) {
        allComps.push(ratio);
        if (!byCat[p.category]) byCat[p.category] = [];
        byCat[p.category]!.push(ratio);
      }
    }
  }

  allComps.sort((a, b) => a - b);
  const globalMedian = allComps.length > 0 ? allComps[Math.floor(allComps.length / 2)]! : 0.75;

  const multiples: Record<string, number> = {};
  for (const [cat, ratios] of Object.entries(byCat)) {
    ratios.sort((a, b) => a - b);
    const median = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)]! : globalMedian;
    // Clamp category multiple between 0.08x and 2.8x
    multiples[cat] = Math.max(0.08, Math.min(2.8, median));
  }

  return { multiples, globalMedian: Math.max(0.08, Math.min(2.8, globalMedian)) };
}

function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

export function buildBoard(snapshot: Snapshot): { board: BoardRow[]; model: ModelConstants } {
  const index = bySlug(snapshot.protocols);
  const { multiples, globalMedian } = computeCategoryMultiples(snapshot.protocols);

  const model: ModelConstants = {
    global_median_multiple: round4(globalMedian),
    growth_weight: 0.4,
    growth_floor: -50,
    growth_cap: 100,
    maturity_floor: 0.7,
    maturity_range: 0.3,
    maturity_days: 1095,
    unknown_age_days: 365,
    chain_weight: 0.04,
    category_multiples: multiples,
  };

  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }

  // Pre-token protocols below floor, sorted by TVL, to fill up to TARGET_BOARD_SIZE (e.g. 240)
  const remainingNeeded = Math.max(0, TARGET_BOARD_SIZE - chosen.size);
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, remainingNeeded);

  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const age = ageDays(snapshot.as_of, p.listed_at);
    const rawGrowth = finite(p.change_7d, 0);
    const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
    const growthMult = 1 + (growthPct / 100) * model.growth_weight;
    const ageForModel = age ?? model.unknown_age_days;
    const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    const catMult = (p.category && model.category_multiples[p.category]) ?? model.global_median_multiple;
    const chainMult = 1 + model.chain_weight * Math.min(p.chains.length, 5);

    const implied = Math.max(1, Math.round(p.tvl_usd * catMult * growthMult * maturityMult * chainMult));
    return { p, implied, growthPct, growthMult, maturityMult, chainMult, catMult, age };
  });

  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));

  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: round4(s.catMult),
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));

  return { board, model };
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Maintain position and monitor official protocol updates.`;
  return s;
}

function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'Ethereum';
}

function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 300;
  if (p.tvl_usd >= 1_000_000_000) return 200;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const cat = (p.category ?? '').toLowerCase();
  const name = p.name;

  let action = `Deposit $${capital} equivalent into ${name} on ${chain} and maintain position.`;
  if (cat.includes('lend') || cat.includes('cdp')) {
    action = `Supply $${capital} of USDC as collateral on ${name} on ${chain} and borrow against it conservatively.`;
  } else if (cat.includes('dex') || cat.includes('yield')) {
    action = `Provide $${capital} of liquidity in the primary pool on ${name} on ${chain} to accrue LP and reward points.`;
  } else if (cat.includes('bridge')) {
    action = `Bridge $${capital} of assets across chains using ${name} and interact with native dApps on destination.`;
  } else if (cat.includes('staking') || cat.includes('restak')) {
    action = `Stake $${capital} of native assets through ${name} on ${chain} to secure validator yield and points.`;
  } else if (cat.includes('perpetual') || cat.includes('derivative')) {
    action = `Deposit $${capital} margin collateral on ${name} and execute hedged trading volume periodically.`;
  }

  return [
    {
      text: `Prepare a dedicated burner wallet holding only necessary funds for ${name} on ${chain}, keeping private keys offline.`,
      cost: 'under $3 gas provision',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} capital + ~$5 gas`,
      time: '15 minutes',
    },
    {
      text: `Perform a recurring weekly interaction (e.g., rebalance, claim yield, or vote) to prove active user engagement.`,
      cost: '~$2 gas per week',
      time: '10 minutes weekly',
    },
    {
      text: `Hold the active position for at least ${hold} consecutive days to qualify across multiple snapshot epochs.`,
      cost: `$${capital} allocated capital`,
      time: `${hold} days`,
    },
    {
      text: `Verify rewards exclusively via ${name}'s official app link; never connect to third-party claim aggregators or pay fees to claim.`,
      cost: '0 fee for verification',
      time: '5 minutes',
    },
    {
      text: `Record transaction hashes, dates, and capital allocation in your personal farm ledger for position tracking.`,
      cost: 'free',
      time: '5 minutes',
    },
  ];
}

export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, 30)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const { board, model } = buildBoard(snapshot);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not an object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist');

  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`protocol ${i} not object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`protocol ${i} lacks slug, name or tvl_usd`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });

  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `board misses ${missing.length} watchlist slugs: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all rows share same implied value`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} step length invalid (${s.length})`;
  }
  return null;
}

export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
