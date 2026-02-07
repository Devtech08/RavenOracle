
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Send, 
  LogOut, 
  Ghost,
  Lock,
  Settings,
  User,
  History,
  Target,
  ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp } from "firebase/firestore";

interface ChatRoomProps {
  callsign: string;
  sessionKey: string;
  isAdmin: boolean;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export function ChatRoom({ callsign: initialCallsign, sessionKey, isAdmin, onLogout, onOpenAdmin }: ChatRoomProps) {
  const [input, setInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("ALL");
  const [newCallsign, setNewCallsign] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [sessionStartTime] = useState<Timestamp>(Timestamp.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  
  const { data: userData } = useDoc(userDocRef);
  const currentCallsign = userData?.callsign || initialCallsign;

  // Real-time listener for current session messages
  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    
    if (isAdmin) {
      // Admins see everything
      return query(collection(db, "messageLogs"), orderBy("timestamp", "asc"));
    } else {
      // Users see messages sent since session started, AND directed to them or "ALL"
      return query(
        collection(db, "messageLogs"),
        where("timestamp", ">=", sessionStartTime),
        orderBy("timestamp", "asc")
      );
    }
  }, [db, isAdmin, sessionStartTime]);

  const { data: rawMessages } = useCollection(messagesQuery);

  // Filter messages for non-admins to ensure they only see what they are supposed to
  const displayMessages = rawMessages ? rawMessages.filter(m => {
    if (isAdmin) return true;
    return (
      m.recipient === "ALL" || 
      m.recipient === currentCallsign || 
      m.userId === user?.uid
    );
  }).map(m => ({
    ...m,
    timestamp: m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString() : new Date().toLocaleTimeString(),
    isMe: m.userId === user?.uid
  })) : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [displayMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const messageContent = input.trim();
    const target = recipientInput.trim().toUpperCase();
    
    setInput("");

    addDocumentNonBlocking(collection(db, "messageLogs"), {
      sender: currentCallsign,
      userId: user.uid,
      recipient: target,
      content: messageContent,
      timestamp: serverTimestamp()
    });

    if (target !== "ALL" && target !== "WARRIOR" && !isAdmin) {
      toast({ 
        description: `ENCRYPTED_TRANSMISSION: Routing to ${target}. Note: Recipient must be active to receive.`,
      });
    }
  };

  const handleRequestCallsign = () => {
    if (!newCallsign.trim() || !user) return;
    setIsRequesting(true);
    
    const requestId = Math.random().toString(36).substring(7);
    addDocumentNonBlocking(collection(db, "callsignRequests"), {
      id: requestId,
      userId: user.uid,
      currentCallsign: currentCallsign,
      requestedCallsign: newCallsign.trim().toUpperCase(),
      status: "pending",
      timestamp: new Date().toISOString()
    });
    
    toast({ 
      title: "REQUEST_TRANSMITTED", 
      description: isAdmin 
        ? "Command identity shift requires approval. Access the Admin Panel to authorize." 
        : "Operative identity shift requires Admin approval." 
    });
    setNewCallsign("");
    setIsRequesting(false);
  };

  return (
    <div className="flex flex-col w-full h-screen max-w-4xl bg-card/80 backdrop-blur-xl border-x border-border shadow-2xl animate-fade-in">
      <header className="p-4 border-b border-border bg-secondary/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Lock className="w-5 h-5 text-primary glow-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-primary">Raven Oracle</h1>
            <div className="flex items-center space-x-2 text-[10px] text-muted-foreground uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Identity: {currentCallsign}</span>
              {isAdmin && <span className="ml-2 text-primary font-bold">[WARRIOR_PROTOCOL]</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs opacity-70 hover:opacity-100 hover:text-primary">
                <User className="w-3 h-3 mr-2" />
                IDENTITY_SHIFT
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-primary text-sm uppercase tracking-widest">Update Portal Callsign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-50 font-bold">Current Identity</label>
                  <div className="p-3 bg-secondary/30 border border-border rounded font-mono text-xs opacity-50">
                    {currentCallsign}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-50 font-bold">Proposed Identity</label>
                  <Input 
                    value={newCallsign}
                    onChange={(e) => setNewCallsign(e.target.value.toUpperCase())}
                    placeholder="ENTER_NEW_CALLSIGN"
                    className="bg-secondary/50 font-mono uppercase border-primary/20 focus:ring-primary"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  System Note: Identity shifts require explicit administrative authorization before synchronization.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleRequestCallsign} disabled={isRequesting || !newCallsign} className="bg-primary text-primary-foreground text-xs w-full font-bold border-glow-cyan h-11">
                  SUBMIT_SHIFT_REQUEST
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAdmin}
              className="border-primary/50 text-primary hover:bg-primary/10 text-[10px]"
            >
              <Settings className="w-3 h-3 mr-2" />
              ADMIN_PANEL
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Terminate</span>
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
        <div className="space-y-6 pb-4">
          <div className="flex flex-col items-center py-8 opacity-20">
             <div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent mb-4" />
             <p className="text-[10px] uppercase tracking-[0.5em]">Session Start: {sessionStartTime.toDate().toLocaleTimeString()}</p>
             <div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent mt-4" />
          </div>

          {displayMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-slide-up`}
            >
              <div className="flex items-center space-x-2 mb-1 px-1">
                {!msg.isMe && <Ghost className="w-3 h-3 text-primary" />}
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center">
                  {msg.sender} 
                  {msg.recipient !== "ALL" && <span className="text-primary/60 ml-1">→ {msg.recipient}</span>}
                </span>
                <span className="text-[10px] opacity-40">{msg.timestamp}</span>
              </div>
              <div 
                className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed border ${
                  msg.isMe 
                    ? 'bg-primary text-primary-foreground border-primary/20 rounded-tr-none' 
                    : 'bg-secondary text-foreground border-border rounded-tl-none shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 opacity-20">
              <History className="w-12 h-12 mb-4" />
              <p className="text-xs uppercase tracking-widest text-center">No communications detected in current session<br/><span className="text-[9px] opacity-50">History cleared automatically</span></p>
            </div>
          )}
        </div>
      </ScrollArea>

      <footer className="p-4 border-t border-border bg-secondary/30">
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-background/50 border border-border rounded px-2 py-1">
              <Target className="w-3 h-3 text-primary opacity-50" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground">To:</span>
              <input 
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value.toUpperCase())}
                className="bg-transparent border-none outline-none text-[10px] font-mono text-primary w-24 uppercase"
                placeholder="ALL / CALLSIGN"
              />
            </div>
            <p className="text-[9px] text-muted-foreground opacity-50 italic">Target specific callsigns for encrypted direct comms.</p>
          </div>
          
          <div className="flex space-x-2">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Communicate with the shadows..."
              className="flex-1 bg-background/50 border-border focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 h-10"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim()}
              className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg border-glow-cyan h-10 w-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}

