'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { queryByField } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { Notification } from '@/lib/types';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, profile, authError, signOut } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const unread = notifications.filter(notification => !notification.read).length;
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

  useEffect(() => {
    if (!user) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) {
          setNotifications([]);
          setNotificationsError('');
          setNotificationsLoading(false);
        }
      });
      return () => { active = false; };
    }
    let active = true;
    queryByField<Notification>('notifications', 'recipientUid', user.uid)
      .then(items => {
        if (active) {
          setNotifications(items.sort((a, b) => {
            const aDate = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt
              ? Number((a.createdAt as { toMillis: () => number }).toMillis()) : 0;
            const bDate = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt
              ? Number((b.createdAt as { toMillis: () => number }).toMillis()) : 0;
            return bDate - aDate;
          }));
        }
      })
      .catch(error => {
        console.error('Failed to load notifications', error);
        if (active) setNotificationsError('Notifications could not be loaded.');
      })
      .finally(() => {
        if (active) setNotificationsLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (authError) toast.error(authError);
  }, [authError]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await callEiroFunction<{ notificationId: string }, { success: boolean }>('markNotificationRead', { notificationId });
      setNotifications(items => items.map(item => item.id === notificationId ? { ...item, read: true } : item));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      toast.error('Notification could not be marked as read.');
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
              <span className="text-xs text-gray-500">{unread} unread</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notificationsLoading ? (
                <p className="px-4 py-5 text-xs text-gray-500">Loading notifications…</p>
              ) : notificationsError ? (
                <p className="px-4 py-5 text-xs text-red-400">{notificationsError}</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-5 text-xs text-gray-500">No notifications.</p>
              ) : notifications.map(notification => (
                <button key={notification.id} type="button" disabled={notification.read}
                  onClick={() => void markNotificationRead(notification.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!notification.read ? 'bg-indigo-600/5' : ''}`}>
                  <p className="text-xs text-gray-300">{notification.templateId || notification.channel || 'Notification'}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{notification.state || 'Sent'}</p>
                </button>
              ))}
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
