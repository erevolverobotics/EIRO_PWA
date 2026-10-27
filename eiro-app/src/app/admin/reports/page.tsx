'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, KpiCard, Button } from '@/components/ui';
import { BarChart3, Download, FileText, TrendingUp, Trophy, Users, CreditCard, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';

type ReportId = 'participation' | 'payment' | 'results' | 'attendance' | 'imports' | 'adjustments';
type Row = Record<string, unknown>;
interface School { id: string; name?: string; districtId?: string }
interface Team { id: string; schoolId?: string }
interface Student { id: string; schoolId?: string }

const REPORT_TYPES: { id: ReportId; title: string; desc: string; icon: typeof Users; bg: string; border: string; text: string }[] = [
  { id: 'participation', title: 'Participation Report', desc: 'Teams and schools from stored participation records', icon: Users, bg: 'bg-indigo-600/20', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  { id: 'payment', title: 'Payment Summary', desc: 'Payment records and their stored verification statuses', icon: CreditCard, bg: 'bg-green-600/20', border: 'border-green-500/30', text: 'text-green-400' },
  { id: 'results', title: 'Results & Rankings', desc: 'Stored result and ranking documents', icon: Trophy, bg: 'bg-yellow-600/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  { id: 'attendance', title: 'Attendance Report', desc: 'Training and competition attendance records', icon: Calendar, bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  { id: 'imports', title: 'Import Audit', desc: 'Import jobs, validation statuses and timestamps', icon: FileText, bg: 'bg-purple-600/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  { id: 'adjustments', title: 'Adjustment Audit', desc: 'Immutable team adjustment history records', icon: BarChart3, bg: 'bg-orange-600/20', border: 'border-orange-500/30', text: 'text-orange-400' },
];

function csvValue(value: unknown) {
  let text: string;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') text = value.toDate().toISOString();
  else if (value instanceof Date) text = value.toISOString();
  else if (value && typeof value === 'object') text = JSON.stringify(value);
  else text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(name: string, rows: Row[]) {
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const body = [headers.map(csvValue).join(','), ...rows.map(row => headers.map(header => csvValue(row[header])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Record<ReportId, Row[]>>({
    participation: [], payment: [], results: [], attendance: [], imports: [], adjustments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [schools, teams, students, payments, results, training, competition, imports, adjustments] = await Promise.all([
        getAll<School>('schools'), getAll<Team>('teams'), getAll<Student>('students'),
        getAll<Row>('payments'), getAll<Row>('results'),
        getAll<Row>('trainingAttendance'), getAll<Row>('studentAttendance'),
        getAll<Row>('importJobs'), getAll<Row>('teamAdjustmentHistory'),
      ]);
      const schoolById = new Map(schools.map(school => [school.id, school]));
      const schoolStudentCounts = new Map<string, number>();
      students.forEach(student => {
        if (student.schoolId) schoolStudentCounts.set(student.schoolId, (schoolStudentCounts.get(student.schoolId) || 0) + 1);
      });
      setReports({
        participation: teams.map(team => {
          const school = schoolById.get(team.schoolId || '');
          return { ...team, schoolName: school?.name || '', districtId: school?.districtId || '', studentsAtSchool: schoolStudentCounts.get(school?.id || '') || 0 };
        }),
        payment: payments,
        results,
        attendance: [...training.map(record => ({ ...record, recordType: 'training' })), ...competition.map(record => ({ ...record, recordType: 'competition' }))],
        imports,
        adjustments,
      });
    } catch (e) {
      console.error(e);
      setError('Could not load report data. One or more collections may not be readable under your Firestore access.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const exportReport = (id: ReportId, title: string) => {
    const rows = reports[id];
    if (!rows.length) {
      setMessage(`No ${title.toLowerCase()} records are available to export.`);
      return;
    }
    downloadCsv(`eiro-${id}-report`, rows);
    setMessage(`${title} CSV downloaded (${rows.length} records).`);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Reports & Audit" subtitle="Download CSV exports from the currently stored records"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-green-400">{message}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> : <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard title="Schools" value={new Set(reports.participation.map(row => String(row.schoolId || '')).filter(Boolean)).size} icon={Users} color="indigo" />
          <KpiCard title="Teams" value={reports.participation.length} icon={Trophy} color="blue" />
          <KpiCard title="Payment Records" value={reports.payment.length} icon={CreditCard} color="green" />
          <KpiCard title="Result Records" value={reports.results.length} icon={TrendingUp} color="yellow" />
        </div>
        {Object.values(reports).every(rows => rows.length === 0) && <Card className="text-center text-gray-400">No reportable records were found in the loaded collections.</Card>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {REPORT_TYPES.map(report => {
            const Icon = report.icon;
            const count = reports[report.id].length;
            return <Card key={report.id} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${report.bg} ${report.border}`}><Icon className={`w-5 h-5 ${report.text}`} /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm mb-0.5">{report.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{report.desc}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">{count} records</span>
                  <Button size="sm" icon={Download} onClick={() => exportReport(report.id, report.title)}>Download CSV</Button>
                </div>
              </div>
            </Card>;
          })}
        </div>
        <Card className="border-purple-500/20 bg-purple-500/[0.03]">
          <div className="flex items-start gap-3"><FileText className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div><h3 className="font-semibold text-white text-sm mb-1">Immutable Audit Log</h3><p className="text-xs text-gray-400 leading-relaxed">Adjustment exports use the immutable team adjustment history collection. Client-side report exports do not modify Firestore records.</p></div>
          </div>
        </Card>
      </>}
    </div>
  );
}
