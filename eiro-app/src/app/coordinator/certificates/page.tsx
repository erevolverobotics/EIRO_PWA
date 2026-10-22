'use client';

import { PageHeader, Card, Button, Badge, KpiCard } from '@/components/ui';
import { Award, Download, Share2, ShieldCheck, Search } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const CERTS = [
  {
    id: 'CERT-2026-EIRO-ABC123',
    student: 'Arjun Sharma', team: 'Robo Warriors', category: 'Sumo Wrestling',
    achievement: '1st Place — District', event: 'Chennai District Prelim 2026',
    issuedOn: 'Nov 1, 2026', status: 'ACTIVE',
  },
  {
    id: 'CERT-2026-EIRO-XYZ789',
    student: 'Riya Patel', team: 'Robo Warriors', category: 'Sumo Wrestling',
    achievement: '1st Place — District', event: 'Chennai District Prelim 2026',
    issuedOn: 'Nov 1, 2026', status: 'ACTIVE',
  },
  {
    id: 'CERT-2026-EIRO-DEF456',
    student: 'Aditya Kumar', team: 'Eco Rangers', category: 'Eco City',
    achievement: '1st Place — District', event: 'Chennai District Prelim 2026',
    issuedOn: 'Nov 1, 2026', status: 'ACTIVE',
  },
];

export default function CertificatesPage() {
  const [search, setSearch] = useState('');

  const filtered = CERTS.filter(c =>
    search === '' ||
    c.student.toLowerCase().includes(search.toLowerCase()) ||
    c.team.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (cert: typeof CERTS[0]) => {
    toast.success(`Downloading certificate for ${cert.student}…`);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Certificates"
        subtitle="S11 — Download and share official EIRO achievement certificates"
        actions={
          <Button variant="secondary" size="sm" icon={Download} onClick={() => toast.success('Downloading all certificates…')}>
            Download All
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Certs" value={CERTS.length} icon={Award} color="indigo" />
        <KpiCard title="Active" value={CERTS.filter(c => c.status === 'ACTIVE').length} icon={ShieldCheck} color="green" />
        <KpiCard title="Shareable" value={CERTS.length} icon={Share2} color="blue" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search by student or team…" value={search}
          onChange={e => setSearch(e.target.value)} className="eiro-input pl-9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(cert => (
          <Card key={cert.id} className="border-indigo-500/20 bg-gradient-to-br from-indigo-900/10 to-purple-900/10">
            {/* Certificate Preview */}
            <div className="border border-white/10 rounded-xl p-5 mb-4 bg-white/[0.02] text-center relative overflow-hidden">
              {/* Decorative border */}
              <div className="absolute inset-1 border border-indigo-500/10 rounded-lg pointer-events-none" />
              <div className="absolute inset-2 border border-indigo-500/5 rounded-lg pointer-events-none" />

              <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Certificate of Achievement</p>
              <p className="text-lg font-black text-white mb-0.5">{cert.student}</p>
              <p className="text-sm text-gray-400 mb-1">for {cert.team}</p>
              <div className="inline-block px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 mb-2">
                <p className="text-xs font-bold text-yellow-400">🏆 {cert.achievement}</p>
              </div>
              <p className="text-xs text-gray-500">{cert.event}</p>
              <p className="text-[10px] text-gray-600 mt-1">Issued: {cert.issuedOn}</p>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500">Verification Code</p>
                <p className="font-mono text-xs text-indigo-400">{cert.id}</p>
              </div>
              <Badge variant="success">{cert.status}</Badge>
            </div>

            <div className="flex gap-2">
              <Button size="sm" icon={Download} className="flex-1" onClick={() => handleDownload(cert)}>Download PDF</Button>
              <Button size="sm" variant="secondary" icon={Share2} onClick={() => {
                navigator.clipboard.writeText(`https://eiro.in/verify?code=${cert.id}`);
                toast.success('Verification link copied!');
              }}>Share</Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-500">
            No certificates found matching your search
          </div>
        )}
      </div>

      {CERTS.length === 0 && (
        <Card className="text-center py-16">
          <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No certificates issued yet</p>
          <p className="text-sm text-gray-600 mt-1">Certificates are generated after results are published and approved.</p>
        </Card>
      )}
    </div>
  );
}
