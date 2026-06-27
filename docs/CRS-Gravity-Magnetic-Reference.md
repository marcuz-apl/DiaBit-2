# DiaBit — CRS, Gravity & Geomagnetic Reference Notes

> **Scope:** This document covers the coordinate reference system (CRS) registry, automatic UTM ↔ Lat/Lon conversion, gravity field auto-computation, and geomagnetic parameter sourcing used in the Calculation Settings sidebar.
>
> Related: `Gravity-magnetic-Fields.md`, `tech-notes.md`

---

## 1. Coordinate Reference System (CRS) Registry

### 1.1 Design Principle

Rather than allowing engineers to free-type a CRS string (which leads to typos like "UTM Zone 14" vs "UTM zone 14N"), DiaBit stores all supported CRS definitions in the **`crs_registry`** SQLite table. The Calculation Settings sidebar presents a **searchable dropdown** — typing partial text (e.g. "14N" or "32614") filters live results.

### 1.2 Database Schema

```sql
CREATE TABLE IF NOT EXISTS crs_registry (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  epsg_code        INTEGER UNIQUE,
  name             TEXT NOT NULL,           -- "UTM Zone 14N (WGS84)"
  projection       TEXT NOT NULL,           -- "utm" | "geographic" | "custom"
  zone             INTEGER,                 -- UTM zone number (1-60)
  hemisphere       TEXT,                    -- "N" | "S"
  datum            TEXT DEFAULT 'WGS84',
  central_meridian REAL,                    -- degrees east, e.g. -99.0 for zone 14
  false_easting    REAL DEFAULT 500000,
  false_northing   REAL,                    -- 0 for N hemisphere, 10000000 for S
  scale_factor     REAL DEFAULT 0.9996,
  active           INTEGER DEFAULT 1
);
```

### 1.3 Pre-loaded Entries

| Range | Description | Count |
|---|---|---|
| EPSG 4326 | WGS84 Geographic (Lat/Lon) | 1 |
| EPSG 32601–32660 | WGS84 UTM Zones 1N–60N | 60 |
| EPSG 32701–32760 | WGS84 UTM Zones 1S–60S | 60 |

Custom or regional CRS (State Plane, Lambert, local grid) can be added from the Admin Panel → CRS Registry tab.

### 1.4 Central Meridian Formula

For any UTM zone Z:

    λ₀ = 6Z − 183   (degrees east of Greenwich)

Example: Zone 14 → λ₀ = 6(14) − 183 = **−99°** (Permian Basin, Texas).

---

## 2. UTM → Latitude / Longitude Conversion

### 2.1 When it Runs

Automatically triggered server-side via `GET /api/geo?type=utm` whenever the engineer changes Easting, Northing, or selects a different UTM CRS in the sidebar.

### 2.2 Algorithm (Karney Series, sub-cm accuracy)

**Input normalization:**

    ξ  = (N − N₀) / (k₀ × A)
    η  = (E − E₀) / (k₀ × A)

where A = a/(1+n) × (1 + n²/4 + n⁴/64) and n = f/(2−f).

**Inverse series (3-term Karney β coefficients):**

    ξ′ = ξ − Σ βⱼ sin(2jξ) cosh(2jη)
    η′ = η − Σ βⱼ cos(2jξ) sinh(2jη)

**Conformal → geodetic latitude (5-iteration Bowring):**

    χ = arcsin(sin(ξ′) / cosh(η′))
    φ = 2 arctan[ tan(π/4 + χ/2) × ((1 + e sinφ)/(1 − e sinφ))^(e/2) ] − π/2

**Longitude:**

    λ = λ₀ + arctan(sinh(η′) / cos(ξ′))

### 2.3 Grid Convergence (γ)

    γ = arctan[ tan(λ − λ₀) × sin(φ) ]

Auto-populated into the **Grid Convergence Angle** field in the sidebar.

### 2.4 Point Scale Factor (k)

    k = k₀ × √(1 + η²) × √(1 + t² × ΔE² / (1 + η²))

where η² = e′² cos²φ, t = tan φ, ΔE = (E − E₀)/(k₀ × a).

---

## 3. Gravity Field Auto-Computation

### 3.1 Method

Gravity is computed entirely **client-side** using the **WGS84 Somigliana formula** — no network call required.

### 3.2 Formulas

**Surface gravity:**

    g(φ) = 9.780327 × (1 + 0.0053024 sin²φ − 0.0000058 sin²2φ)   [m/s²]

**Free-air reduction to elevation h (metres):**

    g(φ, h) = g(φ) − 3.0877×10⁻⁶ h + 7.2×10⁻¹³ h²   [m/s²]

**Conversion:** 1 m/s² = 100 000 mGal

### 3.3 Reference Values

| Location | Latitude | g (mGal) |
|---|---|---|
| Equator | 0° | 978 033 |
| Permian Basin | 30°N | 979 337 |
| North Sea | 45°N | 980 619 |
| Arctic Circle | 60°N | 981 918 |
| Standard gravity | 45°N, MSL | 980 665 |

### 3.4 MWD QC Tolerance

    |G_measured − G_reference| ≤ 0.003 g   (±300 mGal)

---

## 4. Geomagnetic Parameter Sourcing

### 4.1 Required Parameters

| Parameter | Symbol | Typical Range | Source |
|---|---|---|---|
| Magnetic Declination | D | −40° to +40° | WMM / IGRF |
| Magnetic Dip Angle | I | −90° to +90° | WMM / IGRF |
| Total Field Strength | F | 25 000–65 000 nT | WMM / IGRF |
| Horizontal Intensity | H | 0–40 000 nT | derived |

### 4.2 Tier 1: NOAA NGDC REST API (Online)

Endpoint: `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfwmm`

Parameters: `lat`, `lon`, `elevation` (km), `startYear/Month/Day`, `magneticComponent=d,i,f`, `resultFormat=json`

**DiaBit procedure:**
1. Enter Easting/Northing → Lat/Lon auto-converts
2. Enter Elevation and Reference Date
3. Click **"Fetch from Coordinates"**
4. API proxies to NOAA → **auto-saves** D, I, F to well metadata and triggers recalculation

### 4.3 Acquiring a NOAA API Key for HDGM / WMM
To use the online NOAA API, you must register for a free API key. Without a key, DiaBit will fall back to the offline WMM calculator.
1. Visit the NOAA National Centers for Environmental Information (NCEI) Magnetic Calculator page: `https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml`
2. Navigate to the **Web Services** or **API** section.
3. Follow the prompts to register your email and receive a unique API Key.
4. Enter this key into the **Configuration** tab in the DiaBit Admin Panel.

### 4.4 Tier 2: WMM2025 Offline Computation (Fallback)

If NOAA is unreachable (4 s timeout) or the API key is missing/invalid, DiaBit falls back to offline evaluation using the industry-standard `geomagnetism` npm package. This package is configured with full WMM2025 Gauss coefficients (degrees n=1–12), ensuring highly accurate fallback calculations that closely match the online NOAA API results.

**Implementation Details:**
- Uses the `geomagnetism` library in Node.js backend (`src/app/api/geo/route.js`).
- Coefficients are sourced directly from the `geomagnetism` module dataset (`wmm-2025.json`), replacing the previous truncated (n=1–6) handwritten math model that was stored in the SQLite database.
- Provides Total Field, Declination, Dip, and Horizontal Intensity seamlessly when offline.

### 4.5 WMM Coefficient Table Schema (Admin Panel Display)

The Admin Panel **WMM Coefficients** tab dynamically parses and displays the raw 90-term dataset directly from the `geomagnetism` package (degrees n=1–12).
It iterates through the active model epoch (e.g. 2025.0) and extracts the `main_field_coeff_g/h` and `secular_var_coeff_g/h` for display purposes.

**WMM epochs:** WMM2020 (2020–2025), **WMM2025 (2025–2030 — current)**, WMM2030 (future).

### 4.6 Accuracy Comparison

| Method | Declination accuracy | Use case |
|---|---|---|
| NOAA NGDC API (online) | ±0.1° or better | Production surveys |
| WMM n=1–6 offline | ±1–3° | Offline fallback, planning |
| WMM n=1–12 offline | ±0.5° | Full offline (future upgrade) |

## 5. Local Datum Shifts (towgs84 Override)

### 5.1 The Need for Datum Shifts
Standard UTM projections in DiaBit assume WGS84 for magnetic and gravity background calculations. However, many historical or regional CRS systems (e.g., ED50 in Libya or the North Sea) use different underlying reference ellipsoids.
To accurately compute magnetic declination for a well using ED50, its coordinate must first be mathematically decoupled and shifted to WGS84 before hitting the WMM/IGRF models.

### 5.2 Auto-Apply Logic
DiaBit stores known regional shifts in the **`datum_shifts`** SQLite table (e.g., EPSG:23034 mapped to DX:-87, DY:-96, DZ:-120 for Libya).
- When a user selects a CRS (like EPSG:23034), `RightSidebar.js` automatically queries `/api/datum-shifts`.
- If a shift is found, the **"Local Datum Shift Override"** is automatically toggled ON, and the DX, DY, DZ parameters are pre-filled.
- *Default Behavior:* This auto-apply logic only runs by default when creating a new well or if the well's `datum_override` metadata is strictly `undefined`, ensuring it never overwrites a user's explicitly saved parameters (even if they turned it OFF).

### 5.3 Mathematical Application
When the user enters a surface location (Easting/Northing) and the override is active, the `GET /api/geo` conversion route injects `+towgs84=DX,DY,DZ,0,0,0,0` directly into the `proj4` definition string before executing the coordinate transformation. 
The API then returns two distinct pairs of coordinates:
1. **Native Lat/Lon:** (Unshifted) displayed in the UI.
2. **WGS84 Lat/Lon:** (Shifted) processed transparently in the background for magnetic and gravity engines.

---

## 6. Admin Panel Reference Data Tabs

### CRS Registry Tab
- Searchable table of all `crs_registry` entries
- Toggle active/inactive per row (soft-delete)
- Add Custom CRS form: name, EPSG code, projection type, zone, hemisphere, central meridian, false easting/northing, scale factor
- Non-WGS84 entries are stored but flagged with a note that automatic UTM↔LatLon conversion only applies to WGS84 UTM projections

### Field Models Tab
- Manages `field_models` table (gravity + magnetic model display names shown in sidebar dropdowns)
- Inline add / delete

### WMM Coefficients Tab
- Read-only table of coefficients by epoch
- "Re-seed from JSON" button — paste or upload official NOAA WMM.COF format
- Use when transitioning to WMM2030 (~2030)

### Datum Shifts Tab
- Manages the `datum_shifts` table for defining localized `towgs84` (DX, DY, DZ) overrides.
- **Search CRS Registry:** Includes a dynamic search bar that queries the master `crs_registry`. Upon selecting a CRS (e.g., ED50), it automatically parses the hidden `+towgs84` parameters out of the projection string and pre-fills the Add Shift form.
- Pre-loaded with 10 standard regional shifts (e.g., Libya, North Sea, Gulf of Mexico).

---

## 7. Engineering Setup Procedure

When configuring a new well in DiaBit:

1. **Select CRS** from dropdown → central meridian, scale factor auto-populated
2. **Enter Easting (X) and Northing (Y)** → Lat/Lon + Grid Convergence auto-populate
3. **Enter Elevation and Reference Date** → Gravity auto-computes
4. **Click "Fetch from Coordinates"** → Declination, Dip, Total Field auto-saved from NOAA (or WMM offline)
5. **Review values** against service company IFR report (if available)
6. **Save Settings** → all trajectories recalculate with updated parameters

---

*Last updated: 2026-06-26 | WMM epoch: WMM2025 (valid 2025–2030) | Gravity: WGS84 Somigliana*
