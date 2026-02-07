
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  Trash2, 
  X, 
  Ban,
  Check,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [newGateway, setNewGateway] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const { toast } = useToast();
  const db = useFirestore();

  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: users } = useCollection(usersQuery);

  const callsignRequestsQuery = useMemoFirebase(() => collection(db, "callsignRequests"), [db]);
  const { data: callsignRequests } = useCollection(callsignRequestsQuery);

  const sessionRequestsQuery = useMemoFirebase(() => collection(db, "sessionRequests"), [db]);
  const { data: sessionRequests } = useCollection(sessionRequestsQuery);

  const gatewayRef = useMemoFirebase(() => doc(db, "gateway", "default"), [db]);
  const { data: gatewayData } = useDoc(gatewayRef);

  const handleUpdateGateway = () => {
    if (!newGateway.trim()) return;
    setDocumentNonBlocking(gatewayRef, {
      gatewayAddress: newGateway.trim().toLowerCase(),
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    toast({ title: "GATEWAY_UPDATED" });
    setNewGateway("");
  };

  const handleGenerateInvite = () => {
    const newKey = `KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const keyId = Math.random().toString(36).substring(7);
    setDocumentNonBlocking(doc(db, "accessKeys", keyId), {
      accessKey: newKey,
      isUsed: false,
      createdAt: new Date().toISOString()
    }, { merge: false });
    setInviteLink(`${window.location.origin}/?invite=${newKey}`);
  };

  const handleApproveCallsign = (request: any) => {
    updateDocumentNonBlocking(doc(db, "users", request.userId), {
      callsign: request.requestedCallsign
    });
    deleteDocumentNonBlocking(doc(db, "callsignRequests", request.id));
    toast({ title: "CALLSIGN_APPROVED" });
  };

  const handleApproveSession = (request: any) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    updateDocumentNonBlocking(doc(db, "sessionRequests", request.id), {
      status: "approved",
      sessionCode: code
    });
    toast({ title: "SESSION_AUTHORIZED" });
  };

  const handleAction = (userId: string, action: 'block' | 'delete') => {
    if (action === 'delete') {
      deleteDocumentNonBlocking(doc(db, "users", userId));
      toast({ title: "USER_PURGED" });
    } else {
      updateDocumentNonBlocking(doc(db, "users", userId), { isBlocked: true });
      toast({ title: "USER_TERMINATED" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <Card className="w-full max-w-5xl h-[85vh] bg-card/95 border-primary/20 shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/30 flex flex-row items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-primary glow-cyan" />
            <CardTitle className="text-sm font-bold tracking-widest uppercase">Admin Terminal v1.2.0</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/20 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="sessions" className="h-full flex flex-col">
            <TabsList className="bg-secondary/50 border border-border w-fit mb-6">
              <TabsTrigger value="sessions" className="text-[10px]">ACCESS_SESSIONS</TabsTrigger>
              <TabsTrigger value="members" className="text-[10px]">REGISTRY</TabsTrigger>
              <TabsTrigger value="requests" className="text-[10px]">ID_UPDATES</TabsTrigger>
              <TabsTrigger value="system" className="text-[10px]">SYSTEM</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-primary uppercase text-[10px]">Subject</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Request_ID</TableHead>
                    <TableHead className="text-primary uppercase text-[10px] text-right">Command</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionRequests?.filter(r => r.status === 'pending').map((req) => (
                    <TableRow key={req.id} className="border-border">
                      <TableCell className="font-bold text-xs">{req.callsign}</TableCell>
                      <TableCell>
                         <Badge className="bg-yellow-500/20 text-yellow-500 text-[8px] border-yellow-500/30">AWAITING_ORACLE</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] opacity-40">{req.id}</TableCell>
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
                  {sessionRequests?.filter(r => r.status === 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 opacity-30 text-[10px]">NO_ACTIVE_SESSION_REQUESTS</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="members" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-primary uppercase text-[10px]">Callsign</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Biometrics</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-primary uppercase text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-bold text-xs">{u.callsign}</TableCell>
                      <TableCell>
                        {u.faceData ? <Badge variant="outline" className="text-[8px] border-primary/20 text-primary">SCAN_LOCKED</Badge> : <Badge variant="destructive" className="text-[8px]">MISSING</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isBlocked ? "destructive" : "outline"} className="text-[8px]">
                          {u.isBlocked ? "TERMINATED" : "ACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {!u.isAdmin && !u.isBlocked && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleAction(u.id, 'block')}>
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        {!u.isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" onClick={() => handleAction(u.id, 'delete')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-primary text-[10px]">Current</TableHead>
                    <TableHead className="text-primary text-[10px]">Requested</TableHead>
                    <TableHead className="text-primary text-[10px] text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callsignRequests?.map((req) => (
                    <TableRow key={req.id} className="border-border">
                      <TableCell className="text-xs opacity-50">{req.currentCallsign}</TableCell>
                      <TableCell className="text-xs font-bold text-primary">{req.requestedCallsign}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleApproveCallsign(req)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "callsignRequests", req.id))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {callsignRequests?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 opacity-30 text-[10px]">NO_PENDING_IDENTITY_REQUESTS</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-secondary/20 border-border">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase text-primary">Gateway Sequence</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-background/50 border border-border rounded font-mono text-primary text-sm">
                      {gatewayData?.gatewayAddress || "raven.oracle"}
                    </div>
                    <div className="flex space-x-2">
                      <Input value={newGateway} onChange={(e) => setNewGateway(e.target.value)} placeholder="NEW_SEQUENCE" className="font-mono text-xs h-8" />
                      <Button onClick={handleUpdateGateway} size="sm" className="bg-primary text-primary-foreground text-[10px] h-8">UPDATE</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/20 border-border">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase text-primary">Identity Provisioning</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button onClick={handleGenerateInvite} className="w-full bg-primary text-primary-foreground font-bold text-[10px] h-8">PROVISION_NEW_KEY</Button>
                    {inviteLink && (
                      <div className="p-2 bg-background border border-primary/30 rounded flex space-x-2">
                        <Input readOnly value={inviteLink} className="text-[9px] font-mono h-6" />
                        <Button size="sm" onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          toast({ title: "COPIED" });
                        }} className="h-6 text-[9px]">COPY</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
