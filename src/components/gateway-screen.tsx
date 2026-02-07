
"use client";

import { useState, useEffect, useRef } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface GatewayScreenProps {
  onUnlock: (isAdminMode: boolean) => void;
}

export function GatewayScreen({ onUnlock }: GatewayScreenProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [logoExists, setLogoExists] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();

  const gatewayRef = useMemoFirebase(() => doc(db, "gateway", "default"), [db]);
  const { data: gatewayData } = useDoc(gatewayRef);

  useEffect(() => {
    inputRef.current?.focus();
    const handleGlobalClick = () => inputRef.current?.focus();
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSequence = gatewayData?.gatewayAddress || "raven.oracle";
    const adminSequence = gatewayData?.adminAddress || "raven.admin";
    
    const submitted = input.toLowerCase().trim();

    if (submitted === adminSequence.toLowerCase()) {
      onUnlock(true); // Admin Bypass Mode
    } else if (submitted === targetSequence.toLowerCase()) {
      onUnlock(false); // Operative Mode
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-background p-4 animate-fade-in font-body">
      <div className="mb-8 flex flex-col items-center justify-center group">
        
        {/* Logo Container - Explicitly targeting /logo.jpeg at project root */}
        <div className="mb-8 relative w-40 h-40 flex flex-col items-center justify-center">
          {logoExists ? (
            <img 
              src="/logo.jpeg" 
              alt="IDENTITY_EMBLEM" 
              className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-110 drop-shadow-[0_0_20px_rgba(0,255,255,0.4)]"
              onError={() => setLogoExists(false)}
            />
          ) : (
            <div className="w-full h-full border border-dashed border-primary/30 rounded-lg flex items-center justify-center animate-pulse">
               <div className="flex flex-col items-center text-center space-y-2 p-4">
                 <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Identity_Link_Pending</span>
                 <span className="text-[8px] text-primary/40 uppercase tracking-[0.1em]">
                   Drop logo.jpeg into<br/>root public/ folder
                 </span>
               </div>
            </div>
          )}
        </div>

        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="relative flex items-baseline space-x-1">
            <span className="text-6xl font-bold text-primary glow-cyan transition-all duration-500 group-hover:scale-110">
              &gt;
            </span>
            <span className="w-8 h-2 bg-primary animate-pulse shadow-[0_0_15px_hsl(180,100%,50%)]" />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md bg-[#0a0510]/80 border border-primary/20 p-8 rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-primary text-[11px] font-bold tracking-widest uppercase mb-6">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(180,100%,50%)] animate-pulse" />
          <span>GATEWAY_STATUS: ACTIVE</span>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-8 opacity-80">
          The shadows await. State the sequence to proceed.
        </p>

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center space-x-3 font-mono text-lg">
            <span className="text-primary font-bold">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-muted/20 ${error ? 'text-destructive' : ''} tracking-wider uppercase`}
              placeholder="type sequence..."
              autoFocus
            />
            <span className="terminal-cursor" />
          </div>
          {error && (
            <p className="text-destructive text-[10px] mt-4 font-bold tracking-tighter uppercase animate-bounce">
              ACCESS_DENIED: SEQUENCE_MISMATCH
            </p>
          )}
        </form>
      </div>

      <div className="mt-12 flex flex-col items-center space-y-2">
        <p className="text-muted-foreground text-[10px] tracking-[0.3em] uppercase opacity-30 font-bold">
          Requires Oracle Authentication Sequence
        </p>
        <p className="text-primary text-[10px] tracking-[0.5em] uppercase opacity-20 font-bold animate-pulse">
          warrior
        </p>
      </div>
    </div>
  );
}
