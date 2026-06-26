'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users, Trash2, ShieldAlert, Database, Check } from 'lucide-react';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Users list & creation form state
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  
  // Nodes list & stats
  const [nodes, setNodes] = useState([]);
  const [pointsCount, setPointsCount] = useState(0);

  // Success/Error notifications
  const [userMsg, setUserMsg] = useState({ text: '', isError: false });

  // Settings state variables
  const [autoSaveInterval, setAutoSaveInterval] = useState(3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState({ text: '', isError: false });

  // Load user and check role
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (u.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch admin data if authorized
  useEffect(() => {
    if (!isAdmin) return;

    const fetchAdminData = async () => {
      try {
        // Fetch users
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData);
        }

        // Fetch nodes
        const nodesRes = await fetch('/api/nodes');
        if (nodesRes.ok) {
          const nData = await nodesRes.json();
          setNodes(nData);
        }

        // Fetch auto-save interval settings
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setAutoSaveInterval(sData.auto_save_interval || 3);
        }
      } catch (e) {
        console.error("Failed to load admin data", e);
      }
    };

    fetchAdminData();
  }, [isAdmin]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg({ text: '', isError: false });

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }

      const newUser = await res.json();
      setUsers([...users, newUser]);
      setUserMsg({ text: `User "${username}" created successfully!`, isError: false });
      
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('user');
    } catch (err) {
      setUserMsg({ text: err.message, isError: true });
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (currentUser?.id === id) {
      alert("You cannot delete your own logged-in admin account!");
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }

      setUsers(users.filter(u => u.id !== id));
      alert(`User "${name}" deleted.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteNode = async (id, name) => {
    if (!confirm(`Are you sure you want to delete node "${name}"? All children and survey data associated will cascade delete.`)) return;

    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete node");
      }

      setNodes(nodes.filter(n => n.id !== id));
      alert(`Node "${name}" deleted.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg({ text: '', isError: false });

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_save_interval: autoSaveInterval })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update configuration");
      }

      setSettingsMsg({ text: "System settings saved successfully!", isError: false });
    } catch (err) {
      setSettingsMsg({ text: err.message, isError: true });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // If unauthorized
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-950 bg-red-950/20 p-8 shadow-2xl space-y-4">
          <ShieldAlert className="h-14 w-14 text-red-500 mx-auto animate-bounce" />
          <h1 className="text-xl font-bold text-slate-100">Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Administrative privileges are required to view this panel. Please sign in as "admin" to unlock.
          </p>
          <div className="pt-2">
            <Link 
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-5 py-2.5 text-xs font-semibold text-white shadow transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6 max-w-6xl mx-auto">
          <Link 
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
          <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            DiaBit Admin Panel
          </span>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
            Logged in as: {currentUser?.username}
          </div>
        </div>
      </nav>

      {/* Admin Dashboard Area */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
        {/* Row 1: System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex items-center gap-3">
            <Users className="h-10 w-10 text-blue-500" />
            <div>
              <div className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-wider font-bold">Total Accounts</div>
              <div className="text-xl font-black">{users.length}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex items-center gap-3">
            <Database className="h-10 w-10 text-emerald-500" />
            <div>
              <div className="text-[10px] text-slate-455 dark:text-slate-500 uppercase tracking-wider font-bold">Hierarchy Nodes</div>
              <div className="text-xl font-black">{nodes.length}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex items-center gap-3">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
            <div>
              <div className="text-[10px] text-slate-455 dark:text-slate-500 uppercase tracking-wider font-bold">Database Status</div>
              <div className="text-xs font-semibold text-emerald-500 flex items-center gap-1 mt-1">
                <Check className="h-4.5 w-4.5" /> Connected
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: User Management & Create User Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* User List Table */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex flex-col">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-blue-500" />
              Manage User Profiles
            </h2>
            
            <div className="flex-1 overflow-x-auto min-h-[220px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-550 font-bold bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Username</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="py-2 px-3 text-slate-400">{u.id}</td>
                      <td className="py-2 px-3 font-semibold">{u.username}</td>
                      <td className="py-2 px-3">{u.email}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          u.role === 'admin' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-250/20' 
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={currentUser?.id === u.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded transition disabled:opacity-30"
                          title="Delete User"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create User Form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <UserPlus className="h-4.5 w-4.5 text-blue-500" />
              Register New Profile
            </h2>

            {userMsg.text && (
              <div className={`mb-3.5 p-2 rounded text-xs border ${
                userMsg.isError 
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-950/50' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/50'
              }`}>
                {userMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@alfazen.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password string"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="user">User (Standard Engineer)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded text-xs shadow transition mt-4"
              >
                Register Profile
              </button>
            </form>
          </div>
        </div>

        {/* Row 3: Node Hierarchy & System Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Node Registry */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <Database className="h-4.5 w-4.5 text-emerald-500" />
              Hierarchy Node Registry Management
            </h2>
            
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-550 font-bold bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-2 px-3">Node ID</th>
                    <th className="py-2 px-3">Parent ID</th>
                    <th className="py-2 px-3">Node Name</th>
                    <th className="py-2 px-3">Entity Type</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {nodes.map(n => (
                    <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="py-2 px-3 text-slate-400 font-mono">{n.id}</td>
                      <td className="py-2 px-3 text-slate-400 font-mono">{n.parent_id || 'Root (Null)'}</td>
                      <td className="py-2 px-3 font-semibold">{n.name}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] text-slate-500 capitalize px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                          {n.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteNode(n.id, n.name)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded transition"
                          title="Delete Node"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Configuration */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex flex-col">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
              System Configuration
            </h2>
            
            {settingsMsg.text && (
              <div className={`mb-3.5 p-2 rounded text-xs border ${
                settingsMsg.isError 
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-950/50' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/50'
              }`}>
                {settingsMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Side Project Auto-Save Interval
                  </label>
                  <select
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'minute' : 'minutes'}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Set the inactivity period before modifications on side project wells are auto-saved to database and focus returns to the Working Project.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2 rounded text-xs shadow transition mt-4 flex items-center justify-center gap-1.5"
              >
                {isSavingSettings ? 'Saving...' : (
                  <>
                    <Check className="h-4 w-4" /> Save Configuration
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

      </main>
    </div>
  );
}
