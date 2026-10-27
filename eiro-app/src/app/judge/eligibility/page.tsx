'use client';

import { PageHeader, Card } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

export default function EligibilityPage() {
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Eligibility Check" subtitle="Eligibility inspection records are not available from the configured client schema." />
    <Card className="flex gap-3 items-start border-yellow-500/20 bg-yellow-500/[0.03]">
      <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
      <div><h3 className="font-semibold text-white">Eligibility workflow unavailable</h3><p className="text-sm text-gray-400 mt-1">No eligibility-check collection, published inspection checklist schema, or supported callable is defined in the current Firestore rules and types. No sample results or disqualification actions are shown.</p></div>
    </Card>
  </div>;
}
