import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  FolderLock,
  Stethoscope,
  Clock,
  User,
  LogIn,
  Home,
  Bot,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../lib/store';

export default function Navbar() {
  const { pathname } = useLocation();
  const session = useAppStore((s) => s.session);

  // Dynamic nav links according to active role
  const isDoctor = session.role === 'doctor';

  const navItems = isDoctor
    ? [
        { to: '/doctor', label: 'Doctor Station', icon: Stethoscope },
        { to: '/drive', label: 'Patient Drives', icon: FolderLock },
        { to: '/chat', label: 'Consult Copilot', icon: Bot },
      ]
    : [
        { to: '/drive', label: 'My DigiLocker', icon: FolderLock },
        { to: '/timeline', label: 'Timeline', icon: Clock },
        { to: '/chat', label: 'AI Companion', icon: Bot },
        { to: '/profile', label: 'ABHA Profile', icon: User },
      ];

  return (
    <nav className="glass-strong sticky top-0 z-50 border-b border-slate-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Heart size={18} className="text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold gradient-text tracking-tight">HealthCopilot</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono border border-slate-700/60">
                v2.0
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-slate-500 -mt-0.5">
              Clinical Transcriber & DigiLocker Drive
            </span>
          </div>
        </Link>

        {/* Center / Right: Nav Links & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Main Role Links */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200',
                pathname === '/'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <Home size={14} />
              <span className="hidden md:inline">Home</span>
            </Link>

            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200',
                    active
                      ? isDoctor
                        ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shadow-sm'
                        : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Current Persona Badge & Switch Portal Button */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div
              className={`hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border ${
                isDoctor
                  ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                  : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
              }`}
            >
              {isDoctor ? <Stethoscope size={13} /> : <User size={13} />}
              <span className="font-semibold truncate max-w-[120px]">{session.name}</span>
            </div>

            <Link
              to="/login"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 glass rounded-xl text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all font-semibold"
              title="Switch between Doctor and Patient portals"
            >
              <LogIn size={13} className="text-cyan-400" />
              <span className="hidden sm:inline">Switch Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
