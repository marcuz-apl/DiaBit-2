'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Globe, Twitter, Linkedin, ShieldAlert, HelpCircle, Phone } from 'lucide-react';

export default function Footer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <>
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-6 dark:border-slate-800 dark:bg-slate-950 transition">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Left Corner: Disclaimer & Contact */}
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setShowDisclaimer(true)}
              className="flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Disclaimer
            </button>
            <span className="text-slate-200 dark:text-slate-800 font-light">|</span>
            <Link
              href="/contact"
              className="flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 text-blue-500" />
              Contact
            </Link>
          </div>

          {/* Center: Copyright */}
          <div className="text-slate-500 dark:text-slate-400 font-medium text-center">
            @{new Date().getFullYear()} Alfazen Inc. All rights reserved
          </div>

          {/* Right Corner: Social Links */}
          <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
            <a 
              href="tel:+15878878048" 
              className="hover:text-emerald-500 dark:hover:text-emerald-400 transition"
              title="+1(587)887-8048"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a 
              href="https://www.alfazen.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-blue-500 dark:hover:text-blue-400 transition"
              title="Website"
            >
              <Globe className="h-4 w-4" />
            </a>
            <a 
              href="https://x.com/alfazeninc/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-sky-400 dark:hover:text-sky-400 transition"
              title="Twitter / X"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a 
              href="https://linkedin.com/in/alfazeninc/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-blue-700 dark:hover:text-blue-500 transition"
              title="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>

      {/* Disclaimer Dialog */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 mb-3 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Professional Liability Disclaimer
            </h2>
            
            <div className="space-y-2.5 text-xs text-slate-650 dark:text-slate-400 leading-relaxed overflow-y-auto max-h-[250px] pr-2">
              <p>
                <strong>DiaBit</strong> is a directional drilling surveying calculations software suite developed for educational, planning, and evaluation purposes. All calculations are executed using the <strong>Minimum Curvature Method (MCM)</strong> based on industry standards.
              </p>
              <p>
                While the mathematical models implemented are designed to align with standard directional surveying methodologies, Alfazen Inc. does not guarantee the mathematical accuracy, suitability, or correctness of the generated outputs for real-world field operations.
              </p>
              <p>
                <strong>No Liability:</strong> Under no circumstances shall Alfazen Inc. or its affiliates be held liable for any operational losses, drilling incidents, mechanical failures, blowouts, financial damage, or injuries resulting from the use or interpretation of data processed by this application.
              </p>
              <p>
                Drilling trajectory decisions must be cross-verified with certified directional drilling engineers, local authorities, and third-party survey tool calibrations before execution.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
