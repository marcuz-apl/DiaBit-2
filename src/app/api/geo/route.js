import db from '@/lib/database';

import proj4 from 'proj4';

// ─── Universal Proj4 Coordinate Engine ──────────────────────────────────────
const WGS84_PROJ4 = "+proj=longlat +datum=WGS84 +no_defs";

function proj4ToLatLon(easting, northing, proj4Def) {
  // 1. Transform to WGS84 (for Magnetic API and background calculations)
  const p1_wgs84 = proj4(proj4Def, WGS84_PROJ4, [easting, northing]);
  
  // 2. Transform to Native Geographic (without WGS84 shift) for UI display and Convergence
  const nativeProj4 = proj4Def.replace(/\+towgs84=[^\s]+/, '');
  const ellpsMatch = nativeProj4.match(/\+ellps=[^\s]+/);
  const nativeGeoDef = "+proj=longlat " + (ellpsMatch ? ellpsMatch[0] : "+datum=WGS84") + " +no_defs";
  
  const p1_native = proj4(nativeProj4, nativeGeoDef, [easting, northing]);
  
  // 3. Compute Convergence and Scale Factor
  let convergence = 0;
  let scaleFactor = 1.0;
  
  try {
    const proj = proj4.Proj(nativeProj4);
    if (proj && (proj.projName === 'tmerc' || proj.projName === 'utm')) { // UTM is a Transverse Mercator
      const latRad = p1_native[1] * Math.PI / 180;
      const lonRad = p1_native[0] * Math.PI / 180;
      
      // Convergence: γ = arctan(tan(λ - λ0) * sin(φ))
      const lon0 = proj.long0; // central meridian in radians
      convergence = Math.atan(Math.tan(lonRad - lon0) * Math.sin(latRad)) * 180 / Math.PI;
      
      // Scale Factor: k = k0 * [1 + (x^2 / 2ν^2)]
      const a = proj.a;
      const e2 = proj.es;
      const k0 = proj.k0;
      const x0 = proj.x0;
      
      const nu = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
      const x = easting - x0;
      scaleFactor = k0 * (1 + (x * x) / (2 * nu * nu));
    }
  } catch (err) {
    console.error("Scale factor computation error:", err);
  }

  return {
    lat: p1_native[1],          // UI Display (Native Lat)
    lon: p1_native[0],          // UI Display (Native Lon)
    lat_wgs84: p1_wgs84[1],     // Background Magnetic Engine Lat
    lon_wgs84: p1_wgs84[0],     // Background Magnetic Engine Lon
    convergence,
    scaleFactor
  };
}

// ─── Gravity (WGS84 Somigliana + free-air correction) ───────────────────────
function computeGravity(latDeg, altMeters = 0) {
  const phi = latDeg * Math.PI / 180;
  const sin2 = Math.sin(phi) ** 2;
  const sin22 = Math.sin(2 * phi) ** 2;
  // Somigliana formula (result in m/s²)
  const g0 = 9.780327 * (1 + 0.0053024 * sin2 - 0.0000058 * sin22);
  // Free-air reduction: subtract ~3.086e-6 m/s² per metre of elevation
  const gH = g0 - 3.0877e-6 * altMeters + 7.2e-13 * altMeters * altMeters;
  // Convert m/s² → mGal (1 m/s² = 1e5 mGal)
  return parseFloat((gH * 100000).toFixed(4)); // mGal
}

// ─── WMM offline magnetic computation (simplified spherical harmonic) ────────
function computeMagnetic(latDeg, lonDeg, altKm, decimalYear) {
  // Load coefficients from DB
  const coeffs = db.prepare(`SELECT * FROM wmm_coefficients ORDER BY n, m`).all();
  if (!coeffs || coeffs.length === 0) return null;

  const phi   = latDeg * Math.PI / 180;         // geocentric (approx for low-order)
  const lambda = lonDeg * Math.PI / 180;
  const r = 6371.2 + altKm;                      // geocentric radius (km)
  const a = 6371.2;                               // reference radius (km)
  const dt = decimalYear - 2025.0;               // time offset from epoch

  const nMax = Math.max(...coeffs.map(c => c.n));

  // Build coefficient lookup
  const G = {}, H = {};
  for (const c of coeffs) {
    const key = `${c.n}_${c.m}`;
    G[key] = c.g + c.g_dot * dt;
    H[key] = c.h + c.h_dot * dt;
  }

  // Compute Schmidt quasi-normal associated Legendre polynomials
  function schmidtP(nMax, theta) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const P = {};
    P['0_0'] = 1;
    for (let n = 1; n <= nMax; n++) {
      for (let m = 0; m <= n; m++) {
        const key = `${n}_${m}`;
        if (m === n) {
          const prev = P[`${n-1}_${n-1}`] || 0;
          P[key] = sinT * prev * Math.sqrt((2*n - 1) / (2*n));
        } else if (m === n - 1) {
          const prev = P[`${n-1}_${m}`] || 0;
          P[key] = cosT * prev * Math.sqrt(2*n - 1);
        } else {
          const k = ((n-1)*(n-1) - m*m) / ((2*n-1)*(2*n-3));
          const p1 = P[`${n-1}_${m}`] || 0;
          const p2 = P[`${n-2}_${m}`] || 0;
          P[key] = cosT * p1 - Math.sqrt(k) * p2;
          if (m > 0) P[key] *= Math.sqrt((2*n-1) / ((n-m)*(n+m)));
        }
      }
    }
    return P;
  }

  const theta = Math.PI / 2 - phi; // colatitude
  const P = schmidtP(nMax, theta);

  let Br = 0, Btheta = 0, Bphi = 0;
  for (let n = 1; n <= nMax; n++) {
    const factor = Math.pow(a / r, n + 2);
    for (let m = 0; m <= n; m++) {
      const key = `${n}_${m}`;
      const g = G[key] || 0;
      const h = H[key] || 0;
      const p = P[key] || 0;

      const cosML = Math.cos(m * lambda);
      const sinML = Math.sin(m * lambda);

      Br     -= (n + 1) * factor * (g * cosML + h * sinML) * p;
      Btheta -= factor * (g * cosML + h * sinML) * (P[`${n}_${m+1}`] || 0) * Math.sqrt((n - m) * (n + m + 1) || 1);
      Bphi   += factor * m * (-g * sinML + h * cosML) * p;
    }
  }

  Bphi /= Math.sin(theta) || 1;

  // Bx = north, By = east, Bz = down
  const Bx = -Btheta;
  const By =  Bphi;
  const Bz = -Br;

  const H_total = Math.sqrt(Bx*Bx + By*By);
  const F_total = Math.sqrt(H_total*H_total + Bz*Bz);
  const declinationDeg = Math.atan2(By, Bx) * 180 / Math.PI;
  const dipDeg = Math.atan2(Bz, H_total) * 180 / Math.PI;

  return {
    declination: parseFloat(declinationDeg.toFixed(4)),
    dip: parseFloat(dipDeg.toFixed(4)),
    total_field: parseFloat(F_total.toFixed(1)),
    horizontal: parseFloat(H_total.toFixed(1)),
    source: 'WMM2025 offline'
  };
}

// ─── Route handlers ──────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'utm', 'gravity', or 'magnetic'

    // ── Proj4 CRS → Lat/Lon conversion ───────────────────────────────────────
    if (type === 'utm') {
      const easting  = parseFloat(searchParams.get('easting'));
      const northing = parseFloat(searchParams.get('northing'));
      const epsgCode = searchParams.get('epsg'); // Pass epsg instead of zone/hemisphere

      if (isNaN(easting) || isNaN(northing) || !epsgCode) {
        return new Response(JSON.stringify({ error: 'easting, northing, and epsg code are required' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const crs = db.prepare("SELECT proj4 FROM crs_registry WHERE epsg_code = ?").get(parseInt(epsgCode, 10));
      if (!crs || !crs.proj4) {
        return new Response(JSON.stringify({ error: 'CRS not found in registry' }), {
          status: 404, headers: { 'Content-Type': 'application/json' }
        });
      }

      let proj4Def = crs.proj4;
      const towgs84Override = searchParams.get('towgs84');
      if (towgs84Override) {
        if (proj4Def.includes('+towgs84=')) {
          proj4Def = proj4Def.replace(/\+towgs84=[^\s]+/, `+towgs84=${towgs84Override}`);
        } else {
          proj4Def = proj4Def.replace('+no_defs', `+towgs84=${towgs84Override} +no_defs`);
        }
      }

      const result = proj4ToLatLon(easting, northing, proj4Def);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Gravity field (WGS84 Somigliana) ─────────────────────────────────────
    if (type === 'gravity') {
      const lat = parseFloat(searchParams.get('lat'));
      const alt = parseFloat(searchParams.get('alt') || '0'); // metres
      if (isNaN(lat)) {
        return new Response(JSON.stringify({ error: 'lat is required' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }
      const gravity_mGal = computeGravity(lat, alt);
      return new Response(JSON.stringify({ gravity_mGal, source: 'WGS84 Somigliana' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Magnetic field (NOAA API → WMM offline fallback) ─────────────────────
    if (type === 'magnetic') {
      const lat  = parseFloat(searchParams.get('lat'));
      const lon  = parseFloat(searchParams.get('lon'));
      const alt  = parseFloat(searchParams.get('alt') || '0');  // metres
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

      if (isNaN(lat) || isNaN(lon)) {
        return new Response(JSON.stringify({ error: 'lat and lon are required' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse date to decimal year
      const d = new Date(date);
      const year = d.getFullYear();
      const start = new Date(year, 0, 0);
      const diff  = d - start;
      const oneYear = new Date(year + 1, 0, 0) - start;
      const decimalYear = year + diff / oneYear;

      // Try NOAA NGDC API first
      try {
        const altKm = alt / 1000;
        const noaaUrl = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfwmm?lat=${lat}&lon=${lon}&elevation=${altKm}&elevationUnits=K&startYear=${year}&startMonth=${d.getMonth()+1}&startDay=${d.getDate()}&endYear=${year}&endMonth=${d.getMonth()+1}&endDay=${d.getDate()}&magneticComponent=d,i,f&key=zNh1J&resultFormat=json`;

        const noaaRes = await fetch(noaaUrl, { signal: AbortSignal.timeout(4000) });
        if (noaaRes.ok) {
          const noaaData = await noaaRes.json();
          const result = noaaData?.result?.[0];
          if (result) {
            return new Response(JSON.stringify({
              declination: parseFloat(result.declination?.toFixed(4)),
              dip: parseFloat(result.inclination?.toFixed(4)),
              total_field: parseFloat(result.totalintensity?.toFixed(1)),
              horizontal: parseFloat(result.horizontalintensity?.toFixed(1)),
              source: 'NOAA NGDC (online)'
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }
      } catch (_) {
        // NOAA API unavailable — fall through to local WMM computation
      }

      // Offline WMM fallback
      const altKm = alt / 1000;
      const offlineResult = computeMagnetic(lat, lon, altKm, decimalYear);
      if (offlineResult) {
        return new Response(JSON.stringify(offlineResult), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Magnetic computation failed — no coefficients in database' }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'type must be utm, gravity, or magnetic' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
