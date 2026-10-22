'use client';

import { PageHeader, Card, KpiCard, Button } from '@/components/ui';
import { BarChart3, Download, FileText, Filter, TrendingUp, Trophy, Users, CreditCard, Calendar } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'participation', title: 'Participation Report', desc: 'Schools, teams, students per district/category', icon: Users, bg: 'bg-indigo-600/20', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  { id: 'payment', title: 'Payment Summary', desc: 'Fee collection status, verified amounts by school', icon: CreditCard, bg: 'bg-green-600/20', border: 'border-green-500/30', text: 'text-green-400' },
  { id: 'results', title: 'Results & Rankings', desc: 'Published results, qualifiers, score distributions', icon: Trophy, bg: 'bg-yellow-600/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  { id: 'attendance', title: 'Attendance Report', desc: 'Training Day 1 & 2, competition attendance', icon: Calendar, bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  { id: 'imports', title: 'Import Audit', desc: 'All CSV import jobs, validation errors, timestamps', icon: FileText, bg: 'bg-purple-600/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  { id: 'adjustments', title: 'Adjustment Audit', desc: 'All merge/transfer history with before/after snapshots', icon: BarChart3, bg: 'bg-orange-600/20', border: 'border-orange-500/30', text: 'text-orange-400' },
];

const QUICK_STATS = [
  { label: 'Schools', value: 42, trend: '+8' },
  { label: 'Teams', value: 123, trend: '+12' },
  { label: 'Students', value: 487, trend: '+45' },
  { label: 'Revenue', value: '₹61,500', trend: '+₹5k' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Reports & Audit"
        subtitle="A18 — Generate and download reports for all competition activities"
        actions={<Button variant="secondary" size="sm" icon={Filter}>Filter Season</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {QUICK_STATS.map(stat => (
          <Card key={stat.label} className="text-center">
            <div className="text-2xl font-black text-white mb-0.5">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-xs text-green-400 mt-1 flex items-center justify-center gap-0.5">
              <TrendingUp className="w-3 h-3" />{stat.trend} this season
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REPORT_TYPES.map(report => {
          const Icon = report.icon;
          return (
            <Card key={report.id} hover className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${report.bg} ${report.border}`}>
                <Icon className={`w-5 h-5 ${report.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm mb-0.5">{report.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{report.desc}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={BarChart3}>Preview</Button>
                  <Button size="sm" icon={Download}>Download CSV</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-purple-500/20 bg-purple-500/[0.03]">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white text-sm mb-1">Immutable Audit Log</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              All sensitive operations (payment verification, score submission, team adjustments, role changes) are written to an immutable Firestore audit log.
              These records cannot be modified or deleted by any client. Export via Cloud Console for compliance reporting.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
