/**
 * Maps uppercase ticker symbols to CoinGecko coin IDs.
 * Used when fetching live prices for crypto portfolio assets.
 * Add new entries here to support more tokens automatically.
 */
export const COINGECKO_IDS: Record<string, string> = {
  BTC:    'bitcoin',
  ETH:    'ethereum',
  SOL:    'solana',
  BNB:    'binancecoin',
  XRP:    'ripple',
  ADA:    'cardano',
  AVAX:   'avalanche-2',
  DOT:    'polkadot',
  MATIC:  'matic-network',
  LINK:   'chainlink',
  UNI:    'uniswap',
  ATOM:   'cosmos',
  LTC:    'litecoin',
  DOGE:   'dogecoin',
  SHIB:   'shiba-inu',
  NEAR:   'near',
  ALGO:   'algorand',
  XLM:    'stellar',
  VET:    'vechain',
  TRX:    'tron',
  ETC:    'ethereum-classic',
  BCH:    'bitcoin-cash',
  FIL:    'filecoin',
  AAVE:   'aave',
  MKR:    'maker',
  CRV:    'curve-dao-token',
  SNX:    'havven',
  SUSHI:  'sushi',
  YFI:    'yearn-finance',
  FTM:    'fantom',
  '1INCH':'1inch',
  USDC:   'usd-coin',
  USDT:   'tether',
  DAI:    'dai',
  BUSD:   'binance-usd',
  FRAX:   'frax',
  NEXO:   'nexo',
  OP:     'optimism',
  ARB:    'arbitrum',
  INJ:    'injective-protocol',
  SUI:    'sui',
  APT:    'aptos',
  SEI:    'sei-network',
  TIA:    'celestia',
  PYTH:   'pyth-network',
  JTO:    'jito-governance-token',
  WIF:    'dogwifcoin',
  BONK:   'bonk',
  JUP:    'jupiter-exchange-solana',
};

/**
 * Tailwind bg colour class per token symbol.
 * Unknown symbols fall back to a deterministic colour from FALLBACK_COLORS.
 */
const TOKEN_COLORS: Record<string, string> = {
  BTC:   'bg-orange-500',
  ETH:   'bg-indigo-500',
  SOL:   'bg-purple-500',
  BNB:   'bg-yellow-500',
  XRP:   'bg-sky-500',
  ADA:   'bg-blue-500',
  AVAX:  'bg-red-500',
  DOT:   'bg-pink-500',
  MATIC: 'bg-violet-500',
  LINK:  'bg-blue-400',
  UNI:   'bg-fuchsia-500',
  ATOM:  'bg-cyan-500',
  DOGE:  'bg-yellow-400',
  USDC:  'bg-emerald-500',
  USDT:  'bg-teal-500',
  DAI:   'bg-amber-500',
  NEXO:  'bg-blue-600',
  OP:    'bg-red-600',
  ARB:   'bg-sky-600',
  INJ:   'bg-indigo-400',
  SUI:   'bg-blue-300',
};

const FALLBACK_COLORS = [
  'bg-rose-500', 'bg-orange-400', 'bg-lime-500',
  'bg-green-500', 'bg-cyan-400', 'bg-blue-500',
  'bg-purple-400', 'bg-pink-400', 'bg-slate-500',
];

function symbolHash(symbol: string): number {
  return [...symbol].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function tokenColor(symbol: string): string {
  const upper = symbol.toUpperCase();
  return TOKEN_COLORS[upper] ?? FALLBACK_COLORS[symbolHash(upper) % FALLBACK_COLORS.length];
}

/**
 * Returns the CoinGecko ID for a symbol, or null if unknown.
 */
export function coingeckoId(symbol: string): string | null {
  return COINGECKO_IDS[symbol.toUpperCase()] ?? null;
}
