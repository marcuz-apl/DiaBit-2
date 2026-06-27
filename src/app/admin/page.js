'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users, Trash2, ShieldAlert, Database, Check, Mail, Map, Compass, Sliders, Menu } from 'lucide-react';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Stats state & creation form state
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
  const [latLonFormat, setLatLonFormat] = useState('decimal');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState({ text: '', isError: false });

  // Messages list state
  const [messages, setMessages] = useState([]);

  // Reference Data state
  const [crsList, setCrsList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [isFetchingRefData, setIsFetchingRefData] = useState(false);

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

        // Fetch settings
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setAutoSaveInterval(sData.auto_save_interval || 3);
          setLatLonFormat(sData.lat_lon_format || 'decimal');
        }

        // Fetch contact messages
        const messagesRes = await fetch('/api/messages');
        if (messagesRes.ok) {
          const mData = await messagesRes.json();
          setMessages(mData);
        }
      } catch (e) {
        console.error("Failed to load admin data", e);
      }
    };

    fetchAdminData();
  }, [isAdmin]);

  // Fetch Reference Data on demand
  useEffect(() => {
    if (!isAdmin) return;
    const fetchRefData = async () => {
      setIsFetchingRefData(true);
      try {
        if (activeTab === 'crs' && crsList.length === 0) {
          const res = await fetch('/api/crs');
          if (res.ok) setCrsList(await res.json());
        } else if (activeTab === 'field-models' && modelsList.length === 0) {
          const res = await fetch('/api/models');
          if (res.ok) {
            const data = await res.json();
            setModelsList([...(data.magnetic || []), ...(data.gravity || [])]);
          }
        }
      } catch (e) {
        console.error("Failed to load reference data", e);
      } finally {
        setIsFetchingRefData(false);
      }
    };
    if (activeTab === 'crs' || activeTab === 'field-models') {
      fetchRefData();
    }
  }, [activeTab, isAdmin]);

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
        body: JSON.stringify({ 
          auto_save_interval: autoSaveInterval,
          lat_lon_format: latLonFormat
        })
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

  const handleDeleteMessage = async (id) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete message");
      }

      setMessages(messages.filter(m => m.id !== id));
      alert("Message deleted successfully.");
    } catch (err) {
      alert(err.message);
    }

  };

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

  const renderDashboard = () => (
    <div className="space-y-6">
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
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className={`w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shrink-0 transition-all ${isSidebarOpen ? '' : '-ml-64'}`}>
        <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <span className="font-black text-sm tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            DiaBit Admin
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Database className="h-4 w-4" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Users className="h-4 w-4" /> User Management
          </button>
          <button onClick={() => setActiveTab('nodes')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'nodes' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Database className="h-4 w-4" /> Node Registry
          </button>
          <div className="pt-4 pb-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Reference Data</span>
          </div>
          <button onClick={() => setActiveTab('crs')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'crs' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Map className="h-4 w-4" /> CRS Registry
          </button>
          <button onClick={() => setActiveTab('field-models')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'field-models' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Compass className="h-4 w-4" /> Field Models
          </button>
          <button onClick={() => setActiveTab('wmm')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'wmm' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Sliders className="h-4 w-4" /> WMM Coefficients
          </button>
          <div className="pt-4 pb-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">System</span>
          </div>
          <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'config' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <ShieldAlert className="h-4 w-4" /> Configuration
          </button>
          <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${activeTab === 'messages' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
            <Mail className="h-4 w-4" /> Messages
          </button>
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <Link href="/" className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to App
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500">
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-bold capitalize text-slate-800 dark:text-slate-200">
              {activeTab.replace('-', ' ')}
            </h1>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
            Admin: {currentUser?.username}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          
          <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
            <div className="space-y-6 max-w-6xl mx-auto text-slate-500 italic p-8 text-center bg-slate-100/50 rounded border border-slate-200">
              Additional dashboard analytics will appear here. Select a tab from the left sidebar to manage data.
            </div>
          </div>

          {/* User Management Tab */}
          <div className={activeTab === 'users' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              
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
          </div>

          {/* Node Registry Tab */}
          <div className={activeTab === 'nodes' ? 'block' : 'hidden'}>
            <div className="max-w-6xl mx-auto">
              
              {/* Node Registry */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
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
            </div>
          </div>

          {/* CRS Registry Tab */}
          <div className={activeTab === 'crs' ? 'block' : 'hidden'}>
            <div className="max-w-6xl mx-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Map className="h-4.5 w-4.5 text-blue-500" />
                  Coordinate Reference Systems
                </h2>
                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded font-semibold border border-blue-200 dark:border-blue-800/50">
                  {crsList.length} Zones Pre-Loaded
                </span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-550 font-bold">
                      <th className="py-2 px-3">EPSG</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Proj</th>
                      <th className="py-2 px-3">Meridian</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {crsList.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">{c.epsg_code}</td>
                        <td className="py-2.5 px-3 font-semibold whitespace-nowrap">{c.name}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-500">{c.projection}</td>
                        <td className="py-2.5 px-3 font-mono">{c.central_meridian}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${c.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' : 'bg-slate-100 text-slate-500'}`}>
                            {c.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Field Models Tab */}
          <div className={activeTab === 'field-models' ? 'block' : 'hidden'}>
            <div className="max-w-6xl mx-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Compass className="h-4.5 w-4.5 text-blue-500" />
                  Magnetic & Gravity Models
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-550 font-bold bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Model Name</th>
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {modelsList.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${m.model_type === 'magnetic' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                            {m.model_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">{m.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{m.year}</td>
                        <td className="py-2.5 px-3 text-slate-500">{m.provider}</td>
                      </tr>
                    ))}
                    {modelsList.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-400 italic">No field models configured.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* WMM Coefficients Tab */}
          <div className={activeTab === 'wmm' ? 'block' : 'hidden'}>
            <div className="max-w-6xl mx-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <Sliders className="h-4.5 w-4.5 text-blue-500" />
                WMM Offline Coefficients
              </h2>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded text-xs text-blue-800 dark:text-blue-300 leading-relaxed mb-4">
                <strong>Offline Calculation Engine Active.</strong> The WMM2025 magnetic model coefficients are loaded into the database. These are used as a fallback to calculate Magnetic Declination and Total Field automatically when an internet connection to the NOAA API is unavailable. 
              </div>
            </div>
          </div>
          {/* Configuration Tab */}
          <div className={activeTab === 'config' ? 'block' : 'hidden'}>
            <div className="max-w-md mx-auto">
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

                <div className="pt-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Latitude / Longitude Display Format
                  </label>
                  <select
                    value={latLonFormat}
                    onChange={(e) => setLatLonFormat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="decimal">Decimal Degrees (e.g. 29.5678°)</option>
                    <option value="dms">Degrees, Minutes, Seconds (DMS)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Choose how coordinates are formatted in the Calculation Settings panel.
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
          </div>

          {/* Messages Tab */}
          <div className={activeTab === 'messages' ? 'block' : 'hidden'}>
            <div className="max-w-6xl mx-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <Mail className="h-4.5 w-4.5 text-blue-500" />
            Received Contact Messages
          </h2>

          {messages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-550">
              No messages have been recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-550 font-bold bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3">Message</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {messages.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 align-top">
                      <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">{m.name}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{m.email}</td>
                      <td className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {m.subject}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs break-words text-slate-600 dark:text-slate-350">
                        {m.message}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded transition cursor-pointer"
                          title="Delete Message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

            </div>

        </main>
      </div>
    </div>
  );
}
