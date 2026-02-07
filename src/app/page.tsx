
"use client";

import { useState, useEffect } from "react";
import { GatewayScreen } from "@/components/gateway-screen";
import { VerificationScreen } from "@/components/verification-screen";
import { ChatRoom } from "@/components/chat-room";

export default function Home() {
  const [phase, setPhase] = useState<"gateway" | "verification" | "chat">("gateway");
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  const handleGatewaySuccess = () => {
    setPhase("verification");
  };

  const handleVerificationSuccess = (key: string) => {
    setSessionKey(key);
    setPhase("chat");
  };

  const handleSessionEnd = () => {
    setSessionKey(null);
    setPhase("gateway");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dynamic phase rendering */}
      {phase === "gateway" && <GatewayScreen onUnlock={handleGatewaySuccess} />}
      {phase === "verification" && <VerificationScreen onVerify={handleVerificationSuccess} />}
      {phase === "chat" && sessionKey && (
        <ChatRoom 
          sessionKey={sessionKey} 
          onLogout={handleSessionEnd} 
          isAdmin={sessionKey === "ADMIN_BYPASS_LOGS"} 
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
