'use client';

import { useState } from 'react';
import { PageHeader, Card, Badge, StatusBadge, CategoryBadge, Button } from '@/components/ui';
import { QrCode, Download, Share2, CheckCircle2, Info } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const MOCK_PASSES = [
  {
    id: 'PE-2026-041', teamCode: 'EIRO-2026-041', teamName: 'Robo Warriors',
    category: 'SUMO' as CategoryCode, school: 'DAV Public School',
    event: 'District Preliminary — Chennai', venue: 'Jawaharlal Nehru Indoor Stadium',
    reportingTime: '8:00 AM · Oct 28, 2026', arena: 'Arena A - Sumo Ring 1',
    members: ['Arjun Sharma (Gr 7A)', 'Riya Patel (Gr 7B)'],
    status: 'APPROVED',
  },
];

// SVG QR placeholder — deterministic cells based on value + index (no Math.random during prerender)
function QRPlaceholder({ value }: { value: string }) {
  const seed = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const isDark = (i: number) => ((seed * 31 + i * 17) % 7) > 2;

  return (
    <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center mx-auto relative overflow-hidden">
      <div className="grid grid-cols-7 gap-0.5 p-2 w-full h-full">
        {Array.from({ length: 49 }).map((_, i) => (
          <div key={i} className={`rounded-sm ${isDark(i) ? 'bg-gray-900' : 'bg-white'}`} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-[8px] font-black">EIRO</span>
        </div>
      </div>
      <p className="sr-only">{value}</p>
    </div>
  );
}

export default function TeamPassesPage() {
  const [selected, setSelected] = useState(MOCK_PASSES[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team QR Passes"
        subtitle="S09 — Download and share QR passes for approved teams"
      />

      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          QR passes are available only for approved teams. The QR code references a server-verified entry ID — no sensitive student data is embedded in the QR itself.
        </p>
      </div>

      {MOCK_PASSES.length === 0 ? (
        <Card className="text-center py-16">
          <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No approved teams yet. QR passes will appear once your registration is approved.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team list */}
          <div className="space-y-3">
            {MOCK_PASSES.map(p => (
              <button key={p.id} onClick={() => setSelected(p)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                  selected.id === p.id ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 bg-white/[0.03] hover:border-indigo-500/30'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{p.teamName}</span>
                  <StatusBadge status={p.status} />
                </div>
                <CategoryBadge code={p.category} />
                <p className="text-xs text-gray-500 mt-2 font-mono">{p.teamCode}</p>
              </button>
            ))}
          </div>

          {/* Pass card */}
          <div className="lg:col-span-2">
            <div className="glass rounded-3xl border border-white/10 overflow-hidden">
              {/* Header gradient */}
              <div className="bg-gradient-to-r from-indigo-900 to-violet-900 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-300 font-medium uppercase tracking-widest mb-1">EIRO 2026</p>
                    <h2 className="text-xl font-black text-white">{selected.teamName}</h2>
                    <p className="text-sm text-indigo-200 mt-0.5">{selected.school}</p>
                  </div>
                  <div className="text-right">
                    <CategoryBadge code={selected.category} />
                    <p className="text-xs text-gray-400 mt-2 font-mono">{selected.teamCode}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3">
                    <QRPlaceholder value={selected.id} />
                    <p className="text-xs text-gray-500 text-center">Scan at venue check-in</p>
                    <p className="text-xs font-mono text-gray-600">{selected.id}</p>
                  </div>

                  {/* Pass details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Event</p>
                      <p className="text-sm font-medium text-white">{selected.event}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Venue</p>
                      <p className="text-sm font-medium text-white">{selected.venue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reporting Time</p>
                      <p className="text-sm font-medium text-white">{selected.reportingTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Arena</p>
                      <p className="text-sm font-medium text-white">{selected.arena}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Team Members</p>
                      <div className="space-y-1">
                        {selected.members.map((m, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                            <span className="text-sm text-gray-300">{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                  <Button size="sm" icon={Download} className="flex-1">Download PDF</Button>
                  <Button variant="secondary" size="sm" icon={Share2} className="flex-1">Share</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
