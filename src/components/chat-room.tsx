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
  Settings,
  Paperclip,
  FileIcon,
  X,
  ImageIcon,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp } from "firebase/firestore";

interface ChatRoomProps {
  callsign: string;
  sessionKey: string;
  isAdmin: boolean;
  onLogout: () => void;
  onOpenAdmin: () => void;
  pendingRequestCount?: number;
}

export function ChatRoom({ callsign: initialCallsign, sessionKey, isAdmin, onLogout, onOpenAdmin, pendingRequestCount = 0 }: ChatRoomProps) {
  const [input, setInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("ALL");
  const [newCallsign, setNewCallsign] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Timestamp | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Firestore document
        toast({ variant: "destructive", title: "FILE_TOO_LARGE", description: "Secure transmissions are limited to 1MB." });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedFile({
          name: file.name,
          type: file.type,
          data: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || !user) return;

    const messageContent = input.trim();
    const target = recipientInput.trim().toUpperCase();
    
    const messageData: any = {
      sender: currentCallsign,
      userId: user.uid,
      recipient: target,
      content: messageContent,
      timestamp: serverTimestamp()
    };

    if (selectedFile) {
      messageData.fileData = selectedFile.data;
      messageData.fileName = selectedFile.name;
      messageData.fileType = selectedFile.type;
    }

    addDocumentNonBlocking(collection(db, "messageLogs"), messageData);

    setInput("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (target !== "ALL") {
      toast({ description: `Transmitting to ${target}...` });
    }
  };

  const handleRequestCallsign = () => {
    if (!newCallsign.trim() || !user || !db) return;
    setIsRequesting(true);
    
    const cleanNewCallsign = newCallsign.trim().toUpperCase();

    if (isAdmin) {
      // WARRIOR level authorization: Bypass review process
      updateDocumentNonBlocking(doc(db, "users", user.uid), {
        callsign: cleanNewCallsign
      });
      
      // Update admin role registry if it exists for this user
      updateDocumentNonBlocking(doc(db, "roles_admin", user.uid), {
        callsign: cleanNewCallsign
      });

      toast({ 
        title: "IDENTITY_SHIFT_AUTHORIZED", 
        description: `Active callsign successfully shifted to ${cleanNewCallsign}.` 
      });
    } else {
      // Operative level: Requires explicit WARRIOR review
      const requestId = Math.random().toString(36).substring(7);
      addDocumentNonBlocking(collection(db, "callsignRequests"), {
        id: requestId,
        userId: user.uid,
        currentCallsign: currentCallsign,
        requestedCallsign: cleanNewCallsign,
        status: "pending",
        timestamp: new Date().toISOString()
      });
      
      toast({ 
        title: "REQUEST_TRANSMITTED", 
        description: "Identity shift requested. Awaiting WARRIOR authorization." 
      });
    }
    
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

        <div className="flex items-center space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[10px] opacity-70 hover:opacity-100">
                <User className="w-3 h-3 mr-2" />
                SHIFT_ID
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-primary text-sm uppercase tracking-widest">
                  {isAdmin ? "DIRECT_IDENTITY_SHIFT" : "IDENTITY_REQUEST"}
                </DialogTitle>
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
                  {isAdmin ? "APPLY_IMMEDIATELY" : "SUBMIT_FOR_CLEARANCE"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenAdmin} 
                className="text-[10px] border-primary/50 text-primary font-bold tracking-widest px-4 h-8 transition-all hover:bg-primary/10 hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]"
              >
                <Settings className="w-3.5 h-3.5 mr-2 text-primary" />
                ADMIN
              </Button>
              {pendingRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-bounce border border-background shadow-[0_0_5px_rgba(255,0,0,0.5)]">
                  {pendingRequestCount}
                </span>
              )}
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-destructive text-[10px] uppercase font-bold">
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
              <div className={`max-w-[85%] p-3 rounded-lg text-sm border flex flex-col space-y-2 ${msg.isMe ? 'bg-primary text-primary-foreground border-primary/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'bg-secondary text-foreground border-border'}`}>
                {msg.fileData && (
                  <div className="bg-background/20 rounded-md p-2 border border-foreground/10 flex flex-col space-y-2">
                    {msg.fileType?.startsWith('image/') ? (
                      <div className="relative group">
                        <img src={msg.fileData} alt={msg.fileName} className="max-h-48 rounded object-cover cursor-pointer hover:opacity-90" />
                        <a href={msg.fileData} download={msg.fileName} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity rounded">
                          <Download className="w-6 h-6 text-white" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileIcon className="w-4 h-4 opacity-70" />
                        <span className="text-[10px] font-mono truncate max-w-[150px]">{msg.fileName}</span>
                        <a href={msg.fileData} download={msg.fileName} className="ml-auto hover:text-primary transition-colors">
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {msg.content && <div>{msg.content}</div>}
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
          <div className="flex items-center justify-between">
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

            {selectedFile && (
              <div className="flex items-center space-x-2 bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                <span className="text-[9px] font-mono text-primary truncate max-w-[120px]">{selectedFile.name}</span>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => setSelectedFile(null)}>
                  <X className="w-3 h-3 text-primary" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 border-border bg-background/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 opacity-70" />
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect}
            />
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Communicate..."
              className="flex-1 bg-background/50 border-border h-10 font-mono text-sm"
            />
            <Button type="submit" size="icon" disabled={!input.trim() && !selectedFile} className="bg-primary text-primary-foreground h-10 w-10 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}
