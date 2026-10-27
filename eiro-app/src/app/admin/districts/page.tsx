'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, KpiCard, Badge, Input, Modal } from '@/components/ui';
import { MapPin, Plus, Edit3, Building, CheckCircle2, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
  collection, addDoc, doc, getDocs,
  deleteDoc, updateDoc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface District {
  id: string;
  name: string;
  state: string;
  coordinator: string;
  adminEmail: string;
  supportedEventMetadata: Record<string, unknown>;
}

interface Venue {
  id: string;
  name: string;
  districtId: string;
  address: string;
  capacity: number;
  facilities: string[];
}

const EMPTY_FORM = { name: '', state: 'Tamil Nadu', adminEmail: '', coordinator: '' };
type DistrictForm = typeof EMPTY_FORM;
const EMPTY_VENUE_FORM = { name: '', address: '', capacity: '', facilities: '' };
type VenueForm = typeof EMPTY_VENUE_FORM;

function DistrictFormFields({ form, onChange }: {
  form: DistrictForm;
  onChange: (field: keyof DistrictForm, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Input label="District Name *" id="dist-name" placeholder="e.g. Trichy"
        value={form.name} onChange={e => onChange('name', e.target.value)} />
      <Input label="State" id="dist-state" value={form.state}
        onChange={e => onChange('state', e.target.value)} />
      <Input label="Coordinator Name" id="dist-coord" placeholder="e.g. Dr. Anand Krishnan"
        value={form.coordinator} onChange={e => onChange('coordinator', e.target.value)} />
      <Input label="District Admin Email" id="dist-admin" type="email"
        placeholder="admin@district.in (must be a registered account)"
        value={form.adminEmail} onChange={e => onChange('adminEmail', e.target.value)} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const [addOpen, setAddOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState<District | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [venueTarget, setVenueTarget] = useState<District | null>(null);
  const [venueForm, setVenueForm] = useState<VenueForm>(EMPTY_VENUE_FORM);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [districtSnapshot, venueSnapshot] = await Promise.all([
        getDocs(collection(db, 'districts')),
        getDocs(collection(db, 'venues')),
      ]);
      const data: District[] = districtSnapshot.docs.map(d => {
        const source = d.data();
        const metadata = (source.supportedEventMetadata ?? {}) as Record<string, unknown>;
        return {
          id: d.id,
          name: typeof source.name === 'string' ? source.name : '',
          state: String(source.state ?? metadata.state ?? ''),
          coordinator: String(source.coordinator ?? metadata.coordinator ?? ''),
          adminEmail: String(source.adminEmail ?? metadata.adminEmail ?? ''),
          supportedEventMetadata: metadata,
        };
      });
      const venueData: Venue[] = venueSnapshot.docs.map(d => {
        const source = d.data();
        return {
          id: d.id,
          name: typeof source.name === 'string' ? source.name : '',
          districtId: typeof source.districtId === 'string' ? source.districtId : '',
          address: typeof source.address === 'string' ? source.address : '',
          capacity: typeof source.capacity === 'number' ? source.capacity : 0,
          facilities: Array.isArray(source.facilities)
            ? source.facilities.filter((facility): facility is string => typeof facility === 'string')
            : [],
        };
      }).filter(venue => venue.districtId);
      data.sort((a, b) => a.name.localeCompare(b.name));
      setDistricts(data);
      setVenues(venueData);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Districts could not be loaded. Check your role and Firestore permissions, then retry.');
      toast.error('Failed to load districts. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Add district ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('District name is required');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        supportedEventMetadata: {
          state: form.state.trim(),
          coordinator: form.coordinator.trim(),
          adminEmail: form.adminEmail.trim().toLowerCase(),
          venues: [],
        },
      };

      await addDoc(collection(db, 'districts'), payload);
      toast.success(form.adminEmail.trim()
        ? 'District created. A super admin must assign the requested district-admin role.'
        : 'District created!');

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
        supportedEventMetadata: {
          ...editTarget.supportedEventMetadata,
          state: form.state.trim(),
          coordinator: form.coordinator.trim(),
          adminEmail: form.adminEmail.trim().toLowerCase(),
        },
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

  const totalVenues = venues.length;

  const openAddVenue = (district: District) => {
    setVenueTarget(district);
    setVenueForm(EMPTY_VENUE_FORM);
  };

  const handleAddVenue = async () => {
    if (!venueTarget) return;
    if (!venueForm.name.trim()) return toast.error('Venue name is required');
    const capacity = Number(venueForm.capacity);
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      return toast.error('Enter a valid venue capacity of at least 1.');
    }

    setSaving(true);
    try {
      const facilities = [...new Set(
        venueForm.facilities.split(',').map(facility => facility.trim()).filter(Boolean)
      )];
      await addDoc(collection(db, 'venues'), {
        name: venueForm.name.trim(),
        districtId: venueTarget.id,
        address: venueForm.address.trim(),
        capacity,
        facilities,
      });
      toast.success(`Venue added to ${venueTarget.name}.`);
      setVenueTarget(null);
      setVenueForm(EMPTY_VENUE_FORM);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to add venue. Check your district-admin permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Districts & Venues"
        subtitle={error ? 'District data unavailable' : `${districts.length} districts configured`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
            <Button icon={Plus} onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>Add District</Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Districts" value={error || loading ? '—' : districts.length} icon={MapPin} color="indigo" />
        <KpiCard title="Total Venues" value={error || loading ? '—' : totalVenues} icon={Building} color="blue" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">
          <p>{error}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button>
        </Card></div>
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

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">
                  {venues.filter(venue => venue.districtId === d.id).length} venues
                </p>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => openAddVenue(d)}>
                  Add Venue
                </Button>
              </div>

              {venues.some(venue => venue.districtId === d.id) && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Venues:</p>
                  <div className="space-y-2">
                    {venues.filter(venue => venue.districtId === d.id).map(venue => (
                      <div key={venue.id} className="flex items-start gap-2 text-xs text-gray-400">
                        <Building className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-300">{venue.name}</p>
                          {venue.address && <p className="text-gray-500">{venue.address}</p>}
                          <p className="text-gray-600">Capacity: {venue.capacity}</p>
                          {venue.facilities.length > 0 && <p className="text-gray-600">{venue.facilities.join(', ')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!venues.some(venue => venue.districtId === d.id) && (
                <p className="text-xs text-gray-600">No venues in this district yet.</p>
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
        <DistrictFormFields
          form={form}
          onChange={(field, value) => setForm(current => ({ ...current, [field]: value }))}
        />
      </Modal>

      <Modal
        open={!!venueTarget}
        onClose={() => !saving && setVenueTarget(null)}
        title={`Add Venue — ${venueTarget?.name ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVenueTarget(null)} disabled={saving}>Cancel</Button>
            <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleAddVenue} disabled={saving}>
              {saving ? 'Saving…' : 'Save Venue'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Venue Name *" id="venue-name" placeholder="Name of the venue"
            value={venueForm.name} onChange={event => setVenueForm(current => ({ ...current, name: event.target.value }))} />
          <Input label="Address" id="venue-address" placeholder="Street address"
            value={venueForm.address} onChange={event => setVenueForm(current => ({ ...current, address: event.target.value }))} />
          <Input label="Capacity *" id="venue-capacity" type="number" min="1" step="1" placeholder="Maximum attendance"
            value={venueForm.capacity} onChange={event => setVenueForm(current => ({ ...current, capacity: event.target.value }))} />
          <Input label="Facilities" id="venue-facilities" placeholder="Separate facilities with commas"
            value={venueForm.facilities} onChange={event => setVenueForm(current => ({ ...current, facilities: event.target.value }))} />
          <p className="text-xs text-gray-500">
            This venue will be linked to {venueTarget?.name}. Its Firestore document ID can be used when assigning venue staff and events.
          </p>
        </div>
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
        <DistrictFormFields
          form={form}
          onChange={(field, value) => setForm(current => ({ ...current, [field]: value }))}
        />
      </Modal>
    </div>
  );
}
