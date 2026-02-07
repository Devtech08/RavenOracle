
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
  Send, 
  LogOut, 
  Ghost,
  Lock,
  User,
  History,
  Target,
  Settings
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
  const [sessionStartTime, setSessionStartTime] = useState<Timestamp | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    setSessionStartTime(Timestamp.now());
  }, []);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  
  const { data: userData } = useDoc(userDocRef);
  const currentCallsign = userData?.callsign || initialCallsign;

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !sessionStartTime) return null;
    
    // Normal users only see messages from their current session
    return query(
      collection(db, "messageLogs"),
      where("timestamp", ">=", sessionStartTime),
      orderBy("timestamp", "asc")
    );
  }, [db, sessionStartTime]);

  const { data: rawMessages } = useCollection(messagesQuery);

  const displayMessages = rawMessages ? rawMessages.filter(m => {
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

    if (target !== "ALL") {
      toast({ description: `Transmitting to ${target}...` });
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
    
    toast({ title: "REQUEST_TRANSMITTED", description: "Identity shift requires Admin authorization." });
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
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[10px] opacity-70 hover:opacity-100">
                <User className="w-3 h-3 mr-2" />
                SHIFT_ID
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-primary text-sm uppercase tracking-widest">Identity Shift</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input 
                  value={newCallsign}
                  onChange={(e) => setNewCallsign(e.target.value.toUpperCase())}
                  placeholder="NEW_CALLSIGN"
                  className="bg-secondary/50 font-mono uppercase h-12"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleRequestCallsign} disabled={isRequesting || !newCallsign} className="bg-primary text-primary-foreground text-xs w-full font-bold h-12">
                  SUBMIT_REQUEST
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onOpenAdmin} className="text-[10px] border-primary/50 text-primary">
              <Settings className="w-3 h-3 mr-2" />
              ADMIN
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Terminate</span>
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
        <div className="space-y-6 pb-4">
          <div className="flex flex-col items-center py-8 opacity-20">
             <p className="text-[10px] uppercase tracking-[0.5em]">Session Active</p>
          </div>

          {displayMessages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-slide-up`}>
              <div className="flex items-center space-x-2 mb-1 px-1">
                {!msg.isMe && <Ghost className="w-3 h-3 text-primary" />}
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  {msg.sender} 
                  {msg.recipient !== "ALL" && <span className="text-primary/60 ml-1">→ {msg.recipient}</span>}
                </span>
                <span className="text-[10px] opacity-40">{msg.timestamp}</span>
              </div>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm border ${msg.isMe ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-secondary text-foreground border-border'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 opacity-20">
              <History className="w-12 h-12 mb-4" />
              <p className="text-[10px] uppercase tracking-widest text-center">History Purged Automatically</p>
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
                placeholder="ALL / ID"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Communicate..."
              className="flex-1 bg-background/50 border-border h-10"
            />
            <Button type="submit" size="icon" disabled={!input.trim()} className="bg-primary text-primary-foreground h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}
