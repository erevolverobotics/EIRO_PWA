'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, RefreshCw, Settings, Star, Timer, Users, Zap } from 'lucide-react';
import { PageHeader, Card, Button, Badge, CategoryBadge } from '@/components/ui';
import { CATEGORY_ENGINE, CATEGORY_LABELS, type CategoryCode } from '@/lib/types';
import { db, doc, getDoc } from '@/lib/firebase/firestore';

interface CategoryConfig {
  minTeam?: number;
  maxTeam?: number;
  feeAmount?: number;
  hasFee?: boolean;
  rounds?: number;
}

type CategoryConfigurations = Partial<Record<CategoryCode, CategoryConfig>>;

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];
const ENGINE_ICONS: Record<string, typeof Zap> = {
  MATCH_TOURNAMENT: Zap,
  TIMED_TECHNICAL: Timer,
  JUDGED_RUBRIC: Star,
  HYBRID: Settings,
};

export default function CategoryDirectoryPage() {
  const [configurations, setConfigurations] = useState<CategoryConfigurations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const snapshot = await getDoc(doc(db, 'config', 'categories'));
      setError('');
      setConfigurations(snapshot.exists() ? snapshot.data() as CategoryConfigurations : {});
    } catch (loadError) {
      console.error(loadError);
      setError('Category configuration could not be loaded from Firestore. Retry or check your access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Category Directory"
        subtitle="Configured category team limits, fees and rounds"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => { setLoading(true); void load(); }} disabled={loading}>Refresh</Button>}
      />
      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">Team limits and fee requirements come from the Firestore <code>config/categories</code> document. Missing values are shown as unconfigured; no default fee is assumed.</p>
      </div>

      {error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading category configuration…</Card>
      ) : !configurations || Object.keys(configurations).length === 0 ? (
        <Card className="text-center py-12">
          <p className="font-medium text-gray-300">Category configuration is unavailable</p>
          <p className="text-sm text-gray-500 mt-2">The config/categories document has not been set up yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {ALL_CATEGORIES.map(code => {
            const config = configurations[code];
            const engine = CATEGORY_ENGINE[code];
            const Icon = ENGINE_ICONS[engine] || Settings;
            const teamSize = config?.minTeam !== undefined && config?.maxTeam !== undefined
              ? `${config.minTeam}–${config.maxTeam} members`
              : 'Not configured';
            const fee = config?.hasFee === false
              ? 'No fee required'
              : config?.hasFee === true && config.feeAmount !== undefined
                ? `₹${config.feeAmount.toLocaleString('en-IN')}`
                : 'Fee configuration unavailable';
            return (
              <Card key={code}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-indigo-400" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2"><h3 className="font-bold text-white">{CATEGORY_LABELS[code]}</h3><CategoryBadge code={code} /></div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Detail label="Team size" value={teamSize} icon={Users} />
                        <Detail label="Fee" value={fee} icon={Info} />
                        <Detail label="Rounds / attempts" value={config?.rounds === undefined ? 'Not configured' : String(config.rounds)} icon={Settings} />
                      </div>
                    </div>
                  </div>
                  <Badge variant="info">{engine.replaceAll('_', ' ')}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p><p className="text-xs font-medium text-white">{value}</p></div>;
}
