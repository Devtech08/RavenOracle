
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
  Settings,
  UserEdit,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isMe: boolean;
}

interface ChatRoomProps {
  callsign: string;
  sessionKey: string;
  isAdmin: boolean;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export function ChatRoom({ callsign: initialCallsign, sessionKey, isAdmin, onLogout, onOpenAdmin }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [newCallsign, setNewCallsign] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
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

  useEffect(() => {
    const welcome: Message = {
      id: "system-1",
      sender: "ORACLE",
      content: isAdmin 
        ? `ADMIN_ACCESS_GRANTED: Welcome back, ${currentCallsign}. All past logs decrypted.`
        : `ENCRYPTED_CHANNEL_ESTABLISHED: Welcome, ${currentCallsign}. Communication is now secure.`,
      timestamp: new Date().toLocaleTimeString(),
      isMe: false,
    };
    setMessages([welcome]);
  }, [isAdmin, currentCallsign]);

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
      sender: currentCallsign,
      content: input,
      timestamp: new Date().toLocaleTimeString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    setTimeout(() => {
      const reply: Message = {
        id: `reply-${Date.now()}`,
        sender: "ORACLE",
        content: `Acknowledged, ${currentCallsign}. Sequence ${Math.random().toString(36).substring(7).toUpperCase()} recorded.`,
        timestamp: new Date().toLocaleTimeString(),
        isMe: false,
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  const handleRequestCallsign = async () => {
    if (!newCallsign.trim() || !user) return;
    setIsRequesting(true);
    
    try {
      const requestId = Math.random().toString(36).substring(7);
      await setDoc(doc(db, "callsignRequests", requestId), {
        id: requestId,
        userId: user.uid,
        currentCallsign: currentCallsign,
        requestedCallsign: newCallsign.trim().toUpperCase(),
        status: "pending",
        timestamp: new Date().toISOString()
      });
      
      toast({ title: "REQUEST_SUBMITTED", description: "Admin approval required for callsign update." });
      setNewCallsign("");
    } catch (e) {
      toast({ variant: "destructive", title: "REQUEST_FAILED" });
    } finally {
      setIsRequesting(false);
    }
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
              <Button variant="ghost" size="sm" className="text-xs opacity-70 hover:opacity-100">
                <User className="w-3 h-3 mr-2" />
                PROFILE
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-primary text-sm uppercase tracking-widest">Update Callsign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-50">New Callsign</label>
                  <Input 
                    value={newCallsign}
                    onChange={(e) => setNewCallsign(e.target.value)}
                    placeholder="ENTER_NEW_CALLSIGN"
                    className="bg-secondary/50 font-mono uppercase"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Note: Identity changes require Oracle Administrator approval.</p>
              </div>
              <DialogFooter>
                <Button onClick={handleRequestCallsign} disabled={isRequesting || !newCallsign} className="bg-primary text-primary-foreground text-xs w-full font-bold">
                  SUBMIT_CHANGE_REQUEST
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
            </div>
          ))}
        </div>
      </ScrollArea>

      <footer className="p-4 border-t border-border bg-secondary/30">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Communicate with the shadows..."
            className="flex-1 bg-background/50 border-border focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim()}
            className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg border-glow-cyan"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
