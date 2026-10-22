'use client';

import { KpiCard, Card, StatusBadge, CategoryBadge, Button, PageHeader } from '@/components/ui';
import { QrCode, UserCheck, Users, AlertCircle, Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { CategoryCode } from '@/lib/types';

const QUEUE = [
  { id: 'TE001', code: 'EIRO-2026-041', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, status: 'CHECKED_IN', membersPresent: 2, membersTotal: 2, slot: '09:00 AM', arena: 'A1' },
  { id: 'TE002', code: 'EIRO-2026-042', name: 'Iron Crushers', category: 'SUMO' as CategoryCode, status: 'APPROVED', membersPresent: 1, membersTotal: 2, slot: '09:00 AM', arena: 'A1' },
  { id: 'TE003', code: 'EIRO-2026-043', name: 'Maze Masters', category: 'MAZE' as CategoryCode, status: 'CHECKED_IN', membersPresent: 2, membersTotal: 2, slot: '09:30 AM', arena: 'B2' },
  { id: 'TE004', code: 'EIRO-2026-044', name: 'Wall Runners', category: 'WALL' as CategoryCode, status: 'COMPETING', membersPresent: 2, membersTotal: 2, slot: '10:00 AM', arena: 'C3' },
];

export default function VenueDashboard() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Venue Dashboard"
        subtitle="Jawaharlal Nehru Indoor Stadium · District Prelim — Chennai · Oct 28, 2026"
        actions={
          <Link href="/venue/checkin">
            <Button icon={QrCode}>Start Check-in</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Teams Today" value={QUEUE.length} icon={Users} color="indigo" />
        <KpiCard title="Checked In" value={QUEUE.filter(t => ['CHECKED_IN', 'COMPETING', 'COMPLETED'].includes(t.status)).length} icon={UserCheck} color="green" />
        <KpiCard title="Short-staffed" value={QUEUE.filter(t => t.membersPresent < t.membersTotal).length} icon={AlertCircle} color="orange" />
        <KpiCard title="Currently Competing" value={QUEUE.filter(t => t.status === 'COMPETING').length} icon={Activity} color="blue" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Today&apos;s Queue</h3>
          <Link href="/venue/queue">
            <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">Full Queue</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Category</th>
                <th>Slot / Arena</th>
                <th>Members</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {QUEUE.map(t => {
                const shortage = t.membersPresent < t.membersTotal;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="font-medium text-white text-sm">{t.name}</div>
                      <div className="font-mono text-[10px] text-gray-600">{t.code}</div>
                    </td>
                    <td><CategoryBadge code={t.category} /></td>
                    <td>
                      <div className="text-sm text-white">{t.slot}</div>
                      <div className="text-xs text-gray-500">Arena {t.arena}</div>
                    </td>
                    <td>
                      <span className={`text-sm font-medium ${shortage ? 'text-red-400' : 'text-green-400'}`}>
                        {t.membersPresent}/{t.membersTotal}
                      </span>
                      {shortage && <div className="text-[10px] text-red-500">Short-staffed</div>}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {t.status === 'APPROVED' && (
                        <Link href="/venue/checkin">
                          <Button size="sm" icon={QrCode}>Check In</Button>
                        </Link>
                      )}
                      {shortage && t.status !== 'COMPETING' && (
                        <Link href="/venue/adjustments">
                          <Button size="sm" variant="danger" icon={AlertCircle}>Merge?</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
