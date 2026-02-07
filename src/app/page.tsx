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

  // Ensure user is signed in anonymously to interact with basic Firestore rules
  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  // Check if current user is admin
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
    // Finalize user registration in Firestore
    if (user) {
      const userRef = doc(db, "users", user.uid);
      setDoc(userRef, {
        id: user.uid,
        callsign: callsign.toUpperCase(),
        registrationDate: new Date().toISOString(),
        isAdmin: false,
        isBlocked: false
      }, { merge: true });
    }

    setSessionData({ callsign, key });
    setPhase("chat");
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
      <div className="min-h-screen flex items-center justify-center bg-background font-body text-primary animate-pulse">
        INITIALIZING_ORACLE...
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
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
      
      {/* Background ambient glow elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary rounded-full blur-[150px]" />
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
