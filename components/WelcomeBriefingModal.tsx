"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Volume2, VolumeX, ArrowRight, CheckCircle2, 
  Bell, Briefcase, Clock, ShieldCheck, Radio, Play, Pause
} from "lucide-react";
import { Button } from "./ui/Button";

interface WelcomeBriefingModalProps {
  userName: string;
  assignedTaskCount?: number;
  unreadNoticeCount?: number;
  shiftStatusStr?: string;
  onClose: () => void;
}

export default function WelcomeBriefingModal({
  userName,
  assignedTaskCount = 3,
  unreadNoticeCount = 2,
  shiftStatusStr = "Shift Starting",
  onClose
}: WelcomeBriefingModalProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Web Audio API for soft ambient wavy synth sound
  useEffect(() => {
    let ctx: AudioContext | null = null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Oscillators for warm ambient wave
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        gainNodeRef.current = gain;

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(164.81, ctx.currentTime); // E3

        // LFO for wave modulation
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.2, ctx.currentTime); // 0.2Hz wave
        lfoGain.gain.setValueAtTime(20, ctx.currentTime);
        lfo.connect(filter.frequency);
        lfo.start();

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(300, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 3); // Soft ambient volume

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }

    return () => {
      if (ctx && ctx.state !== "closed") {
        try {
          ctx.close();
        } catch (e) {}
      }
    };
  }, []);

  const [persona, setPersona] = useState<'bachchan' | 'female' | 'standard'>('bachchan');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

  // Populate system voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadSystemVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      if (!selectedVoiceName) {
        if (persona === 'bachchan') {
          const maleKeywords = ["rishi", "karan", "ravi", "hemant", "male", "daniel", "alex", "en-in", "hi-in"];
          const bachchanVoice = voices.find(v => maleKeywords.some(kw => v.name.toLowerCase().includes(kw) || v.lang.toLowerCase().includes(kw)));
          if (bachchanVoice) setSelectedVoiceName(bachchanVoice.name);
        } else if (persona === 'female') {
          const femaleKeywords = ["veena", "aditi", "raveena", "heera", "neerja", "kalpana", "samantha", "victoria", "en-in", "hi-in"];
          const femaleVoice = voices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw) || v.lang.toLowerCase().includes(kw)));
          if (femaleVoice) setSelectedVoiceName(femaleVoice.name);
        }
      }
    };

    loadSystemVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadSystemVoices;
    }
  }, [selectedVoiceName, persona]);

  // Adjust Web Audio synth for deep baritone resonance when Bachchan persona is active
  useEffect(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed" && gainNodeRef.current) {
      if (persona === 'bachchan') {
        gainNodeRef.current.gain.setValueAtTime(0.04, audioCtxRef.current.currentTime);
      } else {
        gainNodeRef.current.gain.setValueAtTime(0.02, audioCtxRef.current.currentTime);
      }
    }
  }, [persona]);

  // Web Speech API for voice alert notification
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    let scriptText = "";
    let pitchVal = 1.0;
    let rateVal = 0.95;

    if (persona === 'bachchan') {
      scriptText = `Deviyon aur sajjanon, Namaskar! Main Amitabh Bachchan aapka swagat karta hoon NexusHR executive briefing mein. Welcome back, ${userName}! Today's report is ready. You have ${assignedTaskCount} tasks assigned to you, ${unreadNoticeCount} urgent company notifications, and your shift status is currently ${shiftStatusStr}. Aashayein hain ki aaj aapka din behad safal aur shandar rahega! Subhkamnayein!`;
      pitchVal = 0.58; // Deep baritone resonant pitch
      rateVal = 0.88;  // Poised, dramatic, iconic cadence
    } else if (persona === 'female') {
      scriptText = `Namaste and welcome back, ${userName}! I am delighted to present your morning executive briefing today. You have ${assignedTaskCount} tasks assigned to you, ${unreadNoticeCount} new notifications, and your shift status is currently ${shiftStatusStr}. Wishing you a joyful, productive, and wonderful day ahead!`;
      pitchVal = 1.12;
      rateVal = 0.96;
    } else {
      scriptText = `Welcome back ${userName}. Executive briefing ready. Assigned tasks: ${assignedTaskCount}, Notifications: ${unreadNoticeCount}, Shift Status: ${shiftStatusStr}. Have a great day!`;
      pitchVal = 1.0;
      rateVal = 1.0;
    }

    const speakWithVoice = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(scriptText);
      utterance.rate = rateVal;
      utterance.pitch = pitchVal;

      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (selectedVoiceName) {
        chosenVoice = voices.find(v => v.name === selectedVoiceName);
      }

      if (!chosenVoice) {
        if (persona === 'bachchan') {
          const maleKeywords = ["rishi", "karan", "ravi", "hemant", "male", "daniel", "alex", "en-in", "hi-in"];
          chosenVoice = voices.find(v => maleKeywords.some(kw => v.name.toLowerCase().includes(kw) || v.lang.toLowerCase().includes(kw)));
        } else if (persona === 'female') {
          const femaleKeywords = ["veena", "aditi", "raveena", "heera", "neerja", "kalpana", "samantha", "en-in", "hi-in"];
          chosenVoice = voices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw) || v.lang.toLowerCase().includes(kw)));
        }
        if (!chosenVoice) chosenVoice = voices.find(v => v.lang.startsWith("en"));
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current = utterance;

      if (!isMuted) {
        window.speechSynthesis.speak(utterance);
      }
    };

    const timer = setTimeout(speakWithVoice, 400);

    return () => {
      clearTimeout(timer);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [userName, assignedTaskCount, unreadNoticeCount, shiftStatusStr, isMuted, selectedVoiceName, persona]);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0.03, audioCtxRef.current.currentTime);
      }
      if (synthRef.current && window.speechSynthesis) {
        window.speechSynthesis.speak(synthRef.current);
      }
    } else {
      setIsMuted(true);
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  const handleEnterDashboard = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 text-white backdrop-blur-xl overflow-hidden animate-fade-in font-sans">
      {/* Animated Glowing Gradient Waves Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] animate-spin-slow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />

        {/* Dynamic Wavy Mesh Lines SVG overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path 
            d="M 0,150 C 300,300 600,0 900,150 C 1200,300 1500,0 1800,150 L 1800,900 L 0,900 Z" 
            fill="none" 
            stroke="url(#waveGrad)" 
            strokeWidth="1.5"
            className="animate-wave-path"
          />
          <path 
            d="M 0,250 C 350,100 650,400 950,200 C 1250,50 1550,350 1850,200 L 1850,900 L 0,900 Z" 
            fill="none" 
            stroke="url(#waveGrad)" 
            strokeWidth="1"
            opacity="0.6"
            className="animate-wave-path-reverse"
          />
        </svg>
      </div>

      {/* Briefing Container */}
      <div className="relative z-10 max-w-2xl w-full mx-4 bg-slate-900/80 border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">AI Daily Executive Briefing</span>
              <h2 className="text-2xl font-black text-white tracking-tight">Welcome, {userName}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {availableVoices.length > 0 && (
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:border-indigo-500 max-w-[170px] truncate cursor-pointer"
                title="Select System Voice"
              >
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold ${
                isMuted 
                  ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" 
                  : "bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30"
              }`}
              title={isMuted ? "Unmute Voice Briefing" : "Mute Voice Briefing"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
              <span>{isMuted ? "Muted" : isSpeaking ? "Speaking..." : "Audio Active"}</span>
            </button>
          </div>
        </div>

        {/* Persona Switcher Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => {
              setPersona('bachchan');
              setSelectedVoiceName('');
            }}
            className={`w-full sm:flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              persona === 'bachchan'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎙️ Amitabh Bachchan (KBC Baritone)</span>
          </button>

          <button
            onClick={() => {
              setPersona('female');
              setSelectedVoiceName('');
            }}
            className={`w-full sm:flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              persona === 'female'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👩 Indian Female (Veena / Aditi)</span>
          </button>

          <button
            onClick={() => {
              setPersona('standard');
              setSelectedVoiceName('');
            }}
            className={`w-full sm:flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              persona === 'standard'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🤖 Executive AI</span>
          </button>
        </div>

        {/* Audio Wave Visualizer Indicator */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-1 h-5">
              <span className={`w-1 bg-indigo-500 rounded-full transition-all ${isSpeaking ? 'h-5 animate-bounce' : 'h-2'}`} />
              <span className={`w-1 bg-indigo-400 rounded-full transition-all ${isSpeaking ? 'h-3 animate-bounce' : 'h-1.5'}`} style={{ animationDelay: '0.15s' }} />
              <span className={`w-1 bg-purple-500 rounded-full transition-all ${isSpeaking ? 'h-6 animate-bounce' : 'h-2'}`} style={{ animationDelay: '0.3s' }} />
              <span className={`w-1 bg-sky-400 rounded-full transition-all ${isSpeaking ? 'h-4 animate-bounce' : 'h-1.5'}`} style={{ animationDelay: '0.45s' }} />
            </div>
            <p className="text-xs text-slate-300 font-medium italic">
              {isSpeaking ? '"Generating audio voice summary for your day..."' : '"Briefing ready. Have a productive day!"'}
            </p>
          </div>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            NexusHR AI Voice v2.4
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-2 hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Assigned Tasks</span>
              <Briefcase className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-3xl font-black text-white">{assignedTaskCount}</p>
            <span className="text-[10px] text-indigo-400 font-semibold">Active in PMS</span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-2 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Alerts & Notices</span>
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-black text-white">{unreadNoticeCount}</p>
            <span className="text-[10px] text-amber-400 font-semibold">Unread Notifications</span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-2 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Shift Status</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-emerald-400 mt-2 truncate">{shiftStatusStr}</p>
            <span className="text-[10px] text-slate-400 font-semibold">Daily Attendance</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-5">
          <p className="text-xs text-slate-400 font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">ESC</kbd> or click enter to open workspace
          </p>

          <Button
            onClick={handleEnterDashboard}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-2.5 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 group transition-all"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
