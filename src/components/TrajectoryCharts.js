'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly with server-side rendering disabled
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading Plotly Engines...</p>
      </div>
    </div>
  ),
});

export default function TrajectoryCharts({ planPoints = [], actualPoints = [], isDark = true, unitSystem = 'metric' }) {
  const [mounted, setMounted] = useState(false);
  const [fullScreenId, setFullScreenId] = useState(null);
  const containerRef = useRef(null);

  const getContainerClass = (id) => {
    const base = "rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur-md flex flex-col transition-all duration-300 aspect-square";
    if (fullScreenId === id) {
      return `fixed inset-0 m-auto z-[100] p-4 max-h-[90vh] max-w-[90vw] ${base}`;
    }
    if (fullScreenId && fullScreenId !== id) {
      return "hidden";
    }
    return `p-3 w-full ${base}`;
  };

  const toggleFullScreen = (id) => {
    setFullScreenId(prev => prev === id ? null : id);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;

    let debounceTimer;
    const resizeObserver = new ResizeObserver(() => {
      // Trigger a window resize event so Plotly knows to recalculate sizes
      // Debounced to prevent Plotly throwing "DOM element null" before it finishes mounting
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          window.dispatchEvent(new Event('resize'));
        } catch (e) {
          // Ignore plotly internal resize errors
        }
      }, 150);
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [mounted]);

  if (!mounted) return null;

  const len = unitSystem === 'imperial' ? 'ft' : 'm';

  // Common styling tokens
  const bgColor = isDark ? '#090d16' : '#fafbfc';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const planColor = '#10b981'; // Emerald Green
  const actualColor = '#3b82f6'; // Bright Blue

  // 1. Prepare data for 3D Plot
  const plan3D = {
    x: planPoints.map(p => p.east),
    y: planPoints.map(p => p.north),
    z: planPoints.map(p => p.tvd),
    type: 'scatter3d',
    mode: 'lines+markers',
    name: `Plan (${planPoints.length} pts)`,
    line: { color: planColor, width: 4 },
    marker: { size: 3, color: planColor },
  };

  const actual3D = {
    x: actualPoints.map(p => p.east),
    y: actualPoints.map(p => p.north),
    z: actualPoints.map(p => p.tvd),
    type: 'scatter3d',
    mode: 'lines+markers',
    name: `Actual (${actualPoints.length} pts)`,
    line: { color: actualColor, width: 4 },
    marker: { size: 3, color: actualColor },
  };

  const data3D = [];
  if (planPoints.length > 0) data3D.push(plan3D);
  if (actualPoints.length > 0) data3D.push(actual3D);

  const layout3D = {
    title: { text: `3D Trajectory (${len})`, font: { color: textColor, size: 14 } },
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 30 },
    paper_bgcolor: bgColor,
    scene: {
      xaxis: {
        title: `Easting (${len})`,
        gridcolor: gridColor,
        backgroundcolor: bgColor,
        showbackground: true,
        tickfont: { color: textColor },
        titlefont: { color: textColor },
      },
      yaxis: {
        title: `Northing (${len})`,
        gridcolor: gridColor,
        backgroundcolor: bgColor,
        showbackground: true,
        tickfont: { color: textColor },
        titlefont: { color: textColor },
      },
      zaxis: {
        title: `TVD (${len})`,
        gridcolor: gridColor,
        backgroundcolor: bgColor,
        showbackground: true,
        tickfont: { color: textColor },
        titlefont: { color: textColor },
        autorange: 'reversed', // Depth increases downwards
      },
    },
    legend: { x: 0, y: 1, font: { color: textColor } },
  };

  // 2. Prepare data for Plan View (Easting vs Northing)
  const plan2D_Plan = {
    x: planPoints.map(p => p.east),
    y: planPoints.map(p => p.north),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Plan',
    line: { color: planColor, width: 3 },
    marker: { size: 4 },
  };

  const actual2D_Plan = {
    x: actualPoints.map(p => p.east),
    y: actualPoints.map(p => p.north),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Actual',
    line: { color: actualColor, width: 3 },
    marker: { size: 4 },
  };

  const dataPlanView = [];
  if (planPoints.length > 0) dataPlanView.push(plan2D_Plan);
  if (actualPoints.length > 0) dataPlanView.push(actual2D_Plan);

  const layoutPlanView = {
    title: { text: `Plan View (E vs N, ${len})`, font: { color: textColor, size: 14 } },
    autosize: true,
    margin: { l: 50, r: 20, b: 50, t: 40 },
    paper_bgcolor: bgColor,
    plot_bgcolor: bgColor,
    xaxis: {
      title: `Easting (${len})`,
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickfont: { color: textColor },
      titlefont: { color: textColor },
    },
    yaxis: {
      title: `Northing (${len})`,
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickfont: { color: textColor },
      titlefont: { color: textColor },
      scaleanchor: 'x', // Maintain 1:1 aspect ratio
    },
    legend: { x: 0, y: 1, font: { color: textColor } },
  };

  // 3. Prepare data for Vertical Section View (VS vs TVD)
  const plan2D_VS = {
    x: planPoints.map(p => p.vs),
    y: planPoints.map(p => p.tvd),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Plan',
    line: { color: planColor, width: 3 },
    marker: { size: 4 },
  };

  const actual2D_VS = {
    x: actualPoints.map(p => p.vs),
    y: actualPoints.map(p => p.tvd),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Actual',
    line: { color: actualColor, width: 3 },
    marker: { size: 4 },
  };

  const dataVS = [];
  if (planPoints.length > 0) dataVS.push(plan2D_VS);
  if (actualPoints.length > 0) dataVS.push(actual2D_VS);

  const layoutVS = {
    title: { text: `Vertical Section (VS vs TVD, ${len})`, font: { color: textColor, size: 14 } },
    autosize: true,
    margin: { l: 50, r: 20, b: 50, t: 40 },
    paper_bgcolor: bgColor,
    plot_bgcolor: bgColor,
    xaxis: {
      title: `Vertical Section (${len})`,
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickfont: { color: textColor },
      titlefont: { color: textColor },
    },
    yaxis: {
      title: `True Vertical Depth (${len})`,
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickfont: { color: textColor },
      titlefont: { color: textColor },
      autorange: 'reversed', // TVD depth goes down
    },
    legend: { x: 0, y: 1, font: { color: textColor } },
  };

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      {/* 3D Plot */}
      <div 
        className={getContainerClass('3d')}
        onDoubleClickCapture={() => toggleFullScreen('3d')}
        title="Double click to toggle fullscreen"
      >
        <Plot
          data={data3D}
          layout={layout3D}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%', flex: 1 }}
          config={{ responsive: true, displaylogo: false }}
        />
      </div>

      {/* Plan View Plot */}
      <div 
        className={getContainerClass('plan')}
        onDoubleClickCapture={() => toggleFullScreen('plan')}
        title="Double click to toggle fullscreen"
      >
        <Plot
          data={dataPlanView}
          layout={layoutPlanView}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%', flex: 1 }}
          config={{ responsive: true, displaylogo: false }}
        />
      </div>

      {/* Vertical Section Plot */}
      <div 
        className={getContainerClass('vs')}
        onDoubleClickCapture={() => toggleFullScreen('vs')}
        title="Double click to toggle fullscreen"
      >
        <Plot
          data={dataVS}
          layout={layoutVS}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%', flex: 1 }}
          config={{ responsive: true, displaylogo: false }}
        />
      </div>

      {/* Overlay backdrop when fullscreen */}
      {fullScreenId && (
        <div 
          className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm cursor-pointer"
          onClick={() => toggleFullScreen(fullScreenId)}
        />
      )}
    </div>
  );
}
