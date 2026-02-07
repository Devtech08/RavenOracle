
"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface GatewayScreenProps {
  onUnlock: () => void;
}

export function GatewayScreen({ onUnlock }: GatewayScreenProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();

  // Fetch dynamic gateway sequence from Firestore
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
    
    if (input.toLowerCase().trim() === targetSequence.toLowerCase()) {
      onUnlock();
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md p-8 animate-fade-in">
      <div className="mb-8 relative group">
        <div className="absolute inset-0 bg-primary opacity-20 blur-2xl group-hover:opacity-40 transition-opacity" />
        <Terminal className="w-16 h-16 text-primary glow-cyan relative z-10" />
      </div>

      <div className="w-full bg-secondary border border-border p-6 rounded-lg shadow-2xl space-y-4">
        <div className="flex items-center space-x-2 text-primary text-sm opacity-80">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>GATEWAY_STATUS: ACTIVE</span>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed">
          The shadows await. To proceed, identify yourself to the Oracle.
        </p>

        <form onSubmit={handleSubmit} className="relative mt-4">
          <div className="flex items-center space-x-2 font-mono text-lg">
            <span className="text-primary">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-muted/30 ${error ? 'text-destructive' : ''}`}
              placeholder="type sequence..."
              autoFocus
            />
            <span className="terminal-cursor" />
          </div>
          {error && (
            <p className="text-destructive text-xs mt-2 animate-bounce">
              ACCESS_DENIED: SEQUENCE_MISMATCH
            </p>
          )}
        </form>
      </div>

      <p className="mt-8 text-muted-foreground text-[10px] tracking-widest uppercase opacity-50">
        Requires Oracle Authentication Sequence
      </p>
    </div>
  );
}
