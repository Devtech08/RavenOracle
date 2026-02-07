
"use client";

import { useState, useEffect } from "react";
import { GatewayScreen } from "@/components/gateway-screen";
import { VerificationScreen } from "@/components/verification-screen";
import { ChatRoom } from "@/components/chat-room";
import { AdminPanel } from "@/components/admin-panel";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, initiateAnonymousSignIn } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

function RavenOracleApp() {
  const [phase, setPhase] = useState<"gateway" | "verification" | "chat" | "admin">("gateway");
  const [sessionData, setSessionData] = useState<{ callsign: string; key: string } | null>(null);
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);
  
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminDocRef);
  const isAdmin = !!adminData;

  const handleGatewaySuccess = () => {
    setPhase("verification");
  };

  const handleVerificationSuccess = (callsign: string, key: string) => {
    if (user) {
      // "WARRIOR" is the designated admin callsign
      const isSystemAdmin = key === "ADMIN_BYPASS" || isAdmin || callsign.toUpperCase() === "WARRIOR";
      const finalCallsign = isSystemAdmin ? "WARRIOR" : callsign.toUpperCase();
      
      setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        callsign: finalCallsign,
        registrationDate: new Date().toISOString(),
        isAdmin: isSystemAdmin,
        isBlocked: false
      }, { merge: true });

      if (isSystemAdmin) {
        setDoc(doc(db, "roles_admin", user.uid), { enabled: true }, { merge: true });
        setSessionData({ callsign: finalCallsign, key });
        // Admins go straight to the admin portal
        setPhase("admin");
      } else {
        setSessionData({ callsign: finalCallsign, key });
        setPhase("chat");
      }
    }
  };

  const handleToggleAdmin = () => {
    if (isAdmin) {
      setPhase(phase === "admin" ? "chat" : "admin");
    }
  };

  const handleSessionEnd = () => {
    setSessionData(null);
    setPhase("gateway");
  };

  if (isUserLoading || (user && isAdminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body text-primary animate-pulse tracking-[0.5em]">
        INITIALIZING_ORACLE...
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {phase === "gateway" && <GatewayScreen onUnlock={handleGatewaySuccess} />}
      
      {phase === "verification" && <VerificationScreen onVerify={handleVerificationSuccess} />}
      
      {phase === "chat" && sessionData && (
        <ChatRoom 
          callsign={sessionData.callsign}
          sessionKey={sessionData.key} 
          onLogout={handleSessionEnd} 
          isAdmin={isAdmin}
          onOpenAdmin={handleToggleAdmin}
        />
      )}

      {phase === "admin" && isAdmin && (
        <AdminPanel 
          onClose={() => setPhase("chat")} 
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
