'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, KpiCard, Badge, Input, Modal } from '@/components/ui';
import { MapPin, Plus, Edit3, Building, Users, CheckCircle2, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
  collection, addDoc, setDoc, doc, getDocs,
  deleteDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getUserUidByEmail, assignRole } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface District {
  id: string;
  name: string;
  state: string;
  coordinator: string;
  adminEmail: string;
  venues: string[];
  teams: number;
  events: number;
}

const EMPTY_FORM = { name: '', state: 'Tamil Nadu', adminEmail: '', coordinator: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistrictsPage() {
  const { user } = useAuth();

  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [addOpen, setAddOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState<District | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'districts'));
      const data: District[] = snap.docs.map(d => ({
        id: d.id,
        name: '',
        state: '',
        coordinator: '',
        adminEmail: '',
        venues: [],
        teams: 0,
        events: 0,
        ...(d.data() as Partial<District>),
      }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setDistricts(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load districts. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Add district ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('District name is required');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        state: form.state.trim(),
        coordinator: form.coordinator.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        venues: [],
        teams: 0,
        events: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, 'districts'), payload);

      // If an admin email was supplied, try to assign the DISTRICT_ADMIN role
      if (form.adminEmail.trim()) {
        const adminUid = await getUserUidByEmail(form.adminEmail.trim());
        if (adminUid) {
          await assignRole({
            uid: adminUid,
            role: 'DISTRICT_ADMIN',
            scopeType: 'DISTRICT',
            scopeId: ref.id,
            createdBy: user?.uid ?? 'system',
          });
          toast.success('District created & admin role assigned!');
        } else {
          toast.success('District created. Admin email is not yet registered — assign role manually later.');
        }
      } else {
        toast.success('District created!');
      }

      setAddOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create district.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit district ───────────────────────────────────────────────────────────

  const openEdit = (d: District) => {
    setEditTarget(d);
    setForm({
      name: d.name,
      state: d.state,
      adminEmail: d.adminEmail ?? '',
      coordinator: d.coordinator ?? '',
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!form.name.trim()) return toast.error('District name is required');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'districts', editTarget.id), {
        name: form.name.trim(),
        state: form.state.trim(),
        coordinator: form.coordinator.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        updatedAt: serverTimestamp(),
      });
      toast.success('District updated!');
      setEditTarget(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update district.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete district ─────────────────────────────────────────────────────────

  const handleDelete = async (d: District) => {
    if (!confirm(`Delete district "${d.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'districts', d.id));
      toast.success('District deleted.');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete district.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalVenues = districts.reduce((s, d) => s + (d.venues?.length ?? 0), 0);
  const totalTeams  = districts.reduce((s, d) => s + (d.teams ?? 0), 0);
  const totalEvents = districts.reduce((s, d) => s + (d.events ?? 0), 0);

  const FormFields = () => (
    <div className="space-y-4">
      <Input label="District Name *" id="dist-name" placeholder="e.g. Trichy"
        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Input label="State" id="dist-state" value={form.state}
        onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
      <Input label="Coordinator Name" id="dist-coord" placeholder="e.g. Dr. Anand Krishnan"
        value={form.coordinator} onChange={e => setForm(f => ({ ...f, coordinator: e.target.value }))} />
      <Input label="District Admin Email" id="dist-admin" type="email"
        placeholder="admin@district.in (must be a registered account)"
        value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Districts & Venues"
        subtitle={`${districts.length} districts configured`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
            <Button icon={Plus} onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>Add District</Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Districts" value={districts.length} icon={MapPin} color="indigo" />
        <KpiCard title="Total Venues" value={totalVenues} icon={Building} color="blue" />
        <KpiCard title="Total Teams" value={totalTeams} icon={Users} color="green" />
        <KpiCard title="Total Events" value={totalEvents} icon={CheckCircle2} color="purple" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : districts.length === 0 ? (
        <Card className="text-center py-16">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No districts yet</p>
          <p className="text-gray-600 text-sm mt-1">Click <strong>Add District</strong> to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {districts.map(d => (
            <Card key={d.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-white">{d.name}</h3>
                    <Badge variant="default">{d.state}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {d.coordinator ? `Coordinator: ${d.coordinator}` : 'No coordinator set'}
                  </p>
                  {d.adminEmail && (
                    <p className="text-xs text-gray-600">{d.adminEmail}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" icon={Edit3} onClick={() => openEdit(d)}>Edit</Button>
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleDelete(d)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Teams',  value: d.teams ?? 0,             color: 'text-indigo-400' },
                  { label: 'Events', value: d.events ?? 0,            color: 'text-green-400'  },
                  { label: 'Venues', value: d.venues?.length ?? 0,    color: 'text-blue-400'   },
                ].map(stat => (
                  <div key={stat.label} className="text-center py-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {d.venues?.length > 0 && (
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
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add District"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Save District'}
            </Button>
          </>
        }
      >
        <FormFields />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit — ${editTarget?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Update District'}
            </Button>
          </>
        }
      >
        <FormFields />
      </Modal>
    </div>
  );
}
