
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Key, User, Camera, Loader2, CircleCheck, ShieldCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { FaceCapture } from "@/components/face-capture";
import { Badge } from "@/components/ui/badge";

interface VerificationScreenProps {
  onVerify: (callsign: string, key: string) => void;
  isAdminMode: boolean;
}

type VerificationStep = "callsign" | "wait_approval" | "biometric" | "final_verification";

function VerificationContent({ onVerify, isAdminMode }: VerificationScreenProps) {
  const [step, setStep] = useState<VerificationStep>("callsign");
  const [callsign, setCallsign] = useState("");
  const [faceData, setFaceData] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();

  const inviteKey = searchParams.get("invite");
  const isWarrior = callsign.trim().toUpperCase() === "WARRIOR";
  const isBypass = isAdminMode || isWarrior;

  useEffect(() => {
    async function validateInvite() {
      if (!inviteKey || !db) return;
      const q = query(collection(db, "accessKeys"), where("accessKey", "==", inviteKey), where("isUsed", "==", false));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setInviteValid(true);
      } else {
        setInviteValid(false);
      }
    }
    validateInvite();
  }, [inviteKey, db]);

  const requestRef = useMemoFirebase(() => {
    if (!db || !requestId) return null;
    return doc(db, "sessionRequests", requestId);
  }, [db, requestId]);

  const { data: requestData } = useDoc(requestRef);

  // Transition from Approval to Biometric
  useEffect(() => {
    if (requestData?.status === "approved" && step === "wait_approval") {
      setStep("biometric");
      toast({ title: "ACCESS_AUTHORIZED", description: "Admin has cleared your request. Biometric confirmation required." });
    }
  }, [requestData, step, toast]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCallsign = callsign.trim().toUpperCase();
    if (!cleanCallsign || !user) return;
    
    setIsLoading(true);
    if (isBypass) {
      onVerify(cleanCallsign, isAdminMode ? "ADMIN_BYPASS" : "WARRIOR_ENTRY");
      return;
    }

    createSessionRequest(cleanCallsign);
    setStep("wait_approval");
    setIsLoading(false);
  };

  const handleRegistrationComplete = () => {
    if (!faceData || !user) return;
    setIsLoading(true);
    
    // Update user with biometric data upon approval
    setDocumentNonBlocking(doc(db, "users", user.uid), {
      faceData: faceData,
      lastVerification: new Date().toISOString()
    }, { merge: true });

    setStep("final_verification");
    setIsLoading(false);
  };

  const createSessionRequest = (name: string) => {
    if (!user) return;
    const reqId = Math.random().toString(36).substring(7);
    setDocumentNonBlocking(doc(db, "sessionRequests", reqId), {
      id: reqId,
      userId: user.uid,
      callsign: name.toUpperCase(),
      status: "pending",
      timestamp: new Date().toISOString()
    }, { merge: false });
    setRequestId(reqId);
  };

  const handleFinalVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === requestData?.sessionCode) {
      onVerify(callsign.toUpperCase(), code);
    } else {
      toast({ variant: "destructive", title: "INVALID_SESSION_CODE" });
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-card/90 border border-primary/20 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-slide-up space-y-6 backdrop-blur-md">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-4 bg-secondary/50 rounded-full mb-2 border border-primary/10">
          {isBypass ? (
            <ShieldCheck className="w-8 h-8 text-primary glow-cyan" />
          ) : step === "biometric" ? (
            <Camera className="w-8 h-8 text-primary glow-cyan" />
          ) : step === "wait_approval" ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Key className="w-8 h-8 text-primary glow-cyan" />
          )}
        </div>
        <h2 className="text-lg font-bold text-primary uppercase tracking-widest">
          {isBypass ? "Command ID" : step === "callsign" ? "Identity Registry" : step === "wait_approval" ? "Approval Queue" : step === "biometric" ? "Biometric Link" : "Access Key"}
        </h2>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest leading-relaxed">
          {isBypass ? "Verified bypass active. State command callsign." : 
           step === "callsign" ? "State your callsign for the Oracle's ledger." : 
           step === "wait_approval" ? "Awaiting manual authorization from WARRIOR." : 
           step === "biometric" ? "Approval confirmed. Link visage to approved session." : 
           "Identity linked. Enter the session unlock code."}
        </p>
      </div>

      <div className="space-y-6">
        {step === "callsign" && (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <Input
                type="text"
                placeholder="CALLSIGN"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                className="pl-10 bg-secondary/30 border-primary/20 text-center tracking-widest uppercase h-11 text-xs"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !callsign}
              className="w-full h-11 font-bold uppercase tracking-widest bg-primary text-primary-foreground text-[10px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isBypass ? "ESTABLISH_COMMAND" : "REQUEST_PORTAL_ACCESS"}
            </Button>
          </form>
        )}

        {step === "wait_approval" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 border border-dashed border-primary/20 rounded bg-secondary/10">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-bold text-primary animate-pulse tracking-widest">TRANSMITTING_TO_ORACLE...</p>
              <p className="text-[8px] opacity-40 font-mono tracking-tighter">REQ_ID: {requestId}</p>
            </div>
          </div>
        )}

        {step === "biometric" && (
          <div className="space-y-4">
            <FaceCapture onCapture={setFaceData} label="SESSION_LINK_SCAN" />
            <Button 
              onClick={handleRegistrationComplete}
              disabled={isLoading || !faceData}
              className="w-full h-11 font-bold uppercase tracking-widest bg-primary text-primary-foreground text-[10px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "FINALIZE_SESSION_LINK"}
            </Button>
          </div>
        )}

        {step === "final_verification" && (
          <div className="space-y-6">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded flex flex-col items-center text-center">
               <CircleCheck className="w-6 h-6 text-primary mb-2 glow-cyan" />
               <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Biometrics Verified</p>
            </div>
            
            <form onSubmit={handleFinalVerify} className="space-y-4">
              <Input
                type="password"
                placeholder="SESSION_CODE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-secondary/30 border-primary/20 text-center tracking-[0.5em] h-11 text-lg font-mono"
                autoFocus
              />
              <Button 
                type="submit" 
                className="w-full h-11 font-bold uppercase tracking-widest bg-primary text-primary-foreground text-[10px] shadow-[0_0_15px_rgba(0,255,255,0.2)]"
              >
                ENTER_PORTAL
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="pt-4 flex items-start space-x-3 text-[9px] text-muted-foreground border-t border-primary/10">
        <ShieldAlert className="w-3 h-3 text-primary shrink-0 opacity-50" />
        <p className="uppercase tracking-tighter opacity-60">
          {isBypass
            ? "Administrative bypass active. Secure identity tunnel established for command callsign."
            : "All operative sessions require manual Warrior authorization and biometric visage-linking."}
        </p>
      </div>
    </div>
  );
}

export function VerificationScreen(props: VerificationScreenProps) {
  return (
    <Suspense fallback={<div className="text-primary animate-pulse font-mono text-[10px]">SYNCING_WITH_ORACLE...</div>}>
      <VerificationContent {...props} />
    </Suspense>
  );
}
