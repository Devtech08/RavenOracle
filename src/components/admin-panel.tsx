"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShieldCheck, 
  Trash2, 
  X, 
  Ban,
  Zap,
  RotateCcw,
  LayoutDashboard,
  Copy,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking, useUser } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, getDoc } from "firebase/firestore";

interface AdminPanelProps {
  onClose: () => void;
  onReturnToChat?: () => void;
  isRegistryAdmin: boolean;
}

export function AdminPanel({ onClose, onReturnToChat, isRegistryAdmin }: AdminPanelProps) {
  const [newGateway, setNewGateway] = useState("");
  const [newAdminGateway, setNewAdminGateway] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [broadcastInput, setBroadcastInput] = useState("");
  const [messageRecipient, setMessageRecipient] = useState("ALL");
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);
  const { data: users } = useCollection(usersQuery);

  const callsignRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "callsignRequests");
  }, [db]);
  const { data: callsignRequests } = useCollection(callsignRequestsQuery);

  const sessionRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "sessionRequests");
  }, [db]);
  const { data: sessionRequests } = useCollection(sessionRequestsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "messageLogs"), orderBy("timestamp", "asc"));
  }, [db]);
  const { data: messages } = useCollection(messagesQuery);

  const gatewayRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, "gateway", "default");
  }, [db]);
  const { data: gatewayData } = useDoc(gatewayRef);

  const handleUpdateGateway = (type: 'user' | 'admin') => {
    const value = type === 'user' ? newGateway : newAdminGateway;
    if (!value.trim() || !gatewayRef) return;
    
    setDocumentNonBlocking(gatewayRef, {
      [type === 'user' ? 'gatewayAddress' : 'adminAddress']: value.trim().toLowerCase(),
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    toast({ title: "GATEWAY_UPDATED" });
    if (type === 'user') setNewGateway("");
    else setNewAdminGateway("");
  };

  const handleGenerateInvite = () => {
    const newKey = `KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setDocumentNonBlocking(doc(db, "accessKeys", Math.random().toString(36).substring(7)), {
      accessKey: newKey,
      isUsed: false,
      createdAt: new Date().toISOString()
    }, { merge: false });
    
    setInviteLink(`${window.location.origin}/?invite=${newKey}`);
    toast({ title: "INVITE_KEY_PROVISIONED" });
  };

  const handleApproveCallsign = async (request: any) => {
    updateDocumentNonBlocking(doc(db, "users", request.userId), {
      callsign: request.requestedCallsign
    });
    deleteDocumentNonBlocking(doc(db, "callsignRequests", request.id));
    toast({ title: "IDENTITY_SHIFTED" });
  };

  const handleApproveSession = (request: any) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    updateDocumentNonBlocking(doc(db, "sessionRequests", request.id), {
      status: "approved",
      sessionCode: code
    });
    toast({ title: "SESSION_AUTHORIZED" });
  };

  const handleAction = (userId: string, action: 'block' | 'unblock' | 'delete') => {
    if (action === 'delete') {
      deleteDocumentNonBlocking(doc(db, "users", userId));
      toast({ title: "USER_PURGED" });
    } else if (action === 'block') {
      updateDocumentNonBlocking(doc(db, "users", userId), { isBlocked: true });
      toast({ title: "USER_TERMINATED" });
    } else if (action === 'unblock') {
      updateDocumentNonBlocking(doc(db, "users", userId), { isBlocked: false });
      toast({ title: "USER_RESTORED" });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim() || !user || !db) return;

    const adminUser = users?.find(u => u.id === user.uid);
    const senderName = adminUser?.callsign || "WARRIOR";

    addDocumentNonBlocking(collection(db, "messageLogs"), {
      sender: senderName,
      userId: user.uid,
      recipient: messageRecipient,
      content: broadcastInput.trim(),
      timestamp: serverTimestamp()
    });

    setBroadcastInput("");
    toast({ title: "MESSAGE_TRANSMITTED" });
  };

  // Deduplicate users for the recipient list to avoid duplicate keys in Select
  const uniqueRecipientUsers = Array.from(new Set(users?.map(u => u.callsign))).map(callsign => {
    return users?.find(u => u.callsign === callsign);
  }).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <Card className="w-full max-w-6xl h-[90vh] bg-card/95 border-primary/20 shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/30 flex flex-row items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-primary glow-cyan" />
            <CardTitle className="text-sm font-bold tracking-widest uppercase text-primary">Command Terminal</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {onReturnToChat && (
              <Button variant="outline" size="sm" onClick={onReturnToChat} className="text-[10px] border-primary/30 text-primary h-8">
                <LayoutDashboard className="w-3 h-3 mr-2" />
                OPERATIVE_VIEW
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/20 hover:text-destructive h-8 w-8">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="sessions" className="h-full flex flex-col">
            <TabsList className="bg-secondary/50 border border-border w-fit mb-6">
              <TabsTrigger value="sessions" className="text-[10px]">ACCESS_QUEUES</TabsTrigger>
              <TabsTrigger value="members" className="text-[10px]">OPERATIVE_REGISTRY</TabsTrigger>
              <TabsTrigger value="requests" className="text-[10px]">IDENTITY_TASKS</TabsTrigger>
              <TabsTrigger value="comms" className="text-[10px]">COMMS_HUB</TabsTrigger>
              {isRegistryAdmin && <TabsTrigger value="system" className="text-[10px]">SYSTEM_CONFIG</TabsTrigger>}
            </TabsList>

            <TabsContent value="sessions" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-primary uppercase text-[10px]">Operative</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-primary uppercase text-[10px] text-right">Clearance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionRequests?.filter(r => r.status === 'pending').map((req) => (
                    <TableRow key={req.id} className="border-border">
                      <TableCell className="font-bold text-xs">{req.callsign}</TableCell>
                      <TableCell>
                         <Badge className="bg-yellow-500/20 text-yellow-500 text-[8px] border-yellow-500/30 uppercase">Awaiting_Warrior</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleApproveSession(req)}>
                          <Zap className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "sessionRequests", req.id))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="members" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-primary uppercase text-[10px]">Callsign</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Biometrics</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-primary uppercase text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-bold text-xs flex items-center">
                        {u.callsign}
                        {u.isAdmin && <ShieldCheck className="w-3 h-3 ml-2 text-primary opacity-70" />}
                      </TableCell>
                      <TableCell>
                        {u.faceData ? <Badge variant="outline" className="text-[8px] border-primary/20 text-primary uppercase">Linked</Badge> : <Badge variant="destructive" className="text-[8px] uppercase">Unverified</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isBlocked ? "destructive" : "outline"} className="text-[8px] uppercase">
                          {u.isBlocked ? "Terminated" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {!u.isAdmin && !u.isBlocked && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleAction(u.id, 'block')}>
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        {!u.isAdmin && u.isBlocked && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleAction(u.id, 'unblock')}>
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        {!u.isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100" onClick={() => handleAction(u.id, 'delete')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="comms" className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                <div className="lg:col-span-2 flex flex-col bg-secondary/10 border border-border rounded-lg overflow-hidden">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages?.map((msg) => (
                        <div key={msg.id} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2 text-[9px] uppercase font-bold opacity-60">
                            <span className={msg.sender === 'WARRIOR' ? 'text-primary' : ''}>{msg.sender}</span>
                            <span>→</span>
                            <span>{msg.recipient}</span>
                          </div>
                          <div className={`text-xs p-2 rounded border ${msg.sender === 'WARRIOR' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-secondary/50 border-border text-foreground'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex flex-col space-y-4">
                  <Card className="bg-secondary/10 border-border">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-[10px] uppercase">Command Transmissions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <form onSubmit={handleSendMessage} className="space-y-4">
                        <Select value={messageRecipient} onValueChange={setMessageRecipient}>
                          <SelectTrigger className="h-8 text-[10px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="ALL" className="text-[10px]">ALL (BROADCAST)</SelectItem>
                            {uniqueRecipientUsers.filter(u => u.id !== user?.uid).map(u => (
                              <SelectItem key={u.id} value={u.callsign} className="text-[10px]">{u.callsign}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <textarea
                          value={broadcastInput}
                          onChange={(e) => setBroadcastInput(e.target.value)}
                          placeholder="Enter command data..."
                          className="w-full h-32 bg-background border border-border rounded p-3 text-xs font-mono outline-none"
                        />
                        <Button type="submit" disabled={!broadcastInput.trim()} className="w-full bg-primary text-primary-foreground font-bold text-[10px] h-9">
                          TRANSMIT_DATA
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {isRegistryAdmin && (
              <TabsContent value="system" className="flex-1 overflow-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-secondary/20 border-border">
                    <CardHeader>
                      <CardTitle className="text-xs uppercase text-primary">Gateway Sequences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase opacity-50">Operative Entrance</label>
                        <div className="flex space-x-2">
                          <Input value={newGateway} onChange={(e) => setNewGateway(e.target.value)} placeholder={gatewayData?.gatewayAddress || "raven.oracle"} className="font-mono text-xs h-8" />
                          <Button onClick={() => handleUpdateGateway('user')} size="sm" className="text-[10px] h-8">UPDATE</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase opacity-50">Command Entrance</label>
                        <div className="flex space-x-2">
                          <Input value={newAdminGateway} onChange={(e) => setNewAdminGateway(e.target.value)} placeholder={gatewayData?.adminAddress || "raven.admin"} className="font-mono text-xs h-8" />
                          <Button onClick={() => handleUpdateGateway('admin')} size="sm" className="text-[10px] h-8">UPDATE</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/20 border-border">
                    <CardHeader>
                      <CardTitle className="text-xs uppercase text-primary">Invitations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={handleGenerateInvite} className="w-full bg-primary text-primary-foreground font-bold text-[10px] h-10">
                        PROVISION_NEW_KEY
                      </Button>
                      {inviteLink && (
                        <div className="p-3 bg-background border border-primary/30 rounded flex flex-col space-y-2">
                          <span className="text-[8px] uppercase font-bold text-primary">NEW_INVITE_LINK:</span>
                          <div className="flex space-x-2">
                            <Input readOnly value={inviteLink} className="text-[9px] font-mono h-8 bg-secondary/30" />
                            <Button size="icon" onClick={() => {
                              navigator.clipboard.writeText(inviteLink);
                              toast({ title: "COPIED_TO_BUFFER" });
                            }} className="h-8 w-8">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
