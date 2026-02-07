
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerificationScreenProps {
  onVerify: (key: string) => void;
}

export function VerificationScreen({ onVerify }: VerificationScreenProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulating a verification delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Valid codes for demo
    if (code === "0000" || code === "raven-secure" || code === "admin") {
      const sessionKey = code === "admin" ? "ADMIN_BYPASS_LOGS" : `KEY_${Math.random().toString(36).substring(7)}`;
      onVerify(sessionKey);
    } else {
      toast({
        variant: "destructive",
        title: "AUTHENTICATION_FAILED",
        description: "The provided secret key is invalid. Session terminated.",
      });
      setCode("");
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-sm p-8 bg-card border border-border rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-up space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-4 bg-secondary rounded-full mb-2">
          <Key className="w-8 h-8 text-primary glow-cyan" />
        </div>
        <h2 className="text-xl font-bold text-primary uppercase tracking-tighter">Enter Secret Key</h2>
        <p className="text-muted-foreground text-xs">
          A unique session key is required for end-to-end encryption.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="••••••••"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-secondary/50 border-border text-center tracking-widest text-lg h-12"
            autoFocus
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading || !code}
          className="w-full h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground border-glow-cyan transition-all"
        >
          {isLoading ? "Encrypting..." : "Connect Session"}
        </Button>
      </form>

      <div className="pt-4 flex items-start space-x-2 text-[10px] text-muted-foreground border-t border-border/30">
        <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
        <p>
          Warning: Sessions are transient. All non-admin logs will be purged immediately upon disconnect. E2EE is active.
        </p>
      </div>
    </div>
  );
}
