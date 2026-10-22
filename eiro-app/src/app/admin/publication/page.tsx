'use client';

import { useState } from 'react';
import { PageHeader, Card, KpiCard, Button, Badge, CategoryBadge, StatusBadge } from '@/components/ui';
import { Award, Download, Globe, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const RESULTS = [
  { id: 'R001', event: 'Chennai District Prelim', category: 'SUMO' as CategoryCode, teams: 8, scoreStatus: 'LOCKED', pubStatus: 'PUBLISHED', qualifiedCount: 2 },
  { id: 'R002', event: 'Chennai District Prelim', category: 'MAZE' as CategoryCode, teams: 6, scoreStatus: 'LOCKED', pubStatus: 'DRAFT', qualifiedCount: 2 },
  { id: 'R003', event: 'Chennai District Prelim', category: 'ECO_CITY' as CategoryCode, teams: 5, scoreStatus: 'VERIFIED', pubStatus: 'DRAFT', qualifiedCount: 0 },
  { id: 'R004', event: 'Chennai District Prelim', category: 'WALL' as CategoryCode, teams: 4, scoreStatus: 'SUBMITTED', pubStatus: 'DRAFT', qualifiedCount: 0 },
];

export default function PublicationPage() {
  const [publishing, setPublishing] = useState<string | null>(null);

  const handlePublish = (id: string) => {
    setPublishing(id);
    setTimeout(() => setPublishing(null), 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Publication & Certificates"
        subtitle="A14 — Publish results publicly and issue participation certificates"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Publishable" value={RESULTS.filter(r => r.scoreStatus === 'LOCKED').length} icon={Globe} color="green" />
        <KpiCard title="Published" value={RESULTS.filter(r => r.pubStatus === 'PUBLISHED').length} icon={CheckCircle2} color="blue" />
        <KpiCard title="Certs Generated" value={14} icon={Award} color="purple" />
        <KpiCard title="Pending Lock" value={RESULTS.filter(r => r.scoreStatus !== 'LOCKED').length} icon={Lock} color="orange" />
      </div>

      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          Only results with LOCKED scores can be published. Publication is irreversible — results will appear on the public Results page immediately.
          Certificates are generated as PDF and linked from each student&apos;s profile.
        </p>
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Results Publication Queue</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>Event</th><th>Category</th><th>Teams</th><th>Score Status</th><th>Publication</th><th>Qualifiers</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {RESULTS.map(r => (
                <tr key={r.id}>
                  <td><span className="text-xs text-gray-400">{r.event}</span></td>
                  <td><CategoryBadge code={r.category} /></td>
                  <td><span className="text-white">{r.teams}</span></td>
                  <td><StatusBadge status={r.scoreStatus} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.pubStatus} />
                      {r.pubStatus === 'PUBLISHED' && <Globe className="w-3 h-3 text-green-400" />}
                    </div>
                  </td>
                  <td>
                    {r.qualifiedCount > 0
                      ? <Badge variant="success">{r.qualifiedCount} teams</Badge>
                      : <span className="text-xs text-gray-600">—</span>
                    }
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {r.scoreStatus === 'LOCKED' && r.pubStatus !== 'PUBLISHED' && (
                        <Button size="sm" icon={Globe} loading={publishing === r.id} onClick={() => handlePublish(r.id)}>
                          Publish
                        </Button>
                      )}
                      {r.pubStatus === 'PUBLISHED' && (
                        <Button size="sm" variant="secondary" icon={Award}>Gen Certs</Button>
                      )}
                      <Button size="sm" variant="secondary" icon={Download}>Export</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
