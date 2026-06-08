'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Layers, Plus, Trash2, RefreshCw, X, ChevronDown,
  ChevronUp, AlertCircle, Wifi, WifiOff, Clock, Edit3, Check,
} from 'lucide-react';
import Modal from '@/components/Modal';
import { usePrivacy } from '@/components/PrivacyProvider';
import { tokenColor } from '@/lib/cryptoIds';
import type { CryptoPlatformWithAssets, CryptoAsset } from '@/lib/types';

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtCurrency(v: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    maximumFractionDigits: v < 0.01 ? 6 : v < 1 ? 4 : 2,
  }).format(v);
}

function fmtAmount(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (v >= 1)    return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Platform colour accent (cycles through a palette) ─────────────────────────

const PLATFORM_ACCENTS = [
  'border-l-blue-500',   'border-l-purple-500', 'border-l-emerald-500',
  'border-l-orange-500', 'border-l-pink-500',   'border-l-cyan-500',
  'border-l-yellow-500', 'border-l-red-500',    'border-l-indigo-500',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SymbolBadge({ symbol }: { symbol: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-bold ${tokenColor(symbol)} shrink-0`}>
      {symbol.slice(0, 3)}
    </span>
  );
}

function AllocationBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color} opacity-70 transition-all duration-500`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ── Asset row ─────────────────────────────────────────────────────────────────

function PnlCell({ asset, currency, mask }: { asset: CryptoAsset; currency: string; mask: (s: string) => string }) {
  if (asset.profit_loss === null) {
    return <p className="text-gray-700 text-sm">—</p>;
  }
  const positive = asset.profit_loss >= 0;
  const sign = positive ? '+' : '';
  return (
    <>
      <p className={`text-sm font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {mask(`${sign}${fmtCurrency(asset.profit_loss, currency)}`)}
      </p>
      {asset.profit_loss_pct !== null && (
        <p className={`text-xs ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {sign}{asset.profit_loss_pct.toFixed(1)}%
        </p>
      )}
    </>
  );
}

function AssetRow({
  asset, platformTotal, currency, onEdit, onDelete,
}: {
  asset: CryptoAsset;
  platformTotal: number;
  currency: string;
  onEdit: (asset: CryptoAsset) => void;
  onDelete: () => void;
}) {
  const { mask } = usePrivacy();
  const pct = platformTotal > 0 ? (asset.value / platformTotal) * 100 : 0;
  const color = tokenColor(asset.symbol);

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition-colors group">
      <SymbolBadge symbol={asset.symbol} />

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-tight truncate">{asset.name}</p>
        <p className="text-gray-500 text-xs">{asset.symbol}</p>
      </div>

      <div className="text-right w-28 shrink-0">
        <p className="text-gray-300 text-sm font-mono">{mask(fmtAmount(asset.amount))}</p>
        <p className="text-gray-600 text-xs">{asset.symbol}</p>
      </div>

      <div className="text-right w-28 shrink-0">
        {asset.price > 0 ? (
          <>
            <p className="text-gray-400 text-sm">{mask(fmtCurrency(asset.price, currency))}</p>
            {asset.manual_price !== null
              ? <p className="text-amber-500 text-xs">manual</p>
              : asset.has_live_price && <p className="text-emerald-600 text-xs">live</p>
            }
          </>
        ) : (
          <p className="text-gray-700 text-sm">—</p>
        )}
      </div>

      <div className="text-right w-28 shrink-0">
        <p className={`text-sm font-semibold ${asset.value > 0 ? 'text-white' : 'text-gray-600'}`}>
          {mask(fmtCurrency(asset.value, currency))}
        </p>
        <p className="text-gray-600 text-xs">{pct.toFixed(1)}%</p>
      </div>

      <div className="text-right w-32 shrink-0">
        <PnlCell asset={asset} currency={currency} mask={mask} />
      </div>

      <div className="w-16 shrink-0 flex items-center gap-1.5">
        <AllocationBar pct={pct} color={color} />
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={() => onEdit(asset)}
          className="text-gray-600 hover:text-blue-400 transition-colors"
          title="Edit asset"
        >
          <Edit3 size={13} />
        </button>
        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-red-400 transition-colors"
          title="Delete asset"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform, accentClass, currency, onAddAsset, onEditAsset, onDeletePlatform, onAssetDeleted,
}: {
  platform: CryptoPlatformWithAssets;
  accentClass: string;
  currency: string;
  onAddAsset: (platformId: number, platformName: string) => void;
  onEditAsset: (asset: CryptoAsset) => void;
  onDeletePlatform: (id: number, name: string) => void;
  onAssetDeleted: () => void;
}) {
  const { mask } = usePrivacy();
  const [collapsed, setCollapsed] = useState(false);

  const deleteAsset = async (assetId: number) => {
    await fetch(`/api/crypto/assets?id=${assetId}`, { method: 'DELETE' });
    onAssetDeleted();
  };

  const initial = platform.name.charAt(0).toUpperCase();

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden border-l-4 ${accentClass}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base leading-tight">{platform.name}</h3>
          <p className="text-gray-500 text-xs">
            {platform.assets.length} asset{platform.assets.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="text-right mr-2">
          <p className="text-white font-bold text-lg">{mask(fmtCurrency(platform.total_value, currency))}</p>
          <p className="text-gray-500 text-xs">total value</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddAsset(platform.id, platform.name)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus size={12} /> Token
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => onDeletePlatform(platform.id, platform.name)}
            className="p-1.5 text-gray-700 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Asset list */}
      {!collapsed && (
        <>
          {platform.assets.length === 0 ? (
            <div className="px-5 py-6 border-t border-gray-800 text-center">
              <p className="text-gray-600 text-sm">No tokens yet.</p>
              <button
                onClick={() => onAddAsset(platform.id, platform.name)}
                className="mt-2 text-emerald-500 hover:text-emerald-400 text-xs font-medium transition-colors"
              >
                + Add your first token
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-800">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-5 py-2 border-b border-gray-800/50">
                <div className="w-8 shrink-0" />
                <div className="flex-1 text-gray-600 text-xs uppercase tracking-wider">Token</div>
                <div className="w-28 text-right text-gray-600 text-xs uppercase tracking-wider shrink-0">Amount</div>
                <div className="w-28 text-right text-gray-600 text-xs uppercase tracking-wider shrink-0">Price</div>
                <div className="w-28 text-right text-gray-600 text-xs uppercase tracking-wider shrink-0">Value</div>
                <div className="w-32 text-right text-gray-600 text-xs uppercase tracking-wider shrink-0">P / L</div>
                <div className="w-16 text-gray-600 text-xs uppercase tracking-wider shrink-0">Alloc.</div>
                <div className="w-5 shrink-0" />
              </div>
              {platform.assets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  platformTotal={platform.total_value}
                  currency={currency}
                  onEdit={onEditAsset}
                  onDelete={() => deleteAsset(asset.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface PriceState {
  prices: Record<string, number>;
  updated_at: string | null;
  fetchError?: string;
  cached?: boolean;
}

const EMPTY_ASSET_FORM = {
  name: '', symbol: '', amount: '', manual_price: '', invested_amount: '', notes: '',
};

export default function CryptoPortfolioPage() {
  const { mask } = usePrivacy();

  const [platforms, setPlatforms] = useState<CryptoPlatformWithAssets[]>([]);
  const [currency, setCurrency]   = useState('USD');
  const [loading, setLoading]     = useState(true);
  const [priceState, setPriceState] = useState<PriceState>({ prices: {}, updated_at: null });
  const [fetchingPrices, setFetchingPrices] = useState(false);

  // Modals
  const [platformModal, setPlatformModal] = useState(false);
  const [assetModal, setAssetModal]       = useState<{ platformId: number; platformName: string } | null>(null);
  const [editAssetModal, setEditAssetModal] = useState<CryptoAsset | null>(null);
  const [editAssetForm, setEditAssetForm]   = useState({ amount: '', invested_amount: '', manual_price: '', notes: '' });
  const [platformName, setPlatformName]   = useState('');
  const [assetForm, setAssetForm]         = useState(EMPTY_ASSET_FORM);
  const [submitting, setSubmitting]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  // Inline name editing for platforms
  const [editingPlatformId, setEditingPlatformId] = useState<number | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const loadPortfolio = useCallback(async () => {
    const [plRes, setRes] = await Promise.all([
      fetch('/api/crypto/platforms', { cache: 'no-store' }),
      fetch('/api/settings', { cache: 'no-store' }),
    ]);
    const [pl, settings] = await Promise.all([plRes.json(), setRes.json()]);
    setPlatforms(pl);
    setCurrency(settings.crypto_currency ?? 'USD');
    setLoading(false);
  }, []);

  const fetchPrices = useCallback(async (force = false) => {
    setFetchingPrices(true);
    try {
      const res = await fetch(`/api/crypto/prices${force ? '?force=true' : ''}`, { cache: 'no-store' });
      const data: PriceState = await res.json();
      setPriceState(data);
      // Reload to get updated values
      if (!data.cached || force) await loadPortfolio();
    } finally {
      setFetchingPrices(false);
    }
  }, [loadPortfolio]);

  useEffect(() => {
    loadPortfolio().then(() => fetchPrices());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived totals
  const totalValue   = platforms.reduce((s, p) => s + p.total_value, 0);
  const totalAssets  = platforms.reduce((s, p) => s + p.assets.length, 0);
  const pricesCovering = Object.keys(priceState.prices).length;

  // Portfolio P&L — only count assets where invested_amount is set
  const allAssets = platforms.flatMap((p) => p.assets);
  const totalInvested = allAssets.reduce(
    (s, a) => (a.invested_amount !== null ? s + a.invested_amount : s), 0,
  );
  const totalPnl = allAssets.reduce(
    (s, a) => (a.profit_loss !== null ? s + a.profit_loss : s), 0,
  );
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : null;
  const hasPnlData = allAssets.some((a) => a.invested_amount !== null);

  // Add platform
  const submitPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/crypto/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: platformName.trim() }),
    });
    if (res.ok) {
      setPlatformModal(false);
      setPlatformName('');
      await loadPortfolio();
    }
    setSubmitting(false);
  };

  // Delete platform (confirmed)
  const confirmDeletePlatform = async () => {
    if (!deleteConfirm) return;
    await fetch(`/api/crypto/platforms?id=${deleteConfirm.id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    loadPortfolio();
  };

  // Open edit modal — prefill from existing asset
  const openEditAsset = (asset: CryptoAsset) => {
    setEditAssetModal(asset);
    setEditAssetForm({
      amount:          String(asset.amount),
      invested_amount: asset.invested_amount !== null ? String(asset.invested_amount) : '',
      manual_price:    asset.manual_price    !== null ? String(asset.manual_price)    : '',
      notes:           asset.notes,
    });
  };

  // Save edited asset
  const submitEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssetModal) return;
    setSubmitting(true);
    await fetch('/api/crypto/assets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:              editAssetModal.id,
        amount:          Number(editAssetForm.amount),
        invested_amount: editAssetForm.invested_amount !== '' ? Number(editAssetForm.invested_amount) : null,
        manual_price:    editAssetForm.manual_price    !== '' ? Number(editAssetForm.manual_price)    : null,
        notes:           editAssetForm.notes,
      }),
    });
    setSubmitting(false);
    setEditAssetModal(null);
    await loadPortfolio();
  };

  // Add asset
  const submitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetModal) return;
    setSubmitting(true);
    await fetch('/api/crypto/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_id: assetModal.platformId,
        name: assetForm.name,
        symbol: assetForm.symbol,
        amount: Number(assetForm.amount),
        manual_price: assetForm.manual_price ? Number(assetForm.manual_price) : null,
        invested_amount: assetForm.invested_amount ? Number(assetForm.invested_amount) : null,
        notes: assetForm.notes,
      }),
    });
    setSubmitting(false);
    setAssetModal(null);
    setAssetForm(EMPTY_ASSET_FORM);
    await loadPortfolio();
    // Re-fetch prices in case the new symbol has a live price
    fetchPrices();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Crypto Portfolio</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} · {totalAssets} token{totalAssets !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Prices status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-500">
            {priceState.fetchError
              ? <WifiOff size={11} className="text-orange-400" />
              : <Wifi size={11} className="text-emerald-400" />}
            <Clock size={10} />
            {timeAgo(priceState.updated_at)}
          </div>

          <button
            onClick={() => fetchPrices(true)}
            disabled={fetchingPrices}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={fetchingPrices ? 'animate-spin' : ''} />
            {fetchingPrices ? 'Fetching…' : 'Refresh prices'}
          </button>

          <button
            onClick={() => setPlatformModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Add Platform
          </button>
        </div>
      </div>

      {/* Price fetch error banner */}
      {priceState.fetchError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/5 border border-orange-500/20 rounded-lg text-orange-300 text-xs">
          <AlertCircle size={13} />
          {priceState.fetchError}
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/5 border border-emerald-500/20 rounded-xl p-5 sm:col-span-1">
          <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-bold text-white">{mask(fmtCurrency(totalValue, currency))}</p>
          {hasPnlData && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {mask(`${totalPnl >= 0 ? '+' : ''}${fmtCurrency(totalPnl, currency)}`)}
              </span>
              {totalPnlPct !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%
                </span>
              )}
            </div>
          )}
          <p className="text-gray-500 text-xs mt-1.5">
            {pricesCovering} live price{pricesCovering !== 1 ? 's' : ''} loaded
          </p>
        </div>

        {/* Per-platform mini summary */}
        <div className="sm:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-3">Allocation by Platform</p>
          <div className="space-y-2">
            {platforms.map((p, i) => {
              const pct = totalValue > 0 ? (p.total_value / totalValue) * 100 : 0;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-24 truncate">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PLATFORM_ACCENTS[i % PLATFORM_ACCENTS.length].replace('border-l-', 'bg-')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium w-24 text-right">
                    {mask(fmtCurrency(p.total_value, currency))}
                  </span>
                  <span className="text-gray-600 text-xs w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
            {platforms.length === 0 && (
              <p className="text-gray-600 text-sm">No platforms yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Platform cards ────────────────────────────────────────────────── */}
      {platforms.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-12 text-center">
          <Layers size={36} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">No platforms yet</p>
          <p className="text-gray-600 text-sm mb-4">Add your first platform to start tracking your crypto portfolio.</p>
          <button
            onClick={() => setPlatformModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} className="inline mr-1" /> Add Platform
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((p, i) => (
            <PlatformCard
              key={p.id}
              platform={p}
              accentClass={PLATFORM_ACCENTS[i % PLATFORM_ACCENTS.length]}
              currency={currency}
              onAddAsset={(id, name) => { setAssetModal({ platformId: id, platformName: name }); setAssetForm(EMPTY_ASSET_FORM); }}
              onEditAsset={openEditAsset}
              onDeletePlatform={(id, name) => setDeleteConfirm({ id, name })}
              onAssetDeleted={loadPortfolio}
            />
          ))}
        </div>
      )}

      {/* ── Add Platform Modal ────────────────────────────────────────────── */}
      {platformModal && (
        <Modal title="Add Platform" onClose={() => setPlatformModal(false)}>
          <form onSubmit={submitPlatform} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Platform Name</label>
              <input
                type="text"
                autoFocus
                required
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Binance, Kraken, MetaMask…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['Nexo', 'Phantom', 'Ledger', 'Binance', 'Kraken', 'Coinbase', 'MetaMask', 'Trezor'].map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setPlatformName(s)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    platformName === s
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-500 hover:text-white border border-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setPlatformModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {submitting ? 'Adding…' : 'Add Platform'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Add Token Modal ───────────────────────────────────────────────── */}
      {assetModal && (
        <Modal title={`Add Token — ${assetModal.platformName}`} onClose={() => setAssetModal(null)}>
          <form onSubmit={submitAsset} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Symbol</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={assetForm.symbol}
                  onChange={(e) => setAssetForm({ ...assetForm, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 uppercase"
                  placeholder="BTC"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Bitcoin"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Amount Received
                <span className="text-gray-600 ml-1.5 text-xs">— exact amount from your exchange</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={assetForm.amount}
                onChange={(e) => setAssetForm({ ...assetForm, amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Amount Invested ({currency}) <span className="text-gray-600">— optional, for P&amp;L tracking</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={assetForm.invested_amount}
                onChange={(e) => setAssetForm({ ...assetForm, invested_amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="What did you pay in total?"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Manual Price ({currency}) <span className="text-gray-600">— optional, overrides live price</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={assetForm.manual_price}
                onChange={(e) => setAssetForm({ ...assetForm, manual_price: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Leave empty to use live price"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Notes (optional)</label>
              <input
                type="text"
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Live preview */}
            {assetForm.amount && (assetForm.manual_price || priceState.prices[assetForm.symbol]) && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-sm">
                <p className="text-emerald-300 text-xs font-medium mb-1">Estimated value</p>
                <p className="text-white font-semibold">
                  {fmtCurrency(
                    Number(assetForm.amount) *
                    (assetForm.manual_price ? Number(assetForm.manual_price) : priceState.prices[assetForm.symbol] ?? 0),
                    currency
                  )}
                </p>
              </div>
            )}

            {/* Quick-fill common tokens */}
            <div>
              <p className="text-gray-600 text-xs mb-1.5">Common tokens</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
                  { symbol: 'SOL', name: 'Solana' },  { symbol: 'USDC', name: 'USD Coin' },
                  { symbol: 'USDT', name: 'Tether' }, { symbol: 'BNB', name: 'BNB' },
                  { symbol: 'NEXO', name: 'Nexo' },   { symbol: 'ADA', name: 'Cardano' },
                ].map((t) => (
                  <button key={t.symbol} type="button"
                    onClick={() => setAssetForm({ ...assetForm, symbol: t.symbol, name: t.name })}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      assetForm.symbol === t.symbol
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-gray-800 text-gray-500 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded text-white text-[9px] font-bold flex items-center justify-center ${tokenColor(t.symbol)}`}>
                      {t.symbol.slice(0, 1)}
                    </span>
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAssetModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {submitting ? 'Adding…' : 'Add Token'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Asset Modal ─────────────────────────────────────────────── */}
      {editAssetModal && (
        <Modal
          title={`Edit — ${editAssetModal.name} (${editAssetModal.symbol})`}
          onClose={() => setEditAssetModal(null)}
        >
          <form onSubmit={submitEditAsset} className="space-y-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Amount Received
                <span className="text-gray-600 ml-1.5 text-xs">— exact amount from your exchange</span>
              </label>
              <input
                type="number" step="any" min="0" required autoFocus
                value={editAssetForm.amount}
                onChange={(e) => setEditAssetForm({ ...editAssetForm, amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Amount Invested ({currency})
                <span className="text-gray-600 ml-1">— used for P&amp;L calculation</span>
              </label>
              <input
                type="number" step="any" min="0"
                value={editAssetForm.invested_amount}
                onChange={(e) => setEditAssetForm({ ...editAssetForm, invested_amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="What did you pay in total?"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Manual Price ({currency})
                <span className="text-gray-600 ml-1">— leave empty to use live price</span>
              </label>
              <input
                type="number" step="any" min="0"
                value={editAssetForm.manual_price}
                onChange={(e) => setEditAssetForm({ ...editAssetForm, manual_price: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Leave empty to use live price"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Notes</label>
              <input
                type="text"
                value={editAssetForm.notes}
                onChange={(e) => setEditAssetForm({ ...editAssetForm, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Live P&L preview — uses the form's manual_price if set, otherwise
                the asset's currently fetched live price. Shown whenever both
                invested_amount and amount are filled in. */}
            {editAssetForm.invested_amount !== '' && editAssetForm.amount !== '' && (() => {
              // Prefer the manual price the user is actively typing; fall back to
              // the live fetched price that came with the asset.
              const effectivePrice =
                editAssetForm.manual_price !== ''
                  ? Number(editAssetForm.manual_price)
                  : editAssetModal.price;

              if (effectivePrice <= 0) return null; // no price available at all

              const currentVal = Number(editAssetForm.amount) * effectivePrice;
              const invested   = Number(editAssetForm.invested_amount);
              if (invested <= 0) return null;

              const pnl     = currentVal - invested;
              const pnlPct  = (pnl / invested) * 100;
              const positive = pnl >= 0;
              return (
                <div className={`rounded-lg p-3 text-sm border ${positive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <p className="text-gray-400 text-xs font-medium mb-1">P&amp;L preview</p>
                  <span className={`font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {positive ? '+' : ''}{fmtCurrency(pnl, currency)}
                  </span>
                  <span className={`ml-2 text-xs ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                    ({positive ? '+' : ''}{pnlPct.toFixed(1)}%)
                  </span>
                </div>
              );
            })()}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditAssetModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Platform Confirm ───────────────────────────────────────── */}
      {deleteConfirm && (
        <Modal title="Delete Platform" onClose={() => setDeleteConfirm(null)}>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Delete <span className="text-white font-semibold">{deleteConfirm.name}</span>?
              All tokens under this platform will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={confirmDeletePlatform}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors">
                Delete Platform
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
