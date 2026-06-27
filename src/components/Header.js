'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, User, LogOut, HelpCircle, Info } from 'lucide-react';
import pkg from '../../package.json';

export default function Header({ currentUser, onLogin, onLogout }) {
  const [isDark, setIsDark] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Load theme preference on mount
  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Authentication failed");
      }

      const userData = await res.json();
      onLogin(userData);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          {/* Left corner: Help, About */}
          <div className="flex items-center gap-3">
            <Link 
              href="/help"
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Link>
            <button 
              onClick={() => setShowAboutModal(true)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <Info className="h-4 w-4" />
              About
            </button>
          </div>

          {/* Center: Logo and App Name */}
          <div className="flex items-center gap-2 select-none">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md dark:bg-blue-600">
              <svg className="h-4 w-4 animate-spin-slow" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" stroke="#ef4444" fill="none" />
                <circle cx="12" cy="12" r="2.5" stroke="#ef4444" fill="#ef4444" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
                DiaBit
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                v{pkg.version}
              </span>
            </div>
          </div>

          {/* Right corner: User profile & Theme Toggle */}
          <div className="flex items-center gap-4">
            {/* User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser?.role === 'admin' && (
                  <Link 
                    href="/admin"
                    className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10"
                  >
                    Admin Panel
                  </Link>
                )}
                <div className="flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{currentUser.username}</span>
                  <span className="text-[9px] text-slate-400 capitalize">{currentUser.role}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition"
                  title="Sign Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition"
              >
                <User className="h-4 w-4" />
                Sign In
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-850 dark:text-slate-100 mb-1">Welcome to DiaBit</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Enter credentials to access plans & surveys</p>
            
            {error && (
              <div className="mb-4 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-2.5 text-xs border border-red-200 dark:border-red-950/50">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Username / Email
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or engineer"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123 or driller123"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setError('');
                  }}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs text-white shadow-sm transition font-medium"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Logo */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg mb-4">
              <svg className="h-10 w-10 animate-spin-slow" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" stroke="#ef4444" fill="none" />
                <circle cx="12" cy="12" r="2.5" stroke="#ef4444" fill="#ef4444" />
              </svg>
            </div>

            {/* Product Name & Version */}
            <h2 className="text-lg font-bold tracking-tight">DiaBit Directional Surveying</h2>
            <span className="text-[10px] font-semibold text-slate-400 mt-1">
              Version {pkg.version}
            </span>

            {/* Intro */}
            <p className="text-xs text-slate-300 leading-relaxed mt-4">
              <strong className="text-white">DiaBit = Drilling Is A Beautiful Interesting Thing!</strong><br /><br />
              DiaBit is a lightweight directional surveying calculations suite designed for oil & gas wellbore planning and tracking. Using the Minimum Curvature Method (MCM), it provides real-time trajectory processing and 3D visualization.
            </p>

            {/* White Separator Line */}
            <hr className="w-full border-white/20 my-4" />

            {/* Copyright */}
            <div className="text-[10px] text-slate-450 font-medium">
              © {new Date().getFullYear()} Alfazen Inc. All rights reserved
            </div>

            {/* Licensing Note */}
            <div className="text-[10px] text-slate-400 mt-2.5 max-w-xs leading-normal">
              <span className="text-white">DiaBit is always free for personal use and 5-person Small Business.</span><br />
              For sales or corporate licensing agreements, please contact <a href="mailto:licensing@alfazen.org" className="text-blue-400 hover:text-blue-300 hover:underline">licensing@alfazen.org</a>
            </div>

            {/* OK Button */}
            <button
              onClick={() => setShowAboutModal(false)}
              className="mt-6 w-full rounded-lg bg-blue-600 hover:bg-blue-500 py-2 text-xs font-semibold text-white shadow transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
