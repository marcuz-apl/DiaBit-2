'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import ExcelGrid from '@/components/ExcelGrid';
import TrajectoryCharts from '@/components/TrajectoryCharts';
import MetricRibbon from '@/components/MetricRibbon';
import { Layers, HelpCircle, UserCheck, Database, Disc } from 'lucide-react';

export default function Home() {
  const [nodes, setNodes] = useState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [planPoints, setPlanPoints] = useState([]);
  const [surveyPoints, setSurveyPoints] = useState([]);
  const [chartPlanPoints, setChartPlanPoints] = useState([]);
  const [chartSurveyPoints, setChartSurveyPoints] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [autoSaveMinutes, setAutoSaveMinutes] = useState(3);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(null);

  const activeNodeRef = React.useRef(activeNode);
  const nodesRef = React.useRef(nodes);
  const planPointsRef = React.useRef(planPoints);
  const surveyPointsRef = React.useRef(surveyPoints);

  React.useEffect(() => {
    activeNodeRef.current = activeNode;
  }, [activeNode]);

  React.useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  React.useEffect(() => {
    planPointsRef.current = planPoints;
  }, [planPoints]);

  React.useEffect(() => {
    surveyPointsRef.current = surveyPoints;
  }, [surveyPoints]);

  const saveNodePoints = async (nodeId, points) => {
    if (!nodeId || !points || points.length === 0) return;
    try {
      const response = await fetch(`/api/surveys/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(points.map(p => ({
          md: p.md,
          inclination: p.inclination,
          azimuth: p.azimuth
        })))
      });
      if (!response.ok) {
        console.error("Auto-save failed for node", nodeId);
      }
    } catch (e) {
      console.error("Auto-save error for node", nodeId, e);
    }
  };

  // 3-minute idle auto-save and reset focus timer for side projects
  useEffect(() => {
    let idleTimeout = null;

    const getRefCurrentSlot = () => {
      const active = activeNodeRef.current;
      const allNodes = nodesRef.current;
      if (!active || allNodes.length === 0) return null;
      const node = allNodes.find(n => n.id === active.id);
      if (!node) return null;
      if (node.type === 'slot') return node;
      if (node.type === 'trajectory' || node.type === 'survey') {
        return allNodes.find(n => n.id === node.parent_id) || null;
      }
      return null;
    };

    const isRefSideProjectActive = () => {
      const active = activeNodeRef.current;
      const allNodes = nodesRef.current;
      if (!active || allNodes.length === 0) return false;
      const slot = getRefCurrentSlot();
      if (!slot) return false;
      
      let workingWell = allNodes.find(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
      if (!workingWell) {
        workingWell = allNodes.find(n => n.type === 'well');
      }
      if (!workingWell) return false;
      
      return slot.parent_id !== workingWell.id;
    };

    const triggerAutoSaveAndSwitch = async () => {
      const active = activeNodeRef.current;
      const allNodes = nodesRef.current;
      if (!active || allNodes.length === 0) return;

      const slot = getRefCurrentSlot();
      if (!slot) return;

      console.log("Idle timeout reached for side project. Autosaving...");

      // Find children of this slot to identify plan/survey
      const children = allNodes.filter(n => n.parent_id === slot.id);
      const plans = children.filter(n => n.type === 'trajectory');
      const surveys = children.filter(n => n.type === 'survey');

      const isDef = (node) => {
        if (!node) return false;
        const meta = node.metadata;
        return meta?.is_definitive === true || meta?.is_definitive === 'true';
      };

      // Auto-save plan table node
      let planNodeToSave = null;
      if (active.type === 'trajectory') {
        planNodeToSave = active;
      } else {
        planNodeToSave = plans.find(p => isDef(p)) || plans[0] || null;
      }

      if (planNodeToSave && planPointsRef.current && planPointsRef.current.length > 0) {
        await saveNodePoints(planNodeToSave.id, planPointsRef.current);
      }

      // Auto-save survey table node
      let surveyNodeToSave = null;
      if (active.type === 'survey') {
        surveyNodeToSave = active;
      } else {
        surveyNodeToSave = surveys.find(s => isDef(s)) || surveys[0] || null;
      }

      if (surveyNodeToSave && surveyPointsRef.current && surveyPointsRef.current.length > 0) {
        await saveNodePoints(surveyNodeToSave.id, surveyPointsRef.current);
      }

      // Set focus to the working project
      let workingWell = allNodes.find(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
      if (!workingWell) {
        workingWell = allNodes.find(n => n.type === 'well');
      }

      if (workingWell) {
        const workingSlots = allNodes.filter(n => n.parent_id === workingWell.id && n.type === 'slot');
        if (workingSlots.length > 0) {
          setActiveNode(workingSlots[0]);
        } else {
          setActiveNode(workingWell);
        }
      }

      setRefreshTrigger(prev => prev + 1);
    };

    const handleActivity = () => {
      if (idleTimeout) {
        clearTimeout(idleTimeout);
      }
      if (isRefSideProjectActive()) {
        idleTimeout = setTimeout(triggerAutoSaveAndSwitch, autoSaveMinutes * 60 * 1000);
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Trigger check initially
    handleActivity();

    return () => {
      if (idleTimeout) {
        clearTimeout(idleTimeout);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [activeNode, nodes, refreshTrigger, autoSaveMinutes]);

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

  // Sync dark mode state with documentElement class list (MutationObserver)
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
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
        
        // Auto-select the working project's first slot node if no node is currently active
        if (!activeNode && data.length > 0) {
          let workingWell = data.find(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
          if (!workingWell) {
            workingWell = data.find(n => n.type === 'well');
          }

          let targetNode = null;
          if (workingWell) {
            const slots = data.filter(n => n.parent_id === workingWell.id && n.type === 'slot');
            if (slots.length > 0) {
              targetNode = slots[0];
            } else {
              targetNode = workingWell;
            }
          }

          if (!targetNode) {
            targetNode = data.find(n => n.type === 'slot');
          }

          if (targetNode) {
            setActiveNode(targetNode);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch nodes", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setAutoSaveMinutes(data.auto_save_interval || 3);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  useEffect(() => {
    loadNodes();
    fetchSettings();
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

  const getWorkingWellDefinitiveNodes = () => {
    if (nodes.length === 0) return { plan: null, survey: null };
    
    // Find working well
    let workingWell = nodes.find(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
    if (!workingWell) {
      workingWell = nodes.find(n => n.type === 'well');
    }
    if (!workingWell) return { plan: null, survey: null };

    // Find slots under this working well
    const slots = nodes.filter(n => n.parent_id === workingWell.id && n.type === 'slot');
    if (slots.length === 0) return { plan: null, survey: null };

    // Use the first slot or if one of these is currently active, use that one
    let targetSlot = slots[0];
    const activeSlot = getCurrentSlot();
    if (activeSlot && slots.some(s => s.id === activeSlot.id)) {
      targetSlot = activeSlot;
    }

    return getDefinitiveNodes(targetSlot);
  };

  const getWorkingWellSettings = () => {
    if (nodes.length === 0) return null;
    let workingWell = nodes.find(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
    if (!workingWell) {
      workingWell = nodes.find(n => n.type === 'well');
    }
    return workingWell;
  };

  const isActiveNodeUnderWorkingWell = () => {
    if (!activeNode || nodes.length === 0) return false;
    let workingWell = nodes.find(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
    if (!workingWell) {
      workingWell = nodes.find(n => n.type === 'well');
    }
    if (!workingWell) return false;
    const slot = getCurrentSlot();
    return slot && slot.parent_id === workingWell.id;
  };

  const currentSlot = getCurrentSlot();
  const { plan: defPlan, survey: defSurvey } = getDefinitiveNodes(currentSlot);
  const { plan: defPlanWorking, survey: defSurveyWorking } = getWorkingWellDefinitiveNodes();

  // Load points for active/definitive tables and charts
  useEffect(() => {
    const loadAllPoints = async () => {
      if (!currentSlot) {
        setPlanPoints([]);
        setSurveyPoints([]);
        setChartPlanPoints([]);
        setChartSurveyPoints([]);
        return;
      }

      // Determine which node is loaded in the Plan Table
      const planNodeToLoad = (activeNode && activeNode.type === 'trajectory') ? activeNode : defPlan;
      // Determine which node is loaded in the Survey Table
      const surveyNodeToLoad = (activeNode && activeNode.type === 'survey') ? activeNode : defSurvey;

      // 1. Fetch Plan Table points
      if (planNodeToLoad) {
        try {
          const res = await fetch(`/api/surveys/${planNodeToLoad.id}`);
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

      // 2. Fetch Survey Table points
      if (surveyNodeToLoad) {
        try {
          const res = await fetch(`/api/surveys/${surveyNodeToLoad.id}`);
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

      // 3. Fetch Chart Plan points (always working project definitive plan)
      if (defPlanWorking) {
        try {
          const res = await fetch(`/api/surveys/${defPlanWorking.id}`);
          if (res.ok) {
            const data = await res.json();
            setChartPlanPoints(data);
          } else {
            setChartPlanPoints([]);
          }
        } catch (e) {
          console.error("Failed to load chart plan points", e);
          setChartPlanPoints([]);
        }
      } else {
        setChartPlanPoints([]);
      }

      // 4. Fetch Chart Survey points (always working project definitive survey)
      if (defSurveyWorking) {
        try {
          const res = await fetch(`/api/surveys/${defSurveyWorking.id}`);
          if (res.ok) {
            const data = await res.json();
            setChartSurveyPoints(data);
          } else {
            setChartSurveyPoints([]);
          }
        } catch (e) {
          console.error("Failed to load chart survey points", e);
          setChartSurveyPoints([]);
        }
      } else {
        setChartSurveyPoints([]);
      }
    };

    loadAllPoints();
  }, [currentSlot, activeNode?.id, defPlan?.id, defSurvey?.id, defPlanWorking?.id, defSurveyWorking?.id, refreshTrigger]);

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

  const declination = parseFloat(wellInfo?.metadata?.declination) || 0;
  const gridConvergence = parseFloat(wellInfo?.metadata?.grid_convergence) || 0;
  const northRef = wellInfo?.metadata?.north_reference || 'grid';
  const gridConvUsed = wellInfo?.metadata?.grid_convergence_used === true || wellInfo?.metadata?.grid_convergence_used === 'true' || wellInfo?.metadata?.grid_convergence_used === 'yes';
  const totalCorrection = northRef === 'grid' && gridConvUsed ? declination - gridConvergence : declination;

  const workingWell = getWorkingWellSettings();
  const workingUnits = workingWell?.metadata?.units || 'metric';

  const lastSurveyPoint = chartSurveyPoints && chartSurveyPoints.length > 0 
    ? chartSurveyPoints[chartSurveyPoints.length - 1] 
    : null;

  const formatVal = (val, decimals = 2) => {
    if (val === undefined || val === null) return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return '—';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Header Bar */}
      <Header 
        currentUser={currentUser} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onToggleLeftSidebar={() => setMobileSidebar(prev => prev === 'left' ? null : 'left')}
        onToggleRightSidebar={() => setMobileSidebar(prev => prev === 'right' ? null : 'right')}
      />

      {/* Main Body */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        
        {/* Left Sidebar (20%) */}
        <LeftSidebar 
          activeNodeId={activeNode?.id} 
          onSelectNode={(node) => {
            setActiveNode(node);
            setMobileSidebar(null);
          }} 
          refreshTrigger={refreshTrigger}
          isAdmin={currentUser?.role === 'admin'}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
          isOpenMobile={mobileSidebar === 'left'}
          onCloseMobile={() => setMobileSidebar(null)}
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
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-3">
              {workingWell && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  👷 Working Project: {workingWell.name}
                </span>
              )}
              {currentSlot && !isActiveNodeUnderWorkingWell() && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                  ⏱️ Side Project: Auto-saves if idle for {autoSaveMinutes}m
                </span>
              )}
              <span>
                {currentSlot ? (
                  `Active Well: ${wellInfo?.name || 'Unknown'} • VS Azimuth: ${vsDirection}°`
                ) : (
                  "Select a Slot, Plan, or Survey node to load database surveys"
                )}
              </span>
            </div>
          </div>

          {/* Dashboard KPI Panel */}
          <MetricRibbon 
            planStation={planPoints.length > 0 ? planPoints[planPoints.length - 1] : null}
            surveyStation={surveyPoints.length > 0 ? surveyPoints[surveyPoints.length - 1] : null}
            unit={workingUnits}
          />

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
                      {(activeNode && activeNode.type === 'survey') ? (
                        <>
                          <span className="text-blue-500 font-extrabold text-sm">✎</span>
                          Active Survey: {activeNode.name}
                        </>
                      ) : (
                        <>
                          <span className="text-blue-500 font-extrabold text-sm">★</span>
                          Definitive Survey: {defSurvey ? defSurvey.name : "None"}
                        </>
                      )}
                    </h3>
                  </div>
                  <ExcelGrid
                    nodeId={(activeNode && activeNode.type === 'survey') ? activeNode.id : (defSurvey?.id || null)}
                    initialPoints={surveyPoints}
                    unitSystem={units}
                    vsDirection={vsDirection}
                    tieIn={((activeNode && activeNode.type === 'survey') ? activeNode.metadata?.tie_in : defSurvey?.metadata?.tie_in) || { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }}
                    totalCorrection={totalCorrection}
                    onChange={(newPoints) => {
                      setSurveyPoints(newPoints);
                    }}
                    onSaveSuccess={(newPoints) => {
                      setSurveyPoints(newPoints);
                      setRefreshTrigger(prev => prev + 1);
                    }}
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm group">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                      {(activeNode && activeNode.type === 'trajectory') ? (
                        <>
                          <span className="text-blue-500 font-extrabold text-sm">✎</span>
                          Active Plan: {activeNode.name}
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-500 font-extrabold text-sm">★</span>
                          Definitive Plan: {defPlan ? defPlan.name : "None"}
                        </>
                      )}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium group-hover:hidden">Hover to expand</span>
                  </div>
                  <div className="hidden group-hover:block mt-3">
                    <ExcelGrid
                      nodeId={(activeNode && activeNode.type === 'trajectory') ? activeNode.id : (defPlan?.id || null)}
                      initialPoints={planPoints}
                      unitSystem={units}
                      vsDirection={vsDirection}
                      tieIn={((activeNode && activeNode.type === 'trajectory') ? activeNode.metadata?.tie_in : defPlan?.metadata?.tie_in) || { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }}
                      totalCorrection={0}
                      onChange={(newPoints) => {
                        setPlanPoints(newPoints);
                      }}
                      onSaveSuccess={(newPoints) => {
                        setPlanPoints(newPoints);
                        setRefreshTrigger(prev => prev + 1);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Trajectory Plots */}
              <TrajectoryCharts
                planPoints={(activeNode && activeNode.type === 'trajectory' && isActiveNodeUnderWorkingWell()) ? planPoints : chartPlanPoints}
                actualPoints={(activeNode && activeNode.type === 'survey' && isActiveNodeUnderWorkingWell()) ? surveyPoints : chartSurveyPoints}
                isDark={isDarkMode}
                unitSystem={workingUnits}
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
          isOpenMobile={mobileSidebar === 'right'}
          onCloseMobile={() => setMobileSidebar(null)}
        />

      </div>

      {/* Footer Bar */}
      <Footer />
    </div>
  );
}
