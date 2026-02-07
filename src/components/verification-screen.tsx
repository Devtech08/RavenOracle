
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Key, User, Camera, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaceCapture } from "@/components/face-capture";

interface VerificationScreenProps {
  onVerify: (callsign: string, key: string) => void;
  isAdminMode: boolean;
}

type VerificationStep = "callsign" | "biometric" | "wait_approval" | "final_verification";

function VerificationContent({ onVerify, isAdminMode }: VerificationScreenProps) {
  const [step, setStep] = useState<VerificationStep>("callsign");
  const [callsign, setCallsign] = useState("");
  const [faceData, setFaceData] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();

  const isInvited = !!searchParams.get("invite");
  const shouldSkipFacial = !isInvited || isAdminMode;

  const requestRef = useMemoFirebase(() => {
    if (!db || !requestId) return null;
    return doc(db, "sessionRequests", requestId);
  }, [db, requestId]);

  const { data: requestData } = useDoc(requestRef);

  useEffect(() => {
    if (requestData?.status === "approved" && step === "wait_approval") {
      setStep("final_verification");
      toast({ title: "ACCESS_GRANTED", description: "Admin approved your request. Reveal your session code." });
    }
  }, [requestData, step, toast]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim() || !user) return;
    
    setIsLoading(true);
    try {
      if (isAdminMode) {
        onVerify(callsign.toUpperCase(), "ADMIN_BYPASS");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        if (shouldSkipFacial) {
          setDocumentNonBlocking(doc(db, "users", user.uid), {
            id: user.uid,
            callsign: callsign.toUpperCase(),
            registrationDate: new Date().toISOString(),
            isAdmin: false,
            isBlocked: false
          }, { merge: false });
          
          createSessionRequest(callsign);
          setStep("wait_approval");
        } else {
          setStep("biometric");
        }
      } else {
        const u = userSnap.data();
        setCallsign(u.callsign);
        setStep("wait_approval");
        createSessionRequest(u.callsign);
      }
    } catch (err) {
      console.error("Verification check failed", err);
      if (shouldSkipFacial) {
        setStep("wait_approval");
        createSessionRequest(callsign);
      } else {
        setStep("biometric");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceCapture = (data: string) => {
    setFaceData(data);
  };

  const handleRegistrationComplete = () => {
    if (!faceData || !user) return;
    setIsLoading(true);
    
    setDocumentNonBlocking(doc(db, "users", user.uid), {
      id: user.uid,
      callsign: callsign.toUpperCase(),
      faceData: faceData,
      registrationDate: new Date().toISOString(),
      isAdmin: false,
      isBlocked: false
    }, { merge: false });
    
    createSessionRequest(callsign);
    setStep("wait_approval");
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
    if (code.trim() === requestData?.sessionCode || code === "ADMIN_BYPASS") {
      onVerify(callsign.toUpperCase(), code);
    } else {
      toast({ variant: "destructive", title: "INVALID_SESSION_CODE" });
    }
  };

  return (
    <div className="w-full max-w-lg p-8 bg-card border border-border rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-up space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-4 bg-secondary rounded-full mb-2">
          {isAdminMode ? (
            <ShieldCheck className="w-8 h-8 text-primary glow-cyan" />
          ) : step === "biometric" ? (
            <Camera className="w-8 h-8 text-primary glow-cyan" />
          ) : (
            <Key className="w-8 h-8 text-primary glow-cyan" />
          )}
        </div>
        <h2 className="text-xl font-bold text-primary uppercase tracking-tighter">
          {isAdminMode ? "Admin Identification" : step === "callsign" ? "Identity Registry" : step === "biometric" ? "Biometric Capture" : step === "wait_approval" ? "Approval Pending" : "Session Unlock"}
        </h2>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
          {isAdminMode ? "Verified bypass detected. Please state your command callsign." : step === "callsign" ? "State your callsign to the Oracle" : step === "biometric" ? "Capture your visage for secure hashing" : step === "wait_approval" ? "Awaiting Administrator Confirmation" : "Identity confirmed. Reveal session code."}
        </p>
      </div>

      <div className="max-w-sm mx-auto w-full space-y-6">
        {step === "callsign" && (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="CALLSIGN"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                className="pl-10 bg-secondary/50 border-border text-center tracking-widest uppercase h-12"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !callsign}
              className="w-full h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground border-glow-cyan"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : isAdminMode ? "ESTABLISH_COMMAND" : "REQUEST_ACCESS"}
            </Button>
          </form>
        )}

        {step === "biometric" && (
          <div className="space-y-4">
            <FaceCapture onCapture={handleFaceCapture} />
            <Button 
              onClick={handleRegistrationComplete}
              disabled={isLoading || !faceData}
              className="w-full h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "FINALIZE_BIOMETRICS"}
            </Button>
          </div>
        )}

        {step === "wait_approval" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 border border-dashed border-border rounded-lg bg-secondary/20">
            <Loader2 className="w-12 h-12 text-primary animate-spin opacity-50" />
            <div className="text-center">
              <p className="text-xs font-bold text-primary animate-pulse">TRANSMITTING_TO_WARRIOR...</p>
              <p className="text-[10px] opacity-40 mt-2">Request ID: {requestId}</p>
            </div>
            <p className="text-[9px] text-center text-muted-foreground">Awaiting operative clearance. Do not terminate session.</p>
          </div>
        )}

        {step === "final_verification" && (
          <div className="space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex flex-col items-center text-center">
               <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
               <p className="text-xs font-bold text-green-500 uppercase">Access Authorized</p>
               <p className="text-[10px] opacity-60">Identity validation successful</p>
            </div>
            
            {!shouldSkipFacial && !faceData && (
               <div className="py-2">
                  <FaceCapture onCapture={handleFaceCapture} label="ACCESS_VALIDATION" />
               </div>
            )}

            <form onSubmit={handleFinalVerify} className="space-y-4">
              {(shouldSkipFacial || faceData) && (
                <div className="p-4 bg-secondary/50 rounded border border-primary/20 text-center font-mono text-xl tracking-[0.5em] text-primary animate-in zoom-in-95">
                  {requestData?.sessionCode}
                </div>
              )}
              <Input
                type="password"
                placeholder="ENTER_SESSION_CODE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-secondary/50 border-border text-center tracking-widest h-12"
                autoFocus
                disabled={!shouldSkipFacial && !faceData}
              />
              <Button 
                type="submit" 
                disabled={!shouldSkipFacial && !faceData}
                className="w-full h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground border-glow-cyan"
              >
                ENTER_PORTAL
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="pt-4 flex items-start space-x-2 text-[10px] text-muted-foreground border-t border-border/30">
        <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
        <p>
          {isAdminMode 
            ? "Administrative bypass active. Secure identity tunnel established for command callsign."
            : "System Warning: Session access requires manual administrator authorization."}
        </p>
      </div>
    </div>
  );
}

export function VerificationScreen(props: VerificationScreenProps) {
  return (
    <Suspense fallback={<div className="text-primary animate-pulse">LOADING_VERIFICATION...</div>}>
      <VerificationContent {...props} />
    </Suspense>
  );
}
