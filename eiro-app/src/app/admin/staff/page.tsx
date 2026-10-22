'use client';

import { useState } from 'react';
import { PageHeader, Card, KpiCard, Button, Badge, StatusBadge, Modal, Input, Select } from '@/components/ui';
import { Users, Plus, Edit3, Shield, Mail, Phone, CheckCircle2 } from 'lucide-react';

const STAFF = [
  { id: 'U001', name: 'Dr. Anand Krishnan', email: 'anand@eiro.in', phone: '+91 98765 43200', role: 'DISTRICT_ADMIN', district: 'Chennai', status: 'ACTIVE' },
  { id: 'U002', name: 'Mrs. Lakshmi Venkat', email: 'lakshmi@eiro.in', phone: '+91 87654 32100', role: 'VENUE_COORDINATOR', district: 'Chennai', status: 'ACTIVE' },
  { id: 'U003', name: 'Mr. Karthik Rajan', email: 'karthik@eiro.in', phone: '+91 76543 21000', role: 'JUDGE', district: 'Chennai', status: 'ACTIVE' },
  { id: 'U004', name: 'Ms. Divya Nair', email: 'divya@eiro.in', phone: '+91 65432 10900', role: 'HEAD_JUDGE', district: 'Chennai', status: 'ACTIVE' },
  { id: 'U005', name: 'Mr. Suresh Babu', email: 'suresh@eiro.in', phone: '+91 54321 09800', role: 'CHECKIN_VOLUNTEER', district: 'Chennai', status: 'INACTIVE' },
];

const ROLE_COLORS: Record<string, string> = {
  DISTRICT_ADMIN: 'danger',
  VENUE_COORDINATOR: 'success',
  JUDGE: 'purple',
  HEAD_JUDGE: 'warning',
  CHECKIN_VOLUNTEER: 'info',
};

export default function StaffPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'JUDGE', district: 'Chennai' });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Staff & Judges"
        subtitle="Manage role assignments for coordinators, judges and volunteers"
        actions={<Button icon={Plus} onClick={() => setInviteOpen(true)}>Invite Staff</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Staff" value={STAFF.length} icon={Users} color="indigo" />
        <KpiCard title="Judges" value={STAFF.filter(s => s.role === 'JUDGE' || s.role === 'HEAD_JUDGE').length} icon={Shield} color="purple" />
        <KpiCard title="Coordinators" value={STAFF.filter(s => s.role === 'VENUE_COORDINATOR' || s.role === 'DISTRICT_ADMIN').length} icon={Users} color="blue" />
        <KpiCard title="Inactive" value={STAFF.filter(s => s.status === 'INACTIVE').length} icon={Users} color="orange" />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Role</th><th>District</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {STAFF.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{s.email}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{s.phone}</div>
                    </div>
                  </td>
                  <td><Badge variant={ROLE_COLORS[s.role] as 'danger' | 'success' | 'purple' | 'warning' | 'info'}>{s.role.replace(/_/g, ' ')}</Badge></td>
                  <td><span className="text-sm text-gray-300">{s.district}</span></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" icon={Edit3}>Edit Role</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={() => setInviteOpen(false)}>Send Invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Email Address" id="invite-email" type="email" placeholder="staff@school.edu.in"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Role" id="invite-role" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'JUDGE', label: 'Judge' },
              { value: 'HEAD_JUDGE', label: 'Head Judge' },
              { value: 'VENUE_COORDINATOR', label: 'Venue Coordinator' },
              { value: 'DISTRICT_ADMIN', label: 'District Admin' },
              { value: 'CHECKIN_VOLUNTEER', label: 'Check-in Volunteer' },
            ]} />
          <Select label="District" id="invite-district" value={form.district}
            onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
            options={['Chennai', 'Coimbatore', 'Madurai', 'Salem'].map(d => ({ value: d, label: d }))} />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">An invite email will be sent. The user must create an account using the same email to activate their role.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
