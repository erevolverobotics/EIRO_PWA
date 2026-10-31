// Shared UI components for EIRO Platform
'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full border',
      size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-xs',
      {
        'bg-gray-500/15 text-gray-400 border-gray-500/30': variant === 'default',
        'bg-green-500/15 text-green-400 border-green-500/30': variant === 'success',
        'bg-yellow-500/15 text-yellow-400 border-yellow-500/30': variant === 'warning',
        'bg-red-500/15 text-red-400 border-red-500/30': variant === 'danger',
        'bg-blue-500/15 text-blue-400 border-blue-500/30': variant === 'info',
        'bg-purple-500/15 text-purple-400 border-purple-500/30': variant === 'purple',
        'bg-transparent text-gray-400 border-gray-600': variant === 'outline',
      },
      className
    )}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export function Button({ children, variant = 'primary', size = 'md', loading, icon: Icon, iconPosition = 'left', className, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-4 py-2.5 text-sm': size === 'md',
          'px-6 py-3.5 text-base': size === 'lg',
        },
        {
          'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105': variant === 'primary',
          'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20': variant === 'secondary',
          'bg-red-600 hover:bg-red-500 text-white': variant === 'danger',
          'text-gray-400 hover:text-white hover:bg-white/5': variant === 'ghost',
          'border border-indigo-500/40 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
}

// ─────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, hover, glow, padding = 'md' }: CardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/5 transition-all duration-300',
      'bg-[#111827]',
      hover && 'hover:border-indigo-500/30 hover:scale-[1.01] cursor-pointer',
      glow && 'glow-accent',
      {
        '': padding === 'none',
        'p-4': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg',
      },
      className
    )}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: number;
  subtitle?: string;
}

export function KpiCard({ title, value, icon: Icon, color = 'indigo', trend, subtitle }: KpiCardProps) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    indigo: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', icon: 'text-indigo-400' },
    green: { bg: 'bg-green-600/20', text: 'text-green-400', icon: 'text-green-400' },
    blue: { bg: 'bg-blue-600/20', text: 'text-blue-400', icon: 'text-blue-400' },
    orange: { bg: 'bg-orange-600/20', text: 'text-orange-400', icon: 'text-orange-400' },
    purple: { bg: 'bg-purple-600/20', text: 'text-purple-400', icon: 'text-purple-400' },
    red: { bg: 'bg-red-600/20', text: 'text-red-400', icon: 'text-red-400' },
    yellow: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: 'text-yellow-400' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <Card hover className="group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors', c.bg, 'group-hover:scale-110')}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium',
            trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-500')}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-600 mt-1">{subtitle}</div>}
    </Card>
  );
}

// ─────────────────────────────────────────────
// Status Badge for Registration/Entry states
// ─────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'warning' },
  CORRECTION_REQUIRED: { label: 'Correction Required', variant: 'danger' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'default' },
  PENDING: { label: 'Pending', variant: 'warning' },
  CHECKED_IN: { label: 'Checked In', variant: 'info' },
  COMPETING: { label: 'Competing', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  MERGED: { label: 'Merged', variant: 'purple' },
  DISQUALIFIED: { label: 'Disqualified', variant: 'danger' },
  NOT_REQUIRED: { label: 'Not Required', variant: 'default' },
  PARTIAL: { label: 'Partial', variant: 'warning' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  PAID: { label: 'Paid', variant: 'success' },
  UNPAID: { label: 'Unpaid', variant: 'warning' },
  WAIVED: { label: 'Waived', variant: 'purple' },
  NOT_MARKED: { label: 'Not Marked', variant: 'default' },
  PRESENT: { label: 'Present', variant: 'success' },
  ABSENT: { label: 'Absent', variant: 'danger' },
  LOCKED: { label: 'Locked', variant: 'purple' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ACTIVE: { label: 'Active', variant: 'success' },
  INACTIVE: { label: 'Inactive', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  REGISTRATION_OPEN: { label: 'Registration Open', variant: 'success' },
  REGISTRATION_CLOSED: { label: 'Reg. Closed', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  PROCESSING: { label: 'Processing', variant: 'warning' },
  COMMITTED: { label: 'Committed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
  SETUP: { label: 'Setup', variant: 'warning' },
  IDLE: { label: 'Idle', variant: 'default' },
  PASS: { label: 'Pass', variant: 'success' },
  FAIL: { label: 'Fail', variant: 'danger' },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'warning' },
  PENDING_ACKNOWLEDGEMENT: { label: 'Pending Ack.', variant: 'info' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, variant: 'default' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ─────────────────────────────────────────────
// Category Badge
// ─────────────────────────────────────────────
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';

export function CategoryBadge({ code }: { code: CategoryCode }) {
  const CAT_VARIANT: Record<CategoryCode, BadgeProps['variant']> = {
    SUMO: 'danger',
    MAZE: 'info',
    WALL: 'purple',
    ECO_CITY: 'success',
    NEXTGEN_FACTORY: 'warning',
    INNOVATOR_JUNIOR: 'danger',
    INNOVATOR_SENIOR: 'purple',
  };
  return <Badge variant={CAT_VARIANT[code]}>{CATEGORY_LABELS[code]}</Badge>;
}

// ─────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T>({ columns, data, keyField, emptyMessage = 'No data found', loading }: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="eiro-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={String(row[keyField])}>
                {columns.map(col => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      )}
      <input
        id={id}
        className={cn('eiro-input', error && 'border-red-500/60 focus:border-red-500', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Select
// ─────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, id, options, className, ...props }: SelectProps) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <select
        id={id}
        className={cn('eiro-input', error && 'border-red-500/60', className)}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Textarea
// ─────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <textarea
        id={id}
        className={cn('eiro-input resize-none', error && 'border-red-500/60', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  if (!open) return null;
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full glass rounded-2xl border border-white/10 shadow-2xl animate-fade-in-up', sizeMap[size])}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 pb-6 flex gap-3 justify-end border-t border-white/5 pt-4">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page header (title + actions)
// ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}
