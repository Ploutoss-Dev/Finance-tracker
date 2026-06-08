'use client';

import { useEffect, useState } from 'react';
import { Settings, RefreshCw, Check, Globe, Percent, Bitcoin, Clock, Wifi } from 'lucide-react';

interface AppSettings {
  btc_current_price:    string;
  currency:             string;
  tax_rate:             string;
  manual_btc_amount:    string;
  manual_btc_avg_price: string;
  use_manual_btc:       string;
  current_savings:      string;
  btc_price_updated_at: string;
  btc_price_interval:   string;
  btc_price_auto_fetch: string;
}

function timeAgo(iso: string): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  return diffHrs < 24 ? `${diffHrs}h ago` : `${Math.floor(diffHrs / 24)}d ago`;
}

export default function SettingsPage() {
  const [form, setForm] = useState<AppSettings | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saved, setSaved]         = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceMsg, setPriceMsg]   = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/settings', { cache: 'no-store' });
    setForm(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const fetchLivePrice = async () => {
    setFetchingPrice(true);
    setPriceMsg('');
    try {
      // Force stale by temporarily resetting timestamp
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ btc_price_updated_at: '' }),
      });
      const res = await fetch('/api/bitcoin/price', { cache: 'no-store' });
      const data = await res.json();
      setPriceMsg(
        data.fetchError
          ? `⚠ ${data.fetchError}`
          : `✓ Updated: ${data.price.toLocaleString('en-US')} ${data.currency}`
      );
      load();
    } catch {
      setPriceMsg('⚠ Network error — could not reach price API');
    } finally {
      setFetchingPrice(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your finance tracker preferences</p>
      </div>

      <form onSubmit={save} className="space-y-4">
        {/* General */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-gray-400" />
            <h3 className="text-white font-semibold">General</h3>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tax */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Percent size={16} className="text-gray-400" />
            <h3 className="text-white font-semibold">Tax</h3>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Default Tax Rate (%)</label>
            <input type="number" min="0" max="100" step="0.5"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-gray-600 text-xs mt-1.5">Used for tax estimate calculations.</p>
          </div>
        </div>

        {/* Bitcoin */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bitcoin size={16} className="text-yellow-400" />
            <h3 className="text-white font-semibold">Bitcoin</h3>
          </div>
          <div className="space-y-4">
            {/* Manual price override */}
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">
                Current BTC Price (USD) — manual override
              </label>
              <input type="number" step="1" min="0"
                value={form.btc_current_price}
                onChange={(e) => setForm({ ...form, btc_current_price: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
              />
              {form.btc_price_updated_at && (
                <p className="text-gray-600 text-xs mt-1.5 flex items-center gap-1">
                  <Clock size={10} /> Last auto-fetched: {timeAgo(form.btc_price_updated_at)}
                </p>
              )}
            </div>

            {/* Auto-fetch toggle */}
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-start gap-2.5 mb-3">
                <input type="checkbox"
                  checked={form.btc_price_auto_fetch !== 'false'}
                  onChange={(e) => setForm({ ...form, btc_price_auto_fetch: String(e.target.checked) })}
                  className="w-4 h-4 mt-0.5 accent-yellow-500"
                />
                <div>
                  <p className="text-white text-sm font-medium">Auto-fetch live BTC price</p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Uses CoinGecko free API (no key needed). Price is fetched server-side and cached.
                  </p>
                </div>
              </div>

              {form.btc_price_auto_fetch !== 'false' && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1.5">Update Interval (minutes)</label>
                    <div className="flex items-center gap-3">
                      <input type="number" step="1" min="1" max="1440"
                        value={form.btc_price_interval}
                        onChange={(e) => setForm({ ...form, btc_price_interval: e.target.value })}
                        className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                      />
                      <div className="flex gap-1.5">
                        {[5, 10, 15, 30, 60].map((m) => (
                          <button type="button" key={m}
                            onClick={() => setForm({ ...form, btc_price_interval: String(m) })}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              form.btc_price_interval === String(m)
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-gray-800 text-gray-500 hover:text-white'
                            }`}
                          >{m}m</button>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-1.5">
                      The backend caches the price — multiple browser tabs share one fetch.
                    </p>
                  </div>

                  {/* Manual trigger */}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={fetchLivePrice} disabled={fetchingPrice}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <Wifi size={12} className={fetchingPrice ? 'animate-pulse' : ''} />
                      {fetchingPrice ? 'Fetching...' : 'Fetch now'}
                    </button>
                    {priceMsg && (
                      <span className={`text-xs ${priceMsg.startsWith('✓') ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {priceMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Manual BTC holdings */}
            <div className="border-t border-gray-800 pt-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox"
                  checked={form.use_manual_btc === 'true'}
                  onChange={(e) => setForm({ ...form, use_manual_btc: String(e.target.checked) })}
                  className="w-4 h-4 mt-0.5 accent-yellow-500"
                />
                <div>
                  <p className="text-white text-sm font-medium">Use Manual BTC Holdings</p>
                  <p className="text-gray-600 text-xs mt-0.5">Set your BTC amount directly instead of using DCA entries.</p>
                </div>
              </label>
            </div>

            {form.use_manual_btc === 'true' && (
              <div className="grid grid-cols-2 gap-3 ml-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">Manual BTC Amount</label>
                  <input type="number" step="0.00000001" min="0"
                    value={form.manual_btc_amount}
                    onChange={(e) => setForm({ ...form, manual_btc_amount: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="e.g. 0.5"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">Avg Buy Price (USD)</label>
                  <input type="number" step="1" min="0"
                    value={form.manual_btc_avg_price}
                    onChange={(e) => setForm({ ...form, manual_btc_avg_price: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="e.g. 45000"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Savings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-gray-400" />
            <h3 className="text-white font-semibold">Savings</h3>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Current Savings Balance ({form.currency})</label>
            <input type="number" step="0.01" min="0"
              value={form.current_savings}
              onChange={(e) => setForm({ ...form, current_savings: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-gray-600 text-xs mt-1.5">You can also update this from the Savings page with history tracking.</p>
          </div>
        </div>

        <button type="submit"
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
            saved ? 'bg-emerald-600 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'
          }`}
        >
          {saved ? <><Check size={16} /> Saved!</> : <><Settings size={16} /> Save Settings</>}
        </button>
      </form>
    </div>
  );
}
