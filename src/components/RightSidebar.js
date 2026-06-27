'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, Map, Compass, Sliders, Menu, ChevronRight, ChevronLeft } from 'lucide-react';

export default function RightSidebar({
  activeNode,
  nodes = [],
  onUpdateSettings = () => {}
}) {
  const [wellNode, setWellNode] = useState(null);
  const [units, setUnits] = useState('metric');
  const [vsDirection, setVsDirection] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [easting, setEasting] = useState(0);
  const [northing, setNorthing] = useState(0);

  // New calculation settings
  const [crs, setCrs] = useState('');
  const [gridConvergence, setGridConvergence] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [surveyMethod, setSurveyMethod] = useState('Minimum Curvature / Lubinski');
  const [datum, setDatum] = useState('KB');
  const [refElevation, setRefElevation] = useState(0);
  const [glElevation, setGlElevation] = useState(0);
  const [declination, setDeclination] = useState(0);
  const [gravityField, setGravityField] = useState(980.665);
  const [gravityModel, setGravityModel] = useState('WGS84');
  const [magneticField, setMagneticField] = useState(50000);
  const [magneticDip, setMagneticDip] = useState(60);
  const [declinationDate, setDeclinationDate] = useState('');
  const [magneticModel, setMagneticModel] = useState('HDGM 2025');
  const [northReference, setNorthReference] = useState('grid');
  const [gridConvergenceUsed, setGridConvergenceUsed] = useState(true);

  // States for reference models from API
  const [gravityModels, setGravityModels] = useState([]);
  const [magneticModels, setMagneticModels] = useState([]);

  // CRS registry state
  const [crsOptions, setCrsOptions] = useState([]);
  const [selectedCrsObj, setSelectedCrsObj] = useState(null);
  const [isFetchingGeo, setIsFetchingGeo] = useState(false);

  // States for save confirmation messages in client UI
  const [saveMessage, setSaveMessage] = useState(null);
  const [saveError, setSaveError] = useState(false);

  // Fetch reference field models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          setGravityModels(data.gravity || []);
          setMagneticModels(data.magnetic || []);
        }
      } catch (err) {
        console.error('Failed to fetch reference models', err);
      }
    };
    fetchModels();
  }, []);

  // Fetch CRS options (filtered by the current crs text the user is typing)
  useEffect(() => {
    const fetchCrs = async () => {
      try {
        const q = (crs || '').trim();
        const res = await fetch(`/api/crs${q ? '?q=' + encodeURIComponent(q) : ''}`);
        if (res.ok) setCrsOptions(await res.json());
      } catch (_) {}
    };
    fetchCrs();
  }, [crs]);

  // Sync selectedCrsObj when the crs string matches an option in the list
  useEffect(() => {
    if (!crs || crsOptions.length === 0) return;
    let match = crsOptions.find(c => c.name === crs);
    if (!match) {
      // Forgiving match for legacy strings like "UTM Zone 14N" -> "UTM Zone 14N (WGS84)"
      match = crsOptions.find(c => c.name.toLowerCase().includes(crs.toLowerCase()));
    }
    if (match && (!selectedCrsObj || selectedCrsObj.id !== match.id)) {
      setSelectedCrsObj(match);
    }
  }, [crs, crsOptions]);

  // Auto UTM → Lat/Lon when easting, northing, or CRS selection changes
  useEffect(() => {
    if (!selectedCrsObj || selectedCrsObj.projection !== 'utm') return;
    const e = parseFloat(easting);
    const n = parseFloat(northing);
    if (isNaN(e) || isNaN(n)) return;

    let cancelled = false;
    const convert = async () => {
      try {
        setIsFetchingGeo(true);
        const url = `/api/geo?type=utm&easting=${e}&northing=${n}&zone=${selectedCrsObj.zone}&hemisphere=${selectedCrsObj.hemisphere || 'N'}`;
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.lat !== undefined) {
          setLatitude(parseFloat(data.lat.toFixed(6)));
          setLongitude(parseFloat(data.lon.toFixed(6)));
          setGridConvergence(parseFloat(data.convergence.toFixed(4)));
          setScaleFactor(parseFloat(data.scaleFactor.toFixed(6)));
        }
      } catch (_) {}
      finally { if (!cancelled) setIsFetchingGeo(false); }
    };

    const timer = setTimeout(convert, 600); // debounce 600ms
    return () => { cancelled = true; clearTimeout(timer); };
  }, [easting, northing, selectedCrsObj]);

  // Tie-in settings (specific to trajectory metadata or defaults)
  const [tieInMd, setTieInMd] = useState(0);
  const [tieInInc, setTieInInc] = useState(0);
  const [tieInAz, setTieInAz] = useState(0);
  const [tieInTvd, setTieInTvd] = useState(0);
  const [tieInNorth, setTieInNorth] = useState(0);
  const [tieInEast, setTieInEast] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  
  // Collapse/Autohide state
  const [isOpen, setIsOpen] = useState(true);
  const idleTimerRef = useRef(null);

  // Autohide idle logic: 30 seconds of inactivity collapses the sidebar
  useEffect(() => {
    let hasInteracted = false;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      
      idleTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 30000); // 30 seconds
    };

    const handleUserActivity = () => {
      hasInteracted = true;
      resetIdleTimer();
    };

    // Listen to mouse movement and inputs
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    
    // We do NOT call resetIdleTimer() on mount to keep sidebars displayed on reload/refresh

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, []);

  // Locate the well node in the hierarchy whenever activeNode changes
  useEffect(() => {
    if (!activeNode || nodes.length === 0) {
      setWellNode(null);
      return;
    }

    // Set sidebar open when activeNode changes
    setIsOpen(true);

    // Climb: Active Node -> Parent -> Well
    const active = nodes.find(n => n.id === activeNode.id);
    if (!active) return;

    let well = null;
    if (active.type === 'trajectory' || active.type === 'survey') {
      const slotNode = nodes.find(n => n.id === active.parent_id);
      if (slotNode) {
        well = nodes.find(n => n.id === slotNode.parent_id);
      }
    } else if (active.type === 'slot') {
      well = nodes.find(n => n.id === active.parent_id);
    } else if (active.type === 'well') {
      well = active;
    }

    if (well && well.type === 'well') {
      setWellNode(well);
      
      const meta = well.metadata || {};
      setUnits(meta.units || 'metric');
      setVsDirection(meta.vs_direction || 0);
      setElevation(meta.elevation || 0);
      setLatitude(meta.latitude || 0);
      setLongitude(meta.longitude || 0);
      setEasting(meta.easting || 0);
      setNorthing(meta.northing || 0);

      setCrs(meta.crs || '');
      setGridConvergence(meta.grid_convergence || 0);
      setScaleFactor(meta.scale_factor || 1.0);
      setSurveyMethod(meta.survey_method || 'Minimum Curvature / Lubinski');
      setDatum(meta.datum || 'KB');
      setRefElevation(meta.ref_elevation || 0);
      setGlElevation(meta.gl_elevation || 0);
      setDeclination(meta.declination || 0);
      setGravityField(meta.gravity_field || 980.665);
      setGravityModel(meta.gravity_model || 'WGS84');
      setMagneticField(meta.magnetic_field || 50000);
      setMagneticDip(meta.magnetic_dip || 60);
      setDeclinationDate(meta.declination_date || '');
      setMagneticModel(meta.magnetic_model || 'HDGM 2025');
      setNorthReference(meta.north_reference || 'grid');
      setGridConvergenceUsed(
        meta.grid_convergence_used !== undefined
          ? (meta.grid_convergence_used === true || meta.grid_convergence_used === 'true' || meta.grid_convergence_used === 'yes')
          : true
      );

      // Trajectory specific tie-in settings (only applicable to trajectory or survey)
      if (active.type === 'trajectory' || active.type === 'survey') {
        const trajMeta = active.metadata || {};
        const tie = trajMeta.tie_in || { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 };
        setTieInMd(tie.md || 0);
        setTieInInc(tie.inc || 0);
        setTieInAz(tie.az || 0);
        setTieInTvd(tie.tvd || 0);
        setTieInNorth(tie.north || 0);
        setTieInEast(tie.east || 0);
      } else {
        // Clear tie-in settings for well/slot levels
        setTieInMd(0);
        setTieInInc(0);
        setTieInAz(0);
        setTieInTvd(0);
        setTieInNorth(0);
        setTieInEast(0);
      }
    } else {
      setWellNode(null);
    }
  }, [activeNode, nodes]);

  const handleAutofillMagnetic = async () => {
    if (!latitude || !longitude) {
      alert("Please ensure Latitude and Longitude are computed first.");
      return;
    }
    try {
      setIsSaving(true);
      const url = `/api/geo?type=magnetic&lat=${latitude}&lon=${longitude}&alt=${elevation || 0}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.declination !== undefined) setDeclination(data.declination);
        if (data.dip !== undefined) setMagneticDip(data.dip);
        if (data.total_field !== undefined) setMagneticField(data.total_field);
        setSaveMessage(`Magnetic parameters fetched from ${data.source}`);
        setSaveError(false);
        setTimeout(() => setSaveMessage(null), 3000);
        // Auto-save the fetched values immediately
        setTimeout(handleSaveSettings, 500);
      } else {
        throw new Error("API returned an error");
      }
    } catch (err) {
      setSaveMessage("Failed to fetch magnetic parameters");
      setSaveError(true);
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-compute Gravity when Latitude or Elevation changes
  useEffect(() => {
    if (latitude === 0 && longitude === 0) return; // Don't run on blank start
    const lat = parseFloat(latitude);
    const alt = parseFloat(elevation) || 0;
    if (isNaN(lat)) return;

    let cancelled = false;
    const fetchGravity = async () => {
      try {
        const res = await fetch(`/api/geo?type=gravity&lat=${lat}&alt=${alt}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.gravity_mGal) {
          setGravityField(data.gravity_mGal);
        }
      } catch (e) {}
    };
    const t = setTimeout(fetchGravity, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [latitude, elevation]);

  const handleAutofillGravity = () => {
    // This is handled automatically by the useEffect above now.
    // Retaining this for UI button mapping if it still exists.
  };

  const handleSaveSettings = async () => {
    if (!wellNode || !activeNode) return;
    setIsSaving(true);

    try {
      // 1. Update Well metadata
      const wellMetaUpdate = {
        units,
        vs_direction: parseFloat(vsDirection) || 0,
        elevation: parseFloat(elevation) || 0,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        easting: parseFloat(easting) || 0,
        northing: parseFloat(northing) || 0,
        crs,
        grid_convergence: parseFloat(gridConvergence) || 0,
        scale_factor: parseFloat(scaleFactor) || 1.0,
        survey_method: surveyMethod,
        datum,
        ref_elevation: parseFloat(refElevation) || 0,
        gl_elevation: parseFloat(glElevation) || 0,
        declination: parseFloat(declination) || 0,
        gravity_field: parseFloat(gravityField) || 980.665,
        gravity_model: gravityModel,
        magnetic_field: parseFloat(magneticField) || 50000,
        magnetic_dip: parseFloat(magneticDip) || 60,
        declination_date: declinationDate,
        magnetic_model: magneticModel,
        north_reference: northReference,
        grid_convergence_used: gridConvergenceUsed
      };

      const wellRes = await fetch(`/api/nodes/${wellNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: wellMetaUpdate })
      });

      if (!wellRes.ok) throw new Error("Failed to update well settings");

      // 2. Update Trajectory/Survey tie-in metadata (if activeNode is trajectory/survey)
      if (activeNode.type === 'trajectory' || activeNode.type === 'survey') {
        const trajMetaUpdate = {
          tie_in: {
            md: parseFloat(tieInMd) || 0,
            inc: parseFloat(tieInInc) || 0,
            az: parseFloat(tieInAz) || 0,
            tvd: parseFloat(tieInTvd) || 0,
            north: parseFloat(tieInNorth) || 0,
            east: parseFloat(tieInEast) || 0
          }
        };

        const trajRes = await fetch(`/api/nodes/${activeNode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: trajMetaUpdate })
        });

        if (!trajRes.ok) throw new Error("Failed to update trajectory settings");
      }

      // Trigger app refresh
      onUpdateSettings();
      setSaveMessage('Settings saved — recalculating directional path...');
      setSaveError(false);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (e) {
      setSaveMessage('Error: ' + e.message);
      setSaveError(true);
      setTimeout(() => setSaveMessage(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  const lenLabel = units === 'imperial' ? 'ft' : 'm';

  return (
    <div 
      className={`relative h-full border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur-md transition-all duration-300 z-30 flex flex-col shrink-0 ${
        isOpen ? 'w-64' : 'w-4'
      }`}
    >
      {/* Expand hover trigger for Right edge */}
      {!isOpen && (
        <div 
          onMouseEnter={() => setIsOpen(true)}
          className="absolute top-0 right-0 w-4 h-full cursor-pointer hover:bg-blue-500/10 transition flex items-center justify-center text-slate-400 hover:text-blue-500"
        >
          <Menu className="h-4 w-4" />
        </div>
      )}

      {/* Main Settings Panel Content */}
      <div className={`flex flex-col h-full overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {!activeNode || !wellNode ? (
          <div className="h-full p-4 flex flex-col justify-center items-center text-center text-slate-400 text-xs">
            <Settings className="h-8 w-8 mb-2 text-slate-300 dark:text-slate-700 animate-spin-slow" />
            Select a Trajectory Plan or Deviation Survey to configure settings.
          </div>
        ) : (
          <div className="flex flex-col h-full p-4 overflow-y-auto">
            {/* Header section with collapse toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-sm">Calculation Settings</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Config Fields */}
            <div className="flex-1 space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* Section 1: General & Calculation Parameters */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  <Compass className="h-3.5 w-3.5 text-blue-400" />
                  General & Calculation
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400">Unit System</label>
                  <select
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="metric">Metric (meters, deg/30m)</option>
                    <option value="imperial">Imperial (feet, deg/100ft)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400">Survey Computation Method</label>
                  <select
                    value={surveyMethod}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-805 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  >
                    <option value="Minimum Curvature / Lubinski">Minimum Curvature / Lubinski</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400">Vertical Section Azimuth (° Azimuth)</label>
                  <input
                    type="number"
                    value={vsDirection}
                    onChange={(e) => setVsDirection(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400">North Reference</label>
                  <select
                    value={northReference}
                    onChange={(e) => setNorthReference(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="grid">Grid North</option>
                    <option value="true">True North</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400">Grid Convergence Used</label>
                  <select
                    value={gridConvergenceUsed ? 'yes' : 'no'}
                    onChange={(e) => setGridConvergenceUsed(e.target.value === 'yes')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="space-y-1 bg-blue-500/10 border border-blue-500/20 rounded p-2 mt-1">
                  <label className="block text-[9px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">Total Correction (Mag → Grid)</label>
                  <div className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {((northReference === 'grid' && gridConvergenceUsed) ? (parseFloat(declination) || 0) - (parseFloat(gridConvergence) || 0) : (parseFloat(declination) || 0)).toFixed(4)}°
                  </div>
                </div>
              </div>

              {/* Section 2: Wellhead Reference & CRS */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  <Map className="h-3.5 w-3.5 text-blue-400" />
                  Wellhead Location & CRS
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] text-slate-400">Coordinate Reference System (CRS)</label>
                    {selectedCrsObj && (
                      <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400">
                        EPSG:{selectedCrsObj.epsg_code}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={crs}
                    onChange={(e) => {
                      setCrs(e.target.value);
                      setSelectedCrsObj(null);
                    }}
                    placeholder='Search: "14N", "32614", "UTM Zone"'
                    list="crs-datalist"
                    autoComplete="off"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-xs"
                  />
                  <datalist id="crs-datalist">
                    {crsOptions.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Surface Location X</label>
                    <input
                      type="number"
                      value={easting}
                      onChange={(e) => setEasting(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Surface Location Y</label>
                    <input
                      type="number"
                      value={northing}
                      onChange={(e) => setNorthing(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] text-slate-400">Latitude</label>
                      {isFetchingGeo && <span className="text-[9px] text-blue-400 animate-pulse">computing…</span>}
                      {!isFetchingGeo && selectedCrsObj?.projection === 'utm' && latitude !== 0 && (
                        <span className="text-[9px] text-amber-500">↻ auto</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.000001"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] text-slate-400">Longitude</label>
                      {!isFetchingGeo && selectedCrsObj?.projection === 'utm' && longitude !== 0 && (
                        <span className="text-[9px] text-amber-500">↻ auto</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.000001"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Grid Convergence Angle</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={gridConvergence}
                      onChange={(e) => setGridConvergence(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Grid Scale Factor</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={scaleFactor}
                      onChange={(e) => setScaleFactor(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Elevations & Reference Datums */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  <Map className="h-3.5 w-3.5 text-blue-400" />
                  Elevations & Datums
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Reference Datum</label>
                    <select
                      value={datum}
                      onChange={(e) => setDatum(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                    >
                      <option value="KB">KB (Kelly Bushing)</option>
                      <option value="RF">RF (Rig Floor)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Datum Elev ({lenLabel})</label>
                    <input
                      type="number"
                      value={refElevation}
                      onChange={(e) => setRefElevation(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Ground Level Elev ({lenLabel})</label>
                    <input
                      type="number"
                      value={glElevation}
                      onChange={(e) => setGlElevation(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Wellhead Elev ({lenLabel})</label>
                    <input
                      type="number"
                      value={elevation}
                      onChange={(e) => setElevation(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Geomagnetic & Gravity Parameters */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  <Compass className="h-3.5 w-3.5 text-blue-400" />
                  Geomagnetic & Gravity
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Mag Declination (D)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={declination}
                      onChange={(e) => setDeclination(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-normal">Declination Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-06-26"
                      value={declinationDate}
                      onChange={(e) => setDeclinationDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="block text-[10px] text-slate-400 font-normal">Declination Model</label>
                      {magneticModel && (
                        <button
                          type="button"
                          onClick={handleAutofillMagnetic}
                          disabled={isSaving}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded text-[10px] font-medium transition-colors"
                        >
                          <Map className="h-3.5 w-3.5" />
                          {isSaving ? 'Fetching...' : 'Fetch from Coordinates'}
                        </button>
                      )}
                    </div>
                    <select
                      value={magneticModel}
                      onChange={(e) => setMagneticModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                    >
                      <option value="">-- Select Model --</option>
                      {magneticModels.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Mag Field (B_ref, nT)</label>
                    <input
                      type="number"
                      value={magneticField}
                      onChange={(e) => setMagneticField(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-normal">Magnetic Dip Angle</label>
                    <input
                      type="number"
                      step="0.1"
                      value={magneticDip}
                      onChange={(e) => setMagneticDip(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                    />
                  </div>
                  <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-slate-400">Strength (mGal)</label>
                        {latitude !== 0 && <span className="text-[9px] text-amber-500">↻ auto</span>}
                      </div>
                      <input
                        type="number"
                        step="0.001"
                        value={gravityField}
                        onChange={(e) => setGravityField(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-850 dark:text-slate-100 text-xs text-right font-mono"
                      />
                    </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] text-slate-400 font-normal">Gravity Model</label>
                    {gravityModel && (
                      <button
                        type="button"
                        onClick={() => fetchGeoData('gravity')}
                        className="text-[9px] text-blue-500 hover:text-blue-400 font-bold cursor-pointer"
                      >
                        Autofill
                      </button>
                    )}
                  </div>
                  <select
                    value={gravityModel}
                    onChange={(e) => setGravityModel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Select Model --</option>
                    {gravityModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: Tie-in Point */}
              {(activeNode.type === 'trajectory' || activeNode.type === 'survey') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                    <Sliders className="h-3.5 w-3.5 text-blue-400" />
                    Tie-in Station (Reference)
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">MD ({lenLabel})</label>
                      <input
                        type="number"
                        value={tieInMd}
                        onChange={(e) => setTieInMd(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">TVD ({lenLabel})</label>
                      <input
                        type="number"
                        value={tieInTvd}
                        onChange={(e) => setTieInTvd(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">Inc (deg)</label>
                      <input
                        type="number"
                        value={tieInInc}
                        onChange={(e) => setTieInInc(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Az (deg)</label>
                      <input
                        type="number"
                        value={tieInAz}
                        onChange={(e) => setTieInAz(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">Northing ({lenLabel})</label>
                      <input
                        type="number"
                        value={tieInNorth}
                        onChange={(e) => setTieInNorth(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Easting ({lenLabel})</label>
                      <input
                        type="number"
                        value={tieInEast}
                        onChange={(e) => setTieInEast(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-slate-855 dark:text-slate-100 text-right"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* In-sidebar save feedback toast */}
            {saveMessage && (
              <div
                className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-medium leading-snug shadow-md transition-all ${
                  saveError
                    ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                }`}
              >
                <span className="mt-px text-base leading-none">{saveError ? '✕' : '✓'}</span>
                <span>{saveMessage}</span>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="mt-3 flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded shadow transition shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
