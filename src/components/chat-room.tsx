
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  ShieldCheck, 
  LogOut, 
  Eye, 
  Trash2, 
  User, 
  Ghost,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender: string;
  content: string; // This would be the encrypted text in a real app
  timestamp: string;
  isMe: boolean;
}

interface ChatRoomProps {
  sessionKey: string;
  isAdmin: boolean;
  onLogout: () => void;
}

export function ChatRoom({ sessionKey, isAdmin, onLogout }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load initial welcome message
  useEffect(() => {
    const welcome: Message = {
      id: "system-1",
      sender: "ORACLE",
      content: isAdmin 
        ? "ADMIN_ACCESS_GRANTED. All past logs decrypted for review."
        : "ENCRYPTED_CHANNEL_ESTABLISHED. Communication is now secure.",
      timestamp: new Date().toLocaleTimeString(),
      isMe: false,
    };
    setMessages([welcome]);
  }, [isAdmin]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: isAdmin ? "ADMIN" : "USER",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: `reply-${Date.now()}`,
        sender: "ORACLE",
        content: `Acknowledged. Data sequence ${Math.random().toString(36).substring(7).toUpperCase()} recorded.`,
        timestamp: new Date().toLocaleTimeString(),
        isMe: false,
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  const handleLogout = () => {
    if (!isAdmin) {
      toast({
        title: "SESSION_PURGED",
        description: "All local and server-side logs for this session have been deleted.",
      });
    }
    onLogout();
  };

  return (
    <div className="flex flex-col w-full h-screen max-w-4xl bg-card/80 backdrop-blur-xl border-x border-border shadow-2xl animate-fade-in">
      {/* Header */}
      <header className="p-4 border-b border-border bg-secondary/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Lock className="w-5 h-5 text-primary glow-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-primary">Raven Oracle</h1>
            <div className="flex items-center space-x-2 text-[10px] text-muted-foreground uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Session: {isAdmin ? "ADMIN_LOG_REVIEW" : "E2EE_ACTIVE"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Badge variant="outline" className="border-primary text-primary text-[10px] px-2 py-0">
              LOGS_VISIBLE
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Terminate</span>
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-slide-up`}
            >
              <div className="flex items-center space-x-2 mb-1 px-1">
                {!msg.isMe && <Ghost className="w-3 h-3 text-primary" />}
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {msg.sender}
                </span>
                <span className="text-[10px] opacity-40">{msg.timestamp}</span>
              </div>
              <div 
                className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed border ${
                  msg.isMe 
                    ? 'bg-primary text-primary-foreground border-primary/20 rounded-tr-none' 
                    : 'bg-secondary text-foreground border-border rounded-tl-none'
                } shadow-lg`}
              >
                {msg.content}
              </div>
              {isAdmin && !msg.isMe && (
                <div className="mt-1 px-1 flex items-center space-x-1 opacity-40">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span className="text-[8px] uppercase">Integrity Verified</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="p-4 border-t border-border bg-secondary/30">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAdmin ? "Reviewing logs... (Input disabled)" : "Communicate with the shadows..."}
            className="flex-1 bg-background/50 border-border focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
            disabled={isAdmin}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isAdmin}
            className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg border-glow-cyan"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[8px] text-muted-foreground uppercase tracking-widest px-1">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
            </div>
            <span>Encrypted Layer v4.2.0</span>
          </div>
          <span>Total Packets: {messages.length * 128} KB</span>
        </div>
      </footer>
    </div>
  );
}
