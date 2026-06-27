'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, MapPin, Mail, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit message");
      }

      setStatus({ loading: false, success: true, error: null });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6 max-w-6xl mx-auto">
          <Link 
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
          <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            Contact Alfazen
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            DiaBit Support
          </span>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        
        {/* Header Title Section */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            Get in Touch
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
            Have questions about DiaBit directional surveying licenses, custom modules, or operational integrations? Send us a message and our team will get back to you shortly.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Column: Contact Form */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between backdrop-blur-md relative overflow-hidden group">
            {/* Ambient light ring border effect on hover */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50" />
            
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-blue-500" />
                Send a Message
              </h2>

              {status.success && (
                <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-800 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Message sent!</span> Thank you for reaching out. We will contact you soon.
                  </div>
                </div>
              )}

              {status.error && (
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-950/50 dark:bg-red-950/20 dark:text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Submission failed.</span> {status.error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-405 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-350 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-405 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-350 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-405 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Enterprise Licensing"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-350 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-405 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    required
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your requirements..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-350 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status.loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:bg-blue-800 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {status.loading ? (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Corporate Info Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800/85 mt-6 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-slate-500 dark:text-slate-450">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Calgary, AB, Canada</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>info@alfazen.com</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md backdrop-blur-md relative overflow-hidden group h-[400px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-50 z-10" />
            <iframe
              title="Google Maps Calgary"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d160538.74991195655!2d-114.26388487968537!3d51.04473309204368!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x537170030f97e33b%3A0xa37818e99616174!2sCalgary%2C%20AB%2C%20Canada!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
              className="w-full h-full border-0 rounded-xl block"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

        </div>

      </main>
    </div>
  );
}
