import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, MapPin, Plus, Tag, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useWatchRules } from '@/hooks/useWatchRules';
import UpgradePrompt from '@/components/UpgradePrompt';
import { toast } from '@/components/ui/sonner';
import type { WatchRule } from '@/types/watchRule';

// ── Add rule form ─────────────────────────────────────────────────────────────

function AddRuleForm({ onAdd }: { onAdd: (rule: WatchRule) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel]       = useState('');
  const [keywords, setKeywords] = useState('');
  const [regions, setRegions]   = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const kws = keywords.split(',').map(s => s.trim()).filter(Boolean);
    const regs = regions.split(',').map(s => s.trim()).filter(Boolean);
    if (!label.trim() || kws.length === 0) return;
    onAdd({
      id: `rule-${Date.now()}`,
      createdAt: Date.now(),
      label: label.trim(),
      keywords: kws,
      regions: regs,
      active: true,
    });
    setLabel(''); setKeywords(''); setRegions(''); setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add watch rule
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 p-3 rounded-xl border border-ivory-200/10 bg-ivory-200/[0.03]">
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Rule name (e.g. Gaza conflict)"
        className="w-full bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
      />
      <div className="flex items-center gap-1.5">
        <Tag className="w-3 h-3 text-ivory-200/30 flex-shrink-0" />
        <input
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Keywords, comma-separated"
          className="flex-1 bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3 h-3 text-ivory-200/30 flex-shrink-0" />
        <input
          value={regions}
          onChange={e => setRegions(e.target.value)}
          placeholder="Regions (optional), comma-separated"
          className="flex-1 bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
        >
          Save rule
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-ivory-200/40 hover:text-ivory-200/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Rule row ──────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: WatchRule;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`p-3 rounded-lg border transition-colors ${rule.active ? 'border-ivory-200/12 bg-ivory-200/[0.02]' : 'border-ivory-200/6 opacity-50'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <button onClick={onToggle} className="text-ivory-200/40 hover:text-amber-400 transition-colors">
          {rule.active
            ? <ToggleRight className="w-4 h-4 text-amber-400" />
            : <ToggleLeft className="w-4 h-4" />}
        </button>
        <span className="text-xs font-semibold text-ivory-100 flex-1">{rule.label}</span>
        <button onClick={onDelete} className="text-ivory-200/20 hover:text-red-400 transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1 pl-6">
        {rule.keywords.map(kw => (
          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400/70">
            {kw}
          </span>
        ))}
        {rule.regions.map(r => (
          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-ivory-200/5 border border-ivory-200/15 text-ivory-200/40 flex items-center gap-1">
            <MapPin className="w-2 h-2" />{r}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AlertsPanel({ isPaid = false }: { isPaid?: boolean }) {
  const navigate = useNavigate();
  const { rules, alerts, addRule, toggleRule, deleteRule, readAlert, readAllAlerts } = useWatchRules(isPaid);

  const unread = alerts.filter(a => !a.read);

  function openAlert(leadArticleId: string, alertId: string) {
    readAlert(alertId);
    navigate(`/app/investigate?article=${leadArticleId}`);
  }

  return (
    <div className="space-y-6">

      {/* ── Watch rules ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-ivory-200/50 uppercase tracking-wider">Watch rules</h3>
          <span className="text-[10px] text-ivory-200/25">{rules.filter(r => r.active).length} active</span>
        </div>

        {rules.length === 0 ? (
          <p className="text-xs text-ivory-200/30 mb-3">
            No rules yet. Add one to get alerted when a matching story appears.
          </p>
        ) : (
          <div className="space-y-2 mb-3">
            {rules.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onDelete={() => deleteRule(rule.id)}
              />
            ))}
          </div>
        )}

        {!isPaid && rules.length >= 3 && (
          <UpgradePrompt
            feature="watch rules"
            limitReached="You've reached the free limit of 3 watch rules."
            className="mb-2"
          />
        )}
        {(isPaid || rules.length < 3) && (
          <AddRuleForm onAdd={async (rule) => {
            const result = await addRule(rule);
            if (result.success) toast.success('Watch rule saved.');
            else if (result.limitReached) toast.error('Upgrade to Pro to add more watch rules.');
          }} />
        )}
      </section>

      {/* ── Recent alerts ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-ivory-200/50 uppercase tracking-wider">
            Recent alerts
            {unread.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-bold">
                {unread.length}
              </span>
            )}
          </h3>
          {unread.length > 0 && (
            <button
              onClick={readAllAlerts}
              className="text-[10px] text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="w-7 h-7 text-ivory-200/15 mx-auto mb-2" />
            <p className="text-xs text-ivory-200/30">
              {rules.length === 0
                ? 'Add a watch rule above to start receiving alerts.'
                : 'No alerts yet. Alerts trigger on the next refresh when a story matches your rules.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 30).map(alert => (
              <button
                key={alert.id}
                onClick={() => openAlert(alert.leadArticleId, alert.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  alert.read
                    ? 'border-ivory-200/6 hover:border-ivory-200/12'
                    : 'border-amber-400/20 bg-amber-400/[0.03] hover:bg-amber-400/[0.06]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Bell className={`w-3 h-3 mt-0.5 flex-shrink-0 ${alert.read ? 'text-ivory-200/20' : 'text-amber-400/70'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-amber-400/60 font-medium">{alert.ruleLabel}</span>
                      <span className="text-[9px] text-ivory-200/25">·</span>
                      <span className="text-[10px] font-bold" style={{ color: alert.heatLevel >= 70 ? '#f87171' : alert.heatLevel >= 40 ? '#f59e0b' : '#a3a3a3' }}>
                        {alert.heatLevel}
                      </span>
                    </div>
                    <p className="text-xs text-ivory-200/70 line-clamp-2 leading-snug">{alert.headline}</p>
                    <p className="text-[10px] text-ivory-200/25 mt-1">
                      {new Date(alert.triggeredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
