'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, KpiCard, Badge, Input, Modal } from '@/components/ui';
import { MapPin, Plus, Edit3, Building, Users, CheckCircle2 } from 'lucide-react';

const DISTRICTS = [
  { id: 'D001', name: 'Chennai', state: 'Tamil Nadu', teams: 48, events: 2, coordinator: 'Dr. Anand Krishnan', venues: ['Jawaharlal Nehru Indoor Stadium', 'PSBB School Auditorium'] },
  { id: 'D002', name: 'Coimbatore', state: 'Tamil Nadu', teams: 35, events: 1, coordinator: 'Mrs. Kavitha Rajesh', venues: ['CODISSIA Trade Fair Complex'] },
  { id: 'D003', name: 'Madurai', state: 'Tamil Nadu', teams: 22, events: 1, coordinator: 'Mr. Vijay Kumar', venues: ['Madurai District Indoor Stadium'] },
  { id: 'D004', name: 'Salem', state: 'Tamil Nadu', teams: 18, events: 1, coordinator: 'Dr. Preethi Nair', venues: ['Salem Town Hall'] },
];

export default function DistrictsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', state: 'Tamil Nadu', adminEmail: '' });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Districts & Venues"
        subtitle="Manage competition districts, venues and district administrators"
        actions={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add District</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Districts" value={DISTRICTS.length} icon={MapPin} color="indigo" />
        <KpiCard title="Total Venues" value={DISTRICTS.reduce((s, d) => s + d.venues.length, 0)} icon={Building} color="blue" />
        <KpiCard title="Total Teams" value={DISTRICTS.reduce((s, d) => s + d.teams, 0)} icon={Users} color="green" />
        <KpiCard title="Total Events" value={DISTRICTS.reduce((s, d) => s + d.events, 0)} icon={CheckCircle2} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DISTRICTS.map(d => (
          <Card key={d.id} hover>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-white">{d.name}</h3>
                  <Badge variant="default">{d.state}</Badge>
                </div>
                <p className="text-xs text-gray-500">Coordinator: {d.coordinator}</p>
              </div>
              <Button size="sm" variant="secondary" icon={Edit3}>Edit</Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Teams', value: d.teams, color: 'text-indigo-400' },
                { label: 'Events', value: d.events, color: 'text-green-400' },
                { label: 'Venues', value: d.venues.length, color: 'text-blue-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center py-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Venues:</p>
              <div className="space-y-1">
                {d.venues.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <Building className="w-3 h-3 text-gray-600 flex-shrink-0" />{v}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add District"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={() => setAddOpen(false)}>Save District</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="District Name" id="dist-name" placeholder="e.g. Trichy"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="State" id="dist-state" value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
          <Input label="District Administrator Email" id="dist-admin" type="email"
            placeholder="admin@district.in" value={form.adminEmail}
            onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
