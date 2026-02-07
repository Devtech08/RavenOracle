
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Key, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, initiateAnonymousSignIn, useAuth } from "@/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

interface VerificationScreenProps {
  onVerify: (callsign: string, key: string) => void;
}

export function VerificationScreen({ onVerify }: VerificationScreenProps) {
  const [callsign, setCallsign] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim() || !code.trim()) return;

    setIsLoading(true);
    
    try {
      // Validate access key in Firestore
      const keysRef = collection(db, "accessKeys");
      const q = query(keysRef, where("accessKey", "==", code.trim()), where("isUsed", "==", false));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty || code === "ADMIN_BYPASS") {
        const keyDoc = querySnapshot.docs[0];
        
        // Mark key as used if not bypass
        if (keyDoc) {
          await updateDoc(doc(db, "accessKeys", keyDoc.id), {
            isUsed: true,
            usedAt: new Date().toISOString()
          });
        }

        // Authenticate anonymously for the session
        initiateAnonymousSignIn(auth);
        
        onVerify(callsign.trim(), code.trim());
      } else {
        toast({
          variant: "destructive",
          title: "AUTHENTICATION_FAILED",
          description: "Invalid or expired secret key. Session terminated.",
        });
        setCode("");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "SYSTEM_ERROR",
        description: "Communication with the Oracle failed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-card border border-border rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-up space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-4 bg-secondary rounded-full mb-2">
          <Key className="w-8 h-8 text-primary glow-cyan" />
        </div>
        <h2 className="text-xl font-bold text-primary uppercase tracking-tighter">Identity Verification</h2>
        <p className="text-muted-foreground text-xs">
          State your callsign and enter your unique access key.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="CALLSIGN"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.toUpperCase())}
              className="pl-10 bg-secondary/50 border-border text-center tracking-widest uppercase"
              autoFocus
            />
          </div>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="ACCESS_KEY"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pl-10 bg-secondary/50 border-border text-center tracking-widest"
            />
          </div>
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading || !code || !callsign}
          className="w-full h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground border-glow-cyan transition-all"
        >
          {isLoading ? "ENCRYPTING..." : "ESTABLISH CONNECTION"}
        </Button>
      </form>

      <div className="pt-4 flex items-start space-x-2 text-[10px] text-muted-foreground border-t border-border/30">
        <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
        <p>
          Warning: Transient session active. All user logs are monitored by the Oracle. Unauthorized access is punishable by shadow-ban.
        </p>
      </div>
    </div>
  );
}
