'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

const MOCK_NOTIFICATIONS = [
  { id: 1, text: 'Team "Robo Warriors" registration approved', time: '2m ago', read: false },
  { id: 2, text: 'New bulk CSV import completed – 12 teams', time: '15m ago', read: false },
  { id: 3, text: 'Payment verified for School DAV Public', time: '1h ago', read: true },
  { id: 4, text: 'District Qualifier results published', time: '3h ago', read: true },
];

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread] = useState(MOCK_NOTIFICATIONS.filter(n => !n.read).length);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const displayName = profile?.displayName || user?.displayName || user?.email || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="h-16 glass border-b border-white/5 flex items-center gap-4 px-4 sm:px-6 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        id="sidebar-toggle"
        onClick={onMenuClick}
        className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-white flex-1 truncate">{title}</h1>

      {/* Search */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-gray-500 hover:border-indigo-500/30 transition-colors cursor-pointer group">
        <Search className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
        <span className="hidden lg:block text-xs">Search teams, schools…</span>
        <kbd className="hidden lg:block text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-600 font-mono">⌘K</kbd>
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          id="notifications-btn"
          onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
          className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl border border-white/10 shadow-2xl z-50 animate-fade-in-up overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notifications</span>
              <button className="text-xs text-indigo-400 hover:text-indigo-300">Mark all read</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {MOCK_NOTIFICATIONS.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-indigo-600/5' : ''}`}>
                  <p className="text-xs text-gray-300">{n.text}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{n.time}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-center">
              <button className="text-xs text-indigo-400 hover:text-indigo-300">View all notifications</button>
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative" ref={profileRef}>
        <button
          id="profile-menu-btn"
          onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Profile menu"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 glass rounded-2xl border border-white/10 shadow-2xl z-50 animate-fade-in-up overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="py-1">
              {[
                { icon: User, label: 'Profile', href: '/profile' },
                { icon: Settings, label: 'Settings', href: '/settings' },
              ].map(item => (
                <button key={item.label}
                  onClick={() => { router.push(item.href); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
              <div className="border-t border-white/5 mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  id="sign-out-btn"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
