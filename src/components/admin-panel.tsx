
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
  UserPlus, 
  Trash2, 
  Lock, 
  RefreshCw, 
  X, 
  Link as LinkIcon,
  Ban,
  Check,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [newGateway, setNewGateway] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const { toast } = useToast();
  const db = useFirestore();

  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => collection(db, "callsignRequests"), [db]);
  const { data: requests, isLoading: requestsLoading } = useCollection(requestsQuery);

  const gatewayRef = useMemoFirebase(() => doc(db, "gateway", "default"), [db]);
  const { data: gatewayData } = useDoc(gatewayRef);

  const handleUpdateGateway = async () => {
    if (!newGateway.trim()) return;
    try {
      await setDoc(gatewayRef, {
        gatewayAddress: newGateway.trim().toLowerCase(),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      toast({ title: "GATEWAY_UPDATED" });
      setNewGateway("");
    } catch (e) {
      toast({ variant: "destructive", title: "UPDATE_FAILED" });
    }
  };

  const handleGenerateInvite = async () => {
    const newKey = `KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const keyId = Math.random().toString(36).substring(7);
    await setDoc(doc(db, "accessKeys", keyId), {
      accessKey: newKey,
      isUsed: false,
      createdAt: new Date().toISOString()
    });
    setInviteLink(`${window.location.origin}/?invite=${newKey}`);
  };

  const handleApproveCallsign = async (request: any) => {
    try {
      await updateDoc(doc(db, "users", request.userId), {
        callsign: request.requestedCallsign
      });
      await deleteDoc(doc(db, "callsignRequests", request.id));
      toast({ title: "CALLSIGN_APPROVED" });
    } catch (e) {
      toast({ variant: "destructive", title: "APPROVAL_FAILED" });
    }
  };

  const handleAction = async (userId: string, action: 'block' | 'delete') => {
    try {
      if (action === 'delete') {
        await deleteDoc(doc(db, "users", userId));
        toast({ title: "USER_PURGED" });
      } else {
        await updateDoc(doc(db, "users", userId), { isBlocked: true });
        toast({ title: "USER_TERMINATED" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "ACTION_FAILED" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <Card className="w-full max-w-5xl h-[85vh] bg-card/95 border-primary/20 shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/30 flex flex-row items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-primary glow-cyan" />
            <CardTitle className="text-sm font-bold tracking-widest uppercase">Admin Terminal v1.1.0</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/20 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="members" className="h-full flex flex-col">
            <TabsList className="bg-secondary/50 border border-border w-fit mb-6">
              <TabsTrigger value="members" className="text-[10px]">MEMBERS_REGISTRY</TabsTrigger>
              <TabsTrigger value="requests" className="text-[10px]">PENDING_REQUESTS</TabsTrigger>
              <TabsTrigger value="system" className="text-[10px]">GATEWAY_CONFIG</TabsTrigger>
              <TabsTrigger value="invites" className="text-[10px]">PROVISIONING</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-primary uppercase text-[10px]">Callsign</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">ID</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-primary uppercase text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-bold text-xs">{u.callsign}</TableCell>
                      <TableCell className="font-mono text-[10px] opacity-50">{u.id}</TableCell>
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
                    <TableHead className="text-primary text-[10px]">Timestamp</TableHead>
                    <TableHead className="text-primary text-[10px] text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.map((req) => (
                    <TableRow key={req.id} className="border-border">
                      <TableCell className="text-xs opacity-50">{req.currentCallsign}</TableCell>
                      <TableCell className="text-xs font-bold text-primary">{req.requestedCallsign}</TableCell>
                      <TableCell className="text-[10px] opacity-40">{new Date(req.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleApproveCallsign(req)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db, "callsignRequests", req.id))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 opacity-30 text-[10px]">NO_PENDING_IDENTITY_REQUESTS</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <Card className="bg-secondary/20 border-border max-w-md">
                <CardHeader>
                  <CardTitle className="text-xs uppercase text-primary">Gateway Sequence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-background/50 border border-border rounded font-mono text-primary text-sm">
                    {gatewayData?.gatewayAddress || "raven.oracle"}
                  </div>
                  <div className="flex space-x-2">
                    <Input value={newGateway} onChange={(e) => setNewGateway(e.target.value)} placeholder="NEW_SEQUENCE" className="font-mono text-xs" />
                    <Button onClick={handleUpdateGateway} size="sm" className="bg-primary text-primary-foreground text-[10px]">UPDATE</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites" className="space-y-6">
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-secondary/10">
                <UserPlus className="w-12 h-12 text-primary mb-4 opacity-30" />
                <Button onClick={handleGenerateInvite} className="bg-primary text-primary-foreground font-bold">PROVISION_NEW_KEY</Button>
                {inviteLink && (
                  <div className="mt-6 w-full max-w-sm p-3 bg-background border border-primary/30 rounded flex space-x-2">
                    <Input readOnly value={inviteLink} className="text-[10px] font-mono h-8" />
                    <Button size="sm" onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast({ title: "COPIED" });
                    }} className="h-8 text-[10px]">COPY</Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
