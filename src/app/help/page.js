'use client';
 
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Compass, FileText, Settings, Upload, Sliders } from 'lucide-react';
import pkg from '../../../package.json';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6 max-w-5xl mx-auto">
          <Link 
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
          <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            DiaBit Documentation
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            v{pkg.version} Help Center
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Section 1: Intro */}
        <section className="space-y-3">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-850 dark:text-slate-150">
            <BookOpen className="h-6 w-6 text-blue-500" />
            Getting Started with DiaBit
          </h1>
          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
            DiaBit is a comprehensive directional drilling survey utility. The app utilizes the **Minimum Curvature Method (MCM)** to map 3D survey coordinates based on discrete Measured Depth (MD), Inclination (Inc), and Azimuth (Az) entries.
          </p>
        </section>

        {/* Section 2: Mathematical Foundations */}
        <section className="space-y-4 border-t border-slate-200 dark:border-slate-850 pt-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <Compass className="h-5 w-5 text-emerald-500" />
            Minimum Curvature Method Mathematics
          </h2>
          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
            The Minimum Curvature Method is the industry standard for directional survey calculations. It uses a mathematical smoothing ratio to treat the borehole path as a series of circular arcs rather than straight lines (as in the average angle method).
          </p>
          
          <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 text-xs space-y-4 shadow-sm font-mono overflow-x-auto">
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">1. Dogleg Angle (&beta;):</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                cos(&beta;) = cos(I&sub1;)cos(I&sub2;) + sin(I&sub1;)sin(I&sub2;)cos(A&sub2; - A&sub1;)<br />
                &beta; = acos(max(-1, min(1, cos(&beta;))))
              </p>
            </div>

            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">2. Ratio Factor (F) for smoothing:</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                If &beta; &lt; 10⁻⁵ radians: F = 1.0 (Average Angle approximation)<br />
                Otherwise: F = (2 / &beta;) * tan(&beta; / 2)
              </p>
            </div>

            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">3. Coordinate Increments:</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                &Delta;TVD = (&Delta;MD / 2) * [cos(I&sub1;) + cos(I&sub2;)] * F<br />
                &Delta;North = (&Delta;MD / 2) * [sin(I&sub1;)cos(A&sub1;) + sin(I&sub2;)cos(A&sub2;)] * F<br />
                &Delta;East = (&Delta;MD / 2) * [sin(I&sub1;)sin(A&sub1;) + sin(I&sub2;)sin(A&sub2;)] * F
              </p>
            </div>

            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">4. Dogleg Severity (DLS):</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                Metric (deg/30m): DLS = &beta; (deg) * (30 / &Delta;MD)<br />
                Imperial (deg/100ft): DLS = &beta; (deg) * (100 / &Delta;MD)
              </p>
            </div>

            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">5. Vertical Section (VS):</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                VS = CumulativeEast * sin(&theta;_VS) + CumulativeNorth * cos(&theta;_VS)<br />
                where &theta;_VS is the user-configured vertical section direction.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Magnetic & Gravity Parameters */}
        <section className="space-y-4 border-t border-slate-200 dark:border-slate-850 pt-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <Sliders className="h-5 w-5 text-amber-500" />
            Geomagnetic & Gravity Field Parameters
          </h2>
          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
            In directional drilling surveying, Measurement While Drilling (MWD) tools utilize 3-axis magnetometers and 3-axis accelerometers to measure inclination and azimuth downhole. These sensors must be calibrated and checked against local Earth gravity and magnetic reference fields.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 shadow-sm text-xs space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Geomagnetic Models (HDGM 2025, WMM, IGRF)</h3>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                Geomagnetic models calculate the local Earth magnetic field vector based on geographical coordinates (latitude, longitude), elevation, and date.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-650 dark:text-slate-450 pl-2">
                <li><strong>Declination (D):</strong> Angle between True North and Magnetic North. Used to correct raw compass headings.</li>
                <li><strong>Dip Angle (Dip):</strong> Angle of the magnetic vector relative to horizontal (0° at equator, &plusmn;90° at poles).</li>
                <li><strong>Field Strength (B_ref):</strong> Reference magnetic magnitude (typically 25,000 to 65,000 nT).</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 shadow-sm text-xs space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Gravity Reference Models (WGS84, EGM2008, GRS80)</h3>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                Standard gravity models calculate the expected reference gravity field (G_ref) as a function of latitude and elevation.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-650 dark:text-slate-450 pl-2">
                <li><strong>Field Strength (G_ref):</strong> Standard gravity is ~980.665 mGal (or 1.0 g). It varies slightly based on location.</li>
                <li><strong>Quality Control (QC):</strong> MWD surveys must satisfy |G_meas - G_ref| &le; &plusmn;0.003 g and |B_meas - B_ref| &le; &plusmn;300 nT to verify tool accuracy and rule out magnetic interference.</li>
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 text-xs space-y-4 shadow-sm font-mono overflow-x-auto">
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">1. Azimuth Correction to Grid North:</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                Total Correction (TC) = Magnetic Declination (D) - Grid Convergence (&gamma;)<br />
                Corrected Azimuth = (Measured Azimuth + TC) mod 360
              </p>
            </div>

            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">2. Short Collar Correction (SCC) for Axial Magnetic Interference:</span>
              <p className="mt-1 pl-4 text-slate-600 dark:text-slate-450 leading-relaxed">
                BHA steel components corrupt the axial magnetometer measurement (Bz). Under the assumption that gravity readings are uncorrupted, the correct Bz can be resolved using the transverse magnetometers (Bx, By) and accelerometers (Gx, Gy, Gz):<br />
                Bz_corr = [B_ref * sin(Dip_ref) - (Gx * Bx + Gy * By)] / Gz<br />
                The corrected Bz is then used to recalculate the uncorrupted magnetic azimuth.
              </p>
            </div>
          </div>
        </section>

        {/* Section: WMM Offline Coefficients */}
        <section className="space-y-4 border-t border-slate-200 dark:border-slate-850 pt-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <BookOpen className="h-5 w-5 text-purple-500" />
            WMM Offline Coefficients (Theory & Practice)
          </h2>
          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
            The World Magnetic Model (WMM) is a spherical harmonic representation of the Earth's main magnetic field. DiaBit utilizes this model to provide highly accurate offline magnetic declination corrections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 shadow-sm text-xs space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Theoretical Foundation</h3>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                The Earth's magnetic potential is modeled using <strong>Spherical Harmonics</strong>. The magnetic scalar potential is expanded into a series involving Schmidt semi-normalized associated Legendre functions.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-650 dark:text-slate-450 pl-2">
                <li><strong>n &amp; m:</strong> The degree (n) and order (m) of the harmonic expansion (typically up to n=12).</li>
                <li><strong>g &amp; h:</strong> The static Gauss coefficients for the base epoch (e.g., 2025.0).</li>
                <li><strong>g_dot &amp; h_dot:</strong> Secular variation coefficients representing the annual rate of change of the magnetic field.</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 shadow-sm text-xs space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Practical Application in DiaBit</h3>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                When an internet connection to the NOAA API is unavailable, DiaBit's calculation engine falls back to the embedded <code>wmm_coefficients</code> database table.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-650 dark:text-slate-450 pl-2">
                <li><strong>Epoch Conversion:</strong> The survey date is converted to a decimal year (e.g., 2026.5). The coefficients are adjusted using <code>g + g_dot * (current_year - base_epoch)</code>.</li>
                <li><strong>Vector Expansion:</strong> The engine calculates the X (North), Y (East), and Z (Down) magnetic vectors based on the user's Latitude, Longitude, and Elevation.</li>
                <li><strong>Derived Elements:</strong> Declination (D), Dip (I), and Total Field (F) are mathematically derived from X, Y, and Z to automatically apply Total Correction (TC) to the MWD azimuth.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: User Guide */}
        <section className="space-y-4 border-t border-slate-200 dark:border-slate-850 pt-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <Settings className="h-5 w-5 text-indigo-500" />
            Software Features Guide
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 shadow-sm text-xs space-y-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                Project Hierarchy Trees
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Organize projects under <strong>Country &gt; State/Province &gt; GeoBasin &gt; Field &gt; Well &gt; Slot &gt; Plan/Survey</strong>. Click "+" nodes on hover to expand or add sub-elements. Deletions will automatically cascade down.
              </p>
            </div>

            <div className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl p-4 shadow-sm text-xs space-y-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-emerald-500" />
                CSV Data Import / Export
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Use "Import CSV" to paste or upload standard files. CSV format must contain columns: Measured Depth (MD), Inclination (Inc), and Azimuth (Az). Click "Export CSV" to backup calculations in spreadsheet formats.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Contact */}
        <section className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-xs text-center space-y-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Need advanced field deployment guides?</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Contact the engineering team at Alfazen Inc. or view the official DiaBit user handbook for detailed field-to-grid declination corrections.
          </p>
          <a 
            href="mailto:support@alfazen.org"
            className="inline-block mt-2 bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-500 transition"
          >
            Contact Support
          </a>
        </section>
      </main>
    </div>
  );
}
