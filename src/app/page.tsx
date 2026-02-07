
"use client";

import { useState, useEffect } from "react";
import { GatewayScreen } from "@/components/gateway-screen";
import { VerificationScreen } from "@/components/verification-screen";
import { ChatRoom } from "@/components/chat-room";
import { AdminPanel } from "@/components/admin-panel";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, initiateAnonymousSignIn, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

function RavenOracleApp() {
  const [phase, setPhase] = useState<"gateway" | "verification" | "chat" | "admin">("gateway");
  const [isAdminEntry, setIsAdminEntry] = useState(false);
  const [sessionData, setSessionData] = useState<{ callsign: string; key: string } | null>(null);
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: userData } = useDoc(userDocRef);

  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);
  const { data: adminData } = useDoc(adminDocRef);

  // Enforce Termination: If a user is blocked, force them out
  useEffect(() => {
    if (userData?.isBlocked && phase !== "gateway") {
      setPhase("gateway");
      setSessionData(null);
      setIsAdminEntry(false);
      toast({ 
        variant: "destructive", 
        title: "ACCESS_TERMINATED", 
        description: "Your identification has been purged from the active session by an administrator." 
      });
    }
  }, [userData, phase, toast]);
  
  // Consolidate admin authority
  const isUserAdmin = !!adminData || isAdminEntry || (sessionData?.callsign === "WARRIOR");

  const handleGatewaySuccess = (isAdminMode: boolean) => {
    setIsAdminEntry(isAdminMode);
    setPhase("verification");
  };

  const handleVerificationSuccess = (callsign: string, key: string) => {
    if (user) {
      const isSystemAdmin = isAdminEntry || key === "ADMIN_BYPASS" || key === "WARRIOR_ENTRY" || isUserAdmin || callsign.toUpperCase() === "WARRIOR";
      const finalCallsign = isSystemAdmin ? "WARRIOR" : callsign.toUpperCase();
      
      setDocumentNonBlocking(doc(db, "users", user.uid), {
        id: user.uid,
        callsign: finalCallsign,
        registrationDate: new Date().toISOString(),
        isAdmin: isSystemAdmin,
        isBlocked: false
      }, { merge: true });

      if (isSystemAdmin) {
        setDocumentNonBlocking(doc(db, "roles_admin", user.uid), { enabled: true, callsign: finalCallsign }, { merge: true });
        setSessionData({ callsign: finalCallsign, key: key || "ADMIN_SESSION" });
        
        if (isAdminEntry) {
          setPhase("admin");
        } else {
          setPhase("chat");
        }
      } else {
        setSessionData({ callsign: finalCallsign, key });
        setPhase("chat");
      }
    }
  };

  const handleToggleAdmin = () => {
    if (isUserAdmin) {
      setPhase(phase === "admin" ? "chat" : "admin");
    }
  };

  const handleSessionEnd = () => {
    setSessionData(null);
    setIsAdminEntry(false);
    setPhase("gateway");
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body text-primary animate-pulse tracking-[0.5em]">
        INITIALIZING_ORACLE...
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {phase === "gateway" && <GatewayScreen onUnlock={handleGatewaySuccess} />}
      
      {phase === "verification" && <VerificationScreen onVerify={handleVerificationSuccess} isAdminMode={isAdminEntry} />}
      
      {phase === "chat" && sessionData && (
        <ChatRoom 
          callsign={sessionData.callsign}
          sessionKey={sessionData.key} 
          onLogout={handleSessionEnd} 
          isAdmin={isUserAdmin}
          onOpenAdmin={handleToggleAdmin}
        />
      )}

      {phase === "admin" && isUserAdmin && (
        <AdminPanel 
          isRegistryAdmin={!!adminData}
          onClose={handleSessionEnd} 
          onReturnToChat={handleToggleAdmin}
        />
      )}
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] opacity-30">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[120px]" />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <FirebaseClientProvider>
      <RavenOracleApp />
    </FirebaseClientProvider>
  );
}
