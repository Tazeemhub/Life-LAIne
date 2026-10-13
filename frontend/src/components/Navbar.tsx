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
    <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
            <Heart size={18} className="text-white fill-white/20 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-slate-900 tracking-tight">Carefolio</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200/80">
                v2.0
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-slate-500 -mt-0.5 font-medium">
              Clinical Transcriber & DigiLocker
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 font-medium',
                pathname === '/'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              )}
            >
              <Home size={14} className="text-slate-500" />
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
                        ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 shadow-xs'
                        : 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                  )}
                >
                  <Icon size={14} className={active ? (isDoctor ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-400'} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Current Persona Badge & Switch Portal Button */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div
              className={`hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border font-medium ${
                isDoctor
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {isDoctor ? <Stethoscope size={13} className="text-indigo-600" /> : <User size={13} className="text-blue-600" />}
              <span className="truncate max-w-[120px]">{session.name}</span>
            </div>

            <Link
              to="/login"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-xs transition-all font-semibold"
              title="Switch between Doctor and Patient portals"
            >
              <LogIn size={13} className="text-blue-600" />
              <span className="hidden sm:inline">Switch Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
