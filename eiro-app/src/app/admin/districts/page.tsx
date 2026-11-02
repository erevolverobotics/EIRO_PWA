'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  Badge,
  Input,
  Modal,
} from '@/components/ui';

import {
  MapPin,
  Plus,
  Edit3,
  Building,
  CheckCircle2,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { db } from '@/lib/firebase/config';

import {
  collection,
  addDoc,
  doc,
  getDocs,
  deleteDoc,
  updateDoc,
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

const EMPTY_FORM = {
  name: '',
  state: 'Tamil Nadu',
  adminEmail: '',
  coordinator: '',
};

type DistrictForm = typeof EMPTY_FORM;

const EMPTY_VENUE_FORM = {
  name: '',
  address: '',
  capacity: '',
  facilities: '',
};

type VenueForm = typeof EMPTY_VENUE_FORM;

// ─── Animated Background Constants ────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── District Form ────────────────────────────────────────────────────────────

function DistrictFormFields({
  form,
  onChange,
}: {
  form: DistrictForm;
  onChange: (field: keyof DistrictForm, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="District Name *"
        id="dist-name"
        placeholder="e.g. Trichy"
        value={form.name}
        onChange={(e) => onChange('name', e.target.value)}
      />

      <Input
        label="State"
        id="dist-state"
        value={form.state}
        onChange={(e) => onChange('state', e.target.value)}
      />

      <Input
        label="Coordinator Name"
        id="dist-coord"
        placeholder="e.g. Dr. Anand Krishnan"
        value={form.coordinator}
        onChange={(e) => onChange('coordinator', e.target.value)}
      />

      <Input
        label="District Admin Email"
        id="dist-admin"
        type="email"
        placeholder="admin@district.in (must be a registered account)"
        value={form.adminEmail}
        onChange={(e) => onChange('adminEmail', e.target.value)}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<District | null>(null);

  const [form, setForm] = useState<DistrictForm>(EMPTY_FORM);

  const [venueTarget, setVenueTarget] = useState<District | null>(null);
  const [venueForm, setVenueForm] = useState<VenueForm>(EMPTY_VENUE_FORM);

  // ── Load Districts and Venues ────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [districtSnapshot, venueSnapshot] = await Promise.all([
        getDocs(collection(db, 'districts')),
        getDocs(collection(db, 'venues')),
      ]);

      const data: District[] = districtSnapshot.docs.map((d) => {
        const source = d.data();

        const metadata = (
          source.supportedEventMetadata ?? {}
        ) as Record<string, unknown>;

        return {
          id: d.id,
          name: typeof source.name === 'string' ? source.name : '',
          state: String(source.state ?? metadata.state ?? ''),
          coordinator: String(
            source.coordinator ?? metadata.coordinator ?? ''
          ),
          adminEmail: String(
            source.adminEmail ?? metadata.adminEmail ?? ''
          ),
          supportedEventMetadata: metadata,
        };
      });

      const venueData: Venue[] = venueSnapshot.docs
        .map((d) => {
          const source = d.data();

          return {
            id: d.id,
            name: typeof source.name === 'string' ? source.name : '',
            districtId:
              typeof source.districtId === 'string'
                ? source.districtId
                : '',
            address:
              typeof source.address === 'string'
                ? source.address
                : '',
            capacity:
              typeof source.capacity === 'number'
                ? source.capacity
                : 0,
            facilities: Array.isArray(source.facilities)
              ? source.facilities.filter(
                  (facility): facility is string =>
                    typeof facility === 'string'
                )
              : [],
          };
        })
        .filter((venue) => venue.districtId);

      data.sort((a, b) => a.name.localeCompare(b.name));

      setDistricts(data);
      setVenues(venueData);
      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Districts could not be loaded. Check your role and Firestore permissions, then retry.'
      );

      toast.error(
        'Failed to load districts. Check Firestore permissions.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Add District ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.name.trim()) {
      return toast.error('District name is required');
    }

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

      toast.success(
        form.adminEmail.trim()
          ? 'District created. A super admin must assign the requested district-admin role.'
          : 'District created!'
      );

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

  // ── Edit District ───────────────────────────────────────────────────────────

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

    if (!form.name.trim()) {
      return toast.error('District name is required');
    }

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

  // ── Delete District ─────────────────────────────────────────────────────────

  const handleDelete = async (d: District) => {
    if (!confirm(`Delete district "${d.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'districts', d.id));

      toast.success('District deleted.');

      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete district.');
    }
  };

  // ── Add Venue ───────────────────────────────────────────────────────────────

  const openAddVenue = (district: District) => {
    setVenueTarget(district);
    setVenueForm(EMPTY_VENUE_FORM);
  };

  const handleAddVenue = async () => {
    if (!venueTarget) return;

    if (!venueForm.name.trim()) {
      return toast.error('Venue name is required');
    }

    const capacity = Number(venueForm.capacity);

    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      return toast.error(
        'Enter a valid venue capacity of at least 1.'
      );
    }

    setSaving(true);

    try {
      const facilities = [
        ...new Set(
          venueForm.facilities
            .split(',')
            .map((facility) => facility.trim())
            .filter(Boolean)
        ),
      ];

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

      toast.error(
        'Failed to add venue. Check your district-admin permissions and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Statistics ───────────────────────────────────────────────────────────────

  const totalVenues = venues.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="districts-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ───────── ANIMATED BACKGROUND ───────── */}

      <div
        className="districts-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="districts-orb districts-orb-one" />
        <div className="districts-orb districts-orb-two" />
        <div className="districts-orb districts-orb-three" />
        <div className="districts-orb districts-orb-four" />

        <div className="districts-dot-grid absolute inset-0" />

        <div className="districts-ring districts-ring-one" />
        <div className="districts-ring districts-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`districts-particle ${particle}`}
          />
        ))}

        <div className="districts-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`districts-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: bubble.size,
                height: bubble.size,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="districts-center-glow" />
      </div>

      {/* ───────── COMPLETE PAGE CONTENT ───────── */}

      <main className="districts-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Districts & Venues"
          subtitle={
            error
              ? 'District data unavailable'
              : `${districts.length} districts configured`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={load}
                disabled={loading}
              >
                Refresh
              </Button>

              <Button
                icon={Plus}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setAddOpen(true);
                }}
              >
                Add District
              </Button>
            </div>
          }
        />

        {/* KPIs */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 districts-kpi-grid">
          <div className="districts-kpi-item">
            <KpiCard
              title="Districts"
              value={error || loading ? '—' : districts.length}
              icon={MapPin}
              color="indigo"
            />
          </div>

          <div className="districts-kpi-item">
            <KpiCard
              title="Total Venues"
              value={error || loading ? '—' : totalVenues}
              icon={Building}
              color="blue"
            />
          </div>
        </div>

        {/* DISTRICT LIST */}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div role="alert">
            <Card className="district-card text-sm text-red-300">
              <p>{error}</p>

              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </Card>
          </div>
        ) : districts.length === 0 ? (
          <Card className="district-card text-center py-16">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />

            <p className="text-gray-200 font-medium">
              No districts yet
            </p>

            <p className="text-gray-400 text-sm mt-1">
              Click <strong>Add District</strong> to get started.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {districts.map((d) => {
              const districtVenues = venues.filter(
                (venue) => venue.districtId === d.id
              );

              return (
                <Card
                  key={d.id}
                  hover
                  className="district-card"
                >
                  {/* DISTRICT HEADER */}

                  <div className="flex items-start justify-between gap-3 mb-4">

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <MapPin className="w-4 h-4 text-indigo-300 flex-shrink-0" />

                        <h3 className="font-bold text-white">
                          {d.name}
                        </h3>

                        <Badge variant="default">
                          {d.state}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-300">
                        {d.coordinator
                          ? `Coordinator: ${d.coordinator}`
                          : 'No coordinator set'}
                      </p>

                      {d.adminEmail && (
                        <p className="text-xs text-gray-400 mt-1">
                          {d.adminEmail}
                        </p>
                      )}
                    </div>

                    {/* DISTRICT ACTIONS */}

                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Edit3}
                        onClick={() => openEdit(d)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(d)}
                      />
                    </div>
                  </div>

                  {/* VENUE HEADER */}

                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs text-gray-300">
                      {districtVenues.length}{' '}
                      {districtVenues.length === 1 ? 'venue' : 'venues'}
                    </p>

                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Plus}
                      onClick={() => openAddVenue(d)}
                    >
                      Add Venue
                    </Button>
                  </div>

                  {/* VENUE LIST */}

                  {districtVenues.length > 0 ? (
                    <div className="district-venue-list space-y-2">
                      <p className="text-xs text-gray-300 mb-2">
                        Venues:
                      </p>

                      {districtVenues.map((venue) => (
                        <div
                          key={venue.id}
                          className="district-venue-item flex items-start gap-2 text-xs"
                        >
                          <Building className="w-3 h-3 text-indigo-300 flex-shrink-0 mt-0.5" />

                          <div className="min-w-0">
                            <p className="text-gray-100 font-medium">
                              {venue.name}
                            </p>

                            {venue.address && (
                              <p className="text-gray-300 mt-0.5">
                                {venue.address}
                              </p>
                            )}

                            <p className="text-gray-300 mt-0.5">
                              Capacity: {venue.capacity}
                            </p>

                            {venue.facilities.length > 0 && (
                              <p className="text-gray-300 mt-0.5">
                                {venue.facilities.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300">
                      No venues in this district yet.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ───────── ADD DISTRICT MODAL ───────── */}

        <Modal
          open={addOpen}
          onClose={() => !saving && setAddOpen(false)}
          title="Add District"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                icon={saving ? Loader2 : CheckCircle2}
                onClick={handleAdd}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save District'}
              </Button>
            </>
          }
        >
          <DistrictFormFields
            form={form}
            onChange={(field, value) =>
              setForm((current) => ({
                ...current,
                [field]: value,
              }))
            }
          />
        </Modal>

        {/* ───────── ADD VENUE MODAL ───────── */}

        <Modal
          open={!!venueTarget}
          onClose={() => !saving && setVenueTarget(null)}
          title={`Add Venue — ${venueTarget?.name ?? ''}`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setVenueTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                icon={saving ? Loader2 : CheckCircle2}
                onClick={handleAddVenue}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Venue'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Venue Name *"
              id="venue-name"
              placeholder="Name of the venue"
              value={venueForm.name}
              onChange={(event) =>
                setVenueForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />

            <Input
              label="Address"
              id="venue-address"
              placeholder="Street address"
              value={venueForm.address}
              onChange={(event) =>
                setVenueForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
            />

            <Input
              label="Capacity *"
              id="venue-capacity"
              type="number"
              min="1"
              step="1"
              placeholder="Maximum attendance"
              value={venueForm.capacity}
              onChange={(event) =>
                setVenueForm((current) => ({
                  ...current,
                  capacity: event.target.value,
                }))
              }
            />

            <Input
              label="Facilities"
              id="venue-facilities"
              placeholder="Separate facilities with commas"
              value={venueForm.facilities}
              onChange={(event) =>
                setVenueForm((current) => ({
                  ...current,
                  facilities: event.target.value,
                }))
              }
            />

            <p className="text-xs text-gray-400">
              This venue will be linked to {venueTarget?.name}.
              Its Firestore document ID can be used when assigning
              venue staff and events.
            </p>
          </div>
        </Modal>

        {/* ───────── EDIT DISTRICT MODAL ───────── */}

        <Modal
          open={!!editTarget}
          onClose={() => !saving && setEditTarget(null)}
          title={`Edit — ${editTarget?.name ?? ''}`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setEditTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                icon={saving ? Loader2 : CheckCircle2}
                onClick={handleEdit}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Update District'}
              </Button>
            </>
          }
        >
          <DistrictFormFields
            form={form}
            onChange={(field, value) =>
              setForm((current) => ({
                ...current,
                [field]: value,
              }))
            }
          />
        </Modal>

      </main>

      {/* ───────── ANIMATED BACKGROUND CSS ───────── */}

      <style jsx global>{`

        /* PAGE BASE */

        .districts-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .districts-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* BACKGROUND LAYER */

        .districts-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .districts-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .districts-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;

          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.43),
            rgba(216, 180, 254, 0.08) 70%,
            transparent
          );

          animation: districtsOrbOne 18s ease-in-out infinite alternate;
        }

        .districts-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;

          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.28),
            rgba(196, 181, 253, 0.08) 65%,
            transparent
          );

          animation: districtsOrbTwo 22s ease-in-out infinite alternate;
        }

        .districts-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;

          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.23),
            rgba(232, 121, 249, 0.05) 68%,
            transparent
          );

          animation: districtsOrbThree 20s ease-in-out infinite alternate;
        }

        .districts-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;

          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );

          animation: districtsOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .districts-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );

          background-size: 27px 27px;
          opacity: 0.55;

          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );

          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* ROTATING RINGS */

        .districts-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .districts-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: districtsRingOne 35s linear infinite;
        }

        .districts-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: districtsRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .districts-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);

          animation: districtsParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* FLOATING BUBBLES */

        .districts-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .districts-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);

          animation: districtsBubbleFloat linear infinite;
        }

        .districts-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .districts-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        @keyframes districtsBubbleFloat {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }

          12% {
            opacity: 0.5;
          }

          88% {
            opacity: 0.3;
          }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* CENTER GLOW */

        .districts-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);

          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.16) 0%,
            rgba(91, 52, 130, 0.09) 38%,
            transparent 72%
          );
        }

        /* ───────── TRANSPARENT CARDS ───────── */

        /*
          The cards must not create a dark screen-sized layer.
          Only a subtle transparent tint is applied to individual cards.
          No backdrop blur is used.
        */

        .districts-page .district-card {
          background: rgba(10, 7, 17, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.22) !important;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .districts-page .district-card:hover {
          background: rgba(15, 9, 24, 0.20) !important;
          border-color: rgba(221, 143, 224, 0.38) !important;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.14) !important;
        }

        /* KPI CARD WRAPPERS */

        .districts-kpi-item {
          min-width: 0;
          background: transparent !important;
        }

        .districts-kpi-item > * {
          background: rgba(10, 7, 17, 0.12) !important;
          border-color: rgba(221, 143, 224, 0.22) !important;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* VENUE DETAILS */

        .district-venue-list {
          background: transparent !important;
        }

        .district-venue-item {
          padding: 10px;
          border: 1px solid rgba(221, 143, 224, 0.13);
          border-radius: 10px;
          background: rgba(10, 7, 17, 0.08) !important;
        }

        /* Remove accidental background layers inside page content.
           This deliberately does not target buttons, badges or inputs. */

        .districts-page .districts-content {
          background: transparent !important;
        }

        /* ORB ANIMATIONS */

        @keyframes districtsOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes districtsOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes districtsOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }

          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes districtsOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }

          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        /* RING ANIMATIONS */

        @keyframes districtsRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }

          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes districtsRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }

          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        /* PARTICLE ANIMATION */

        @keyframes districtsParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }

          50% {
            opacity: 0.9;
          }

          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        /* MOBILE */

        @media (max-width: 640px) {
          .districts-orb-one {
            width: 320px;
            height: 320px;
          }

          .districts-orb-two {
            width: 360px;
            height: 360px;
          }

          .districts-orb-three {
            width: 340px;
            height: 340px;
          }

          .districts-ring-one {
            width: 300px;
            height: 300px;
          }

          .districts-ring-two {
            width: 240px;
            height: 240px;
          }

          .districts-page .district-card {
            background: rgba(10, 7, 17, 0.14) !important;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .districts-orb,
          .districts-ring,
          .districts-particle,
          .districts-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
