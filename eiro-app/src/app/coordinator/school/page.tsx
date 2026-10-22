'use client';

import { PageHeader, Card, Button, Badge, Input, Modal, KpiCard } from '@/components/ui';
import { Building2, Edit3, MapPin, Phone, Mail, Globe, Users, Trophy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const SCHOOL = {
  id: 'SCH-001',
  name: 'DAV Public School',
  code: 'DAV-CHN-001',
  address: '123 Anna Nagar, Chennai - 600 040',
  district: 'Chennai',
  state: 'Tamil Nadu',
  phone: '+91 44 2615 0000',
  email: 'principal@davchennai.edu.in',
  website: 'davchennai.edu.in',
  status: 'APPROVED',
  coordinator: { name: 'Mrs. Priya Kumar', email: 'priya@davchennai.edu.in', phone: '+91 98765 43210' },
  stats: { teamsRegistered: 4, studentsEnrolled: 12, teamsApproved: 3, feesPaid: 3 },
};

export default function SchoolProfilePage() {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Profile"
        subtitle="S01 — Your school's registration and contact information"
        actions={<Button icon={Edit3} onClick={() => setEditOpen(true)}>Edit Profile</Button>}
      />

      {/* School card */}
      <Card>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-white">{SCHOOL.name}</h2>
              <Badge variant="success">✓ Approved</Badge>
            </div>
            <p className="font-mono text-xs text-gray-500">{SCHOOL.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: MapPin, label: 'Address', value: SCHOOL.address },
            { icon: MapPin, label: 'District', value: `${SCHOOL.district}, ${SCHOOL.state}` },
            { icon: Phone, label: 'Phone', value: SCHOOL.phone },
            { icon: Mail, label: 'Email', value: SCHOOL.email },
            { icon: Globe, label: 'Website', value: SCHOOL.website },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <item.icon className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm text-white mt-0.5 truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Teams Registered" value={SCHOOL.stats.teamsRegistered} icon={Trophy} color="indigo" />
        <KpiCard title="Teams Approved" value={SCHOOL.stats.teamsApproved} icon={CheckCircle2} color="green" />
        <KpiCard title="Students" value={SCHOOL.stats.studentsEnrolled} icon={Users} color="blue" />
        <KpiCard title="Fees Paid" value={`${SCHOOL.stats.feesPaid}/${SCHOOL.stats.teamsApproved}`} icon={CheckCircle2} color="purple" />
      </div>

      {/* Coordinator */}
      <Card>
        <h3 className="font-semibold text-white mb-4">Point of Contact</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {SCHOOL.coordinator.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-white">{SCHOOL.coordinator.name}</p>
            <p className="text-sm text-gray-400">{SCHOOL.coordinator.email}</p>
            <p className="text-xs text-gray-500">{SCHOOL.coordinator.phone}</p>
          </div>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit School Profile"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={() => setEditOpen(false)}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="School Name" id="school-name" defaultValue={SCHOOL.name} />
          <Input label="Phone" id="school-phone" defaultValue={SCHOOL.phone} />
          <Input label="Email" id="school-email" type="email" defaultValue={SCHOOL.email} />
          <Input label="Website" id="school-website" defaultValue={SCHOOL.website} />
          <Input label="Full Address" id="school-address" defaultValue={SCHOOL.address} />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">Changes to school name or district require admin approval before taking effect.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
