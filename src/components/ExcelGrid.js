'use client';

import React, { useState, useEffect, useRef } from 'react';
import { calculateSurvey } from '@/lib/mcm';
import { Plus, Trash, ArrowDown, FileSpreadsheet, Download, Upload, Save, Play } from 'lucide-react';

// Helper to format values safely in the spreadsheet
function formatVal(val, decimals = 2) {
  if (val === undefined || val === null) return '-';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? '-' : num.toFixed(decimals);
}

export default function ExcelGrid({
  nodeId,
  initialPoints = [],
  unitSystem = 'metric',
  vsDirection = 0,
  tieIn = { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 },
  onChange = () => {},
  onSaveSuccess = () => {}
}) {
  const [points, setPoints] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize and calculate when props change
  useEffect(() => {
    if (initialPoints && initialPoints.length > 0) {
      // Map initial points to ensure they have closureDist and closureAz computed as numbers
      const mapped = initialPoints.map(p => {
        const east = typeof p.east === 'number' ? p.east : parseFloat(p.east) || 0;
        const north = typeof p.north === 'number' ? p.north : parseFloat(p.north) || 0;
        
        let cDist = p.closureDist;
        if (cDist === undefined || cDist === null) {
          cDist = Math.sqrt(east * east + north * north);
        }
        
        let cAz = p.closureAz;
        if (cAz === undefined || cAz === null) {
          cAz = (Math.atan2(east, north) * 180) / Math.PI;
          if (cAz < 0) {
            cAz += 360;
          }
        }
        
        return {
          ...p,
          closureDist: typeof cDist === 'number' ? cDist : parseFloat(cDist) || 0,
          closureAz: typeof cAz === 'number' ? cAz : parseFloat(cAz) || 0
        };
      });
      setPoints(mapped);
    } else {
      // Default initial point (tie-in station)
      const defaultStart = {
        md: tieIn.md,
        inclination: tieIn.inc,
        azimuth: tieIn.az,
        tvd: tieIn.tvd,
        north: tieIn.north,
        east: tieIn.east,
        dls: 0,
        vs: 0,
        closureDist: 0,
        closureAz: 0
      };
      setPoints([defaultStart]);
    }
  }, [initialPoints, tieIn]);

  // Recalculates all points based on current MD, Inc, Az inputs
  const triggerRecalculate = (currentPoints) => {
    const rawInputs = currentPoints.map(p => ({
      md: parseFloat(p.md) || 0,
      inc: parseFloat(p.inclination) || 0,
      az: parseFloat(p.azimuth) || 0
    }));

    const calculated = calculateSurvey(
      rawInputs,
      tieIn,
      vsDirection,
      unitSystem === 'imperial' ? 'imperial' : 'metric'
    );

    // Map back into grid format
    const mapped = calculated.map((c, idx) => ({
      md: c.md,
      inclination: c.inc,
      azimuth: c.az,
      tvd: c.tvd,
      north: c.north,
      east: c.east,
      dls: c.dls,
      vs: c.vs,
      closureDist: c.closureDist,
      closureAz: c.closureAz
    }));

    setPoints(mapped);
    onChange(mapped);
    return mapped;
  };

  const handleCellChange = (index, field, value) => {
    const updated = [...points];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setPoints(updated);

    // Recalculate on-the-fly if values are numeric
    if (!isNaN(parseFloat(value))) {
      triggerRecalculate(updated);
    }
  };

  const handleAppendRow = () => {
    const lastRow = points[points.length - 1] || { md: 0, inclination: 0, azimuth: 0 };
    const newMD = lastRow.md + 100; // Increment default MD by 100
    const newRow = {
      md: newMD,
      inclination: lastRow.inclination,
      azimuth: lastRow.azimuth,
      tvd: 0,
      north: 0,
      east: 0,
      dls: 0,
      vs: 0,
      closureDist: 0,
      closureAz: 0
    };
    const updated = [...points, newRow];
    setPoints(updated);
    triggerRecalculate(updated);
    setSelectedIndex(updated.length - 1);
  };

  const handleInsertRow = () => {
    const insertIdx = selectedIndex !== null ? selectedIndex : points.length;
    const prevRow = points[insertIdx - 1] || { md: 0, inclination: 0, azimuth: 0 };
    const nextRow = points[insertIdx] || { md: prevRow.md + 200, inclination: prevRow.inclination, azimuth: prevRow.azimuth };
    
    // Interpolate measured depth
    const newMD = Math.round((prevRow.md + nextRow.md) / 2);
    const newRow = {
      md: newMD,
      inclination: prevRow.inclination,
      azimuth: prevRow.azimuth,
      tvd: 0,
      north: 0,
      east: 0,
      dls: 0,
      vs: 0,
      closureDist: 0,
      closureAz: 0
    };

    const updated = [...points];
    updated.splice(insertIdx, 0, newRow);
    setPoints(updated);
    triggerRecalculate(updated);
    setSelectedIndex(insertIdx);
  };

  const handleDeleteRow = () => {
    if (points.length <= 1) return; // Must have at least tie-in row
    const deleteIdx = selectedIndex !== null ? selectedIndex : points.length - 1;
    if (deleteIdx === 0) return; // Cannot delete the tie-in station at 0 index

    const updated = points.filter((_, idx) => idx !== deleteIdx);
    setPoints(updated);
    triggerRecalculate(updated);
    setSelectedIndex(Math.max(0, deleteIdx - 1));
  };

  const handleClearAll = () => {
    const tieInRow = points[0] || {
      md: tieIn.md,
      inclination: tieIn.inc,
      azimuth: tieIn.az,
      tvd: tieIn.tvd,
      north: tieIn.north,
      east: tieIn.east,
      dls: 0,
      vs: 0,
      closureDist: 0,
      closureAz: 0
    };
    const updated = [tieInRow];
    setPoints(updated);
    setSelectedIndex(0);
    onChange(updated);
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Station,Measured Depth,Inclination,Azimuth,TVD,Northing,Easting,DLS,Vertical Section\n";
    
    points.forEach((p, idx) => {
      csvContent += `${idx},${p.md},${p.inclination},${p.azimuth},${p.tvd},${p.north},${p.east},${p.dls},${p.vs}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `survey_node_${nodeId || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger file select dialog for CSV import
  const handleImportTrigger = () => {
    fileInputRef.current.click();
  };

  // Parse imported CSV
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/);
      const parsedPoints = [];

      lines.forEach((line) => {
        if (!line.trim()) return;
        const cols = line.split(/[,\t;]/).map(c => c.trim());
        
        // Skip header lines (non-numeric for first columns)
        const firstColVal = parseFloat(cols[0]);
        const secondColVal = parseFloat(cols[1]);
        const thirdColVal = parseFloat(cols[2]);

        // If the CSV structure is: MD, Inclination, Azimuth
        if (!isNaN(firstColVal) && !isNaN(secondColVal) && !isNaN(thirdColVal)) {
          // If 1st column is index, skip it and parse columns 1, 2, 3 as MD, Inc, Az
          // If first column is Measured Depth directly, we use column 0, 1, 2.
          if (cols.length >= 4 && !isNaN(parseFloat(cols[1]))) {
            parsedPoints.push({
              md: parseFloat(cols[1]),
              inclination: parseFloat(cols[2]),
              azimuth: parseFloat(cols[3])
            });
          } else {
            parsedPoints.push({
              md: firstColVal,
              inclination: secondColVal,
              azimuth: thirdColVal
            });
          }
        }
      });

      if (parsedPoints.length > 0) {
        // Run MCM calculation on imported raw points
        const calculated = triggerRecalculate(parsedPoints);
        setPoints(calculated);
      } else {
        alert("Could not parse CSV. Ensure it has columns: MD, Inclination, Azimuth (or Index, MD, Inc, Az).");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset file input
  };

  // Save to DB
  const handleSaveToDB = async () => {
    if (!nodeId) return;
    setIsSaving(true);
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
        const err = await response.json();
        throw new Error(err.error || "Failed to save");
      }

      const savedData = await response.json();
      // Update local grid with backend calculated and saved values
      const mapped = savedData.map(p => ({
        md: p.md,
        inclination: p.inclination,
        azimuth: p.azimuth,
        tvd: p.tvd,
        north: p.north,
        east: p.east,
        dls: p.dls,
        vs: p.vs,
        closureDist: parseFloat(Math.sqrt(p.east * p.east + p.north * p.north).toFixed(4)),
        closureAz: parseFloat((((180 * Math.atan2(p.east, p.north) / Math.PI) + 360) % 360).toFixed(4))
      }));
      setPoints(mapped);
      onSaveSuccess(mapped);
    } catch (e) {
      alert(`Save error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const lenUnit = unitSystem === 'imperial' ? 'ft' : 'm';
  const dlsUnitLabel = unitSystem === 'imperial' ? '°/100ft' : '°/30m';

  return (
    <div className="flex flex-col h-[350px] shrink-0 rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur-md overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80 gap-2">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <FileSpreadsheet className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-sm">Survey Grid ({unitSystem === 'imperial' ? 'Imperial' : 'Metric'})</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Action buttons */}
          <button
            onClick={handleAppendRow}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Append
          </button>
          
          <button
            onClick={handleInsertRow}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Insert
          </button>
          
          <button
            onClick={handleDeleteRow}
            disabled={points.length <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/80 transition disabled:opacity-50"
          >
            <Trash className="h-3.5 w-3.5" />
            Delete
          </button>

          <button
            onClick={handleClearAll}
            className="px-2.5 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            Clear All
          </button>
          
          <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Import/Export */}
          <button
            onClick={handleImportTrigger}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv,.txt"
            className="hidden"
          />

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            onClick={handleSaveToDB}
            disabled={isSaving || !nodeId}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 transition font-medium disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save to DB"}
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto max-h-[350px] md:max-h-[450px]">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead>
            <tr className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-center divide-x divide-slate-200 dark:divide-slate-800">
              <th className="py-2 px-2 w-10">Stn</th>
              <th className="py-2 px-3">MD ({lenUnit})</th>
              <th className="py-2 px-3">Inc (°)</th>
              <th className="py-2 px-3">Az (°)</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40">TVD ({lenUnit})</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40">Northing ({lenUnit})</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40">Easting ({lenUnit})</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40">DLS ({dlsUnitLabel})</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40">VS ({lenUnit})</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40 font-normal">Closure Dist</th>
              <th className="py-2 px-3 bg-slate-100/50 dark:bg-slate-800/40 font-normal">Closure Az</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 divide-x divide-slate-100 dark:divide-slate-800/60">
            {points.map((p, idx) => {
              const isSelected = selectedIndex === idx;
              const isTieIn = idx === 0;

              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/10 cursor-pointer text-center ${
                    isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Station index */}
                  <td className="py-1.5 px-2 bg-slate-50 dark:bg-slate-900/80 font-medium text-slate-500 dark:text-slate-400">
                    {idx}
                  </td>
                  
                  {/* MD Input */}
                  <td className="p-0">
                    <input
                      type="number"
                      value={p.md}
                      disabled={isTieIn}
                      onChange={(e) => handleCellChange(idx, 'md', e.target.value)}
                      className={`w-full py-1.5 px-3 text-right bg-transparent border-none ${
                        isTieIn ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    />
                  </td>

                  {/* Inclination Input */}
                  <td className="p-0">
                    <input
                      type="number"
                      value={p.inclination}
                      disabled={isTieIn}
                      step="0.01"
                      onChange={(e) => handleCellChange(idx, 'inclination', e.target.value)}
                      className={`w-full py-1.5 px-3 text-right bg-transparent border-none ${
                        isTieIn ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    />
                  </td>

                  {/* Azimuth Input */}
                  <td className="p-0">
                    <input
                      type="number"
                      value={p.azimuth}
                      disabled={isTieIn}
                      step="0.01"
                      onChange={(e) => handleCellChange(idx, 'azimuth', e.target.value)}
                      className={`w-full py-1.5 px-3 text-right bg-transparent border-none ${
                        isTieIn ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    />
                  </td>

                  {/* Calculated columns (grey background, non-editable) */}
                  <td className="py-1.5 px-3 text-right bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400">
                    {formatVal(p.tvd, 2)}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400">
                    {formatVal(p.north, 2)}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400">
                    {formatVal(p.east, 2)}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 font-medium">
                    {formatVal(p.dls, 2)}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400">
                    {formatVal(p.vs, 2)}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-slate-50/80 dark:bg-slate-900/10 text-slate-500 dark:text-slate-500">
                    {formatVal(p.closureDist, 2)}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-slate-50/80 dark:bg-slate-900/10 text-slate-500 dark:text-slate-500">
                    {formatVal(p.closureAz, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Bottom Info bar */}
      <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
        <div>
          {points.length} Stations in grid • Tie-in MD: {tieIn.md} {lenUnit}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready
        </div>
      </div>
    </div>
  );
}
