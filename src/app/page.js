'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import ExcelGrid from '@/components/ExcelGrid';
import TrajectoryCharts from '@/components/TrajectoryCharts';
import { Layers, HelpCircle, UserCheck, Database, Disc } from 'lucide-react';

export default function Home() {
  const [nodes, setNodes] = useState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [planPoints, setPlanPoints] = useState([]);
  const [surveyPoints, setSurveyPoints] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load current user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
  };

  // Fetch all nodes to keep list in memory for lookup
  const loadNodes = async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data);
      }
    } catch (e) {
      console.error("Failed to fetch nodes", e);
    }
  };

  useEffect(() => {
    loadNodes();
  }, [refreshTrigger]);

  const getCurrentSlot = () => {
    if (!activeNode || nodes.length === 0) return null;
    const active = nodes.find(n => n.id === activeNode.id);
    if (!active) return null;
    if (active.type === 'slot') return active;
    if (active.type === 'trajectory' || active.type === 'survey') {
      return nodes.find(n => n.id === active.parent_id) || null;
    }
    return null;
  };

  const getDefinitiveNodes = (slotNode) => {
    if (!slotNode || nodes.length === 0) return { plan: null, survey: null };
    const children = nodes.filter(n => n.parent_id === slotNode.id);
    const plans = children.filter(n => n.type === 'trajectory');
    const surveys = children.filter(n => n.type === 'survey');

    const isDef = (node) => {
      if (!node) return false;
      const meta = node.metadata;
      return meta?.is_definitive === true || meta?.is_definitive === 'true';
    };

    // Find plan
    let definitivePlan = plans.find(p => isDef(p));
    if (!definitivePlan) {
      if (plans.length === 1) {
        definitivePlan = plans[0];
      } else if (plans.length > 1) {
        definitivePlan = plans[0];
      }
    }

    // Find survey
    let definitiveSurvey = surveys.find(s => isDef(s));
    if (!definitiveSurvey) {
      if (surveys.length === 1) {
        definitiveSurvey = surveys[0];
      } else if (surveys.length > 1) {
        definitiveSurvey = surveys[0];
      }
    }

    return { plan: definitivePlan, survey: definitiveSurvey };
  };

  const currentSlot = getCurrentSlot();
  const { plan: defPlan, survey: defSurvey } = getDefinitiveNodes(currentSlot);

  // Load points for definitive plan & survey
  useEffect(() => {
    const loadDefinitivePoints = async () => {
      if (!currentSlot) {
        setPlanPoints([]);
        setSurveyPoints([]);
        return;
      }

      if (defPlan) {
        try {
          const res = await fetch(`/api/surveys/${defPlan.id}`);
          if (res.ok) {
            const data = await res.json();
            setPlanPoints(data);
          } else {
            setPlanPoints([]);
          }
        } catch (e) {
          console.error("Failed to load plan points", e);
          setPlanPoints([]);
        }
      } else {
        setPlanPoints([]);
      }

      if (defSurvey) {
        try {
          const res = await fetch(`/api/surveys/${defSurvey.id}`);
          if (res.ok) {
            const data = await res.json();
            setSurveyPoints(data);
          } else {
            setSurveyPoints([]);
          }
        } catch (e) {
          console.error("Failed to load survey points", e);
          setSurveyPoints([]);
        }
      } else {
        setSurveyPoints([]);
      }
    };

    loadDefinitivePoints();
  }, [currentSlot, defPlan?.id, defSurvey?.id, refreshTrigger]);

  // Get active well settings
  const getWellSettings = () => {
    const slotNode = getCurrentSlot();
    if (!slotNode || nodes.length === 0) return null;

    const well = nodes.find(n => n.id === slotNode.parent_id);
    if (well && well.type === 'well') {
      return {
        id: well.id,
        name: well.name,
        metadata: well.metadata || {}
      };
    }
    return null;
  };

  const wellInfo = getWellSettings();
  const units = wellInfo?.metadata?.units || 'metric';
  const vsDirection = wellInfo?.metadata?.vs_direction || 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Header Bar */}
      <Header 
        currentUser={currentUser} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar (20%) */}
        <LeftSidebar 
          activeNodeId={activeNode?.id} 
          onSelectNode={setActiveNode} 
          refreshTrigger={refreshTrigger}
          isAdmin={currentUser?.role === 'admin'}
        />

        {/* Center Workspace (60%) */}
        <main className="flex-1 flex flex-col overflow-y-auto px-6 py-4 space-y-4">
          {/* Context bar */}
          <div className="flex items-center justify-between border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur-md px-4 py-2 rounded-xl shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              {currentSlot ? (
                <>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Active Slot: {currentSlot.name}
                  </span>
                  <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    Plan: {defPlan ? defPlan.name : "None"} • Actual: {defSurvey ? defSurvey.name : "None"}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    ⚠️ Sandbox Mode
                  </span>
                  <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    Offline
                  </span>
                </>
              )}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {currentSlot ? (
                `Well Reference: ${wellInfo?.name || 'Unknown'} • VS Azimuth: ${vsDirection}°`
              ) : (
                "Select a Slot, Plan, or Survey node to load database surveys"
              )}
            </div>
          </div>

          {/* Data Tables and Plots */}
          {!currentSlot ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[300px]">
              <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">No Active Slot Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a Slot, Plan, or Actual Survey node from the left hierarchy sidebar to load the definitive planned and actual survey tables.
              </p>
            </div>
          ) : (
            <>
              {/* Stacked Tables */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="text-emerald-500 font-extrabold text-sm">★</span>
                      Definitive Plan: {defPlan ? defPlan.name : "None"}
                    </h3>
                  </div>
                  <ExcelGrid
                    nodeId={defPlan?.id || null}
                    initialPoints={planPoints}
                    unitSystem={units}
                    vsDirection={vsDirection}
                    tieIn={defPlan?.metadata?.tie_in || { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }}
                    onChange={(newPoints) => {
                      setPlanPoints(newPoints);
                    }}
                    onSaveSuccess={(newPoints) => {
                      setPlanPoints(newPoints);
                      setRefreshTrigger(prev => prev + 1);
                    }}
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="text-blue-500 font-extrabold text-sm">★</span>
                      Definitive Survey: {defSurvey ? defSurvey.name : "None"}
                    </h3>
                  </div>
                  <ExcelGrid
                    nodeId={defSurvey?.id || null}
                    initialPoints={surveyPoints}
                    unitSystem={units}
                    vsDirection={vsDirection}
                    tieIn={defSurvey?.metadata?.tie_in || { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }}
                    onChange={(newPoints) => {
                      setSurveyPoints(newPoints);
                    }}
                    onSaveSuccess={(newPoints) => {
                      setSurveyPoints(newPoints);
                      setRefreshTrigger(prev => prev + 1);
                    }}
                  />
                </div>
              </div>

              {/* Trajectory Plots */}
              <TrajectoryCharts
                planPoints={planPoints}
                actualPoints={surveyPoints}
                isDark={true}
                unitSystem={units}
              />
            </>
          )}
        </main>

        {/* Settings Sidebar (20%) */}
        <RightSidebar
          activeNode={activeNode}
          nodes={nodes}
          onUpdateSettings={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />

      </div>

      {/* Footer Bar */}
      <Footer />
    </div>
  );
}
