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
  Ban
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

  // Subscriptions
  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);

  const keysQuery = useMemoFirebase(() => collection(db, "accessKeys"), [db]);
  const { data: keys } = useCollection(keysQuery);

  const gatewayRef = useMemoFirebase(() => doc(db, "gateway", "default"), [db]);
  const { data: gatewayData } = useDoc(gatewayRef);

  const handleUpdateGateway = async () => {
    if (!newGateway.trim()) return;
    try {
      await setDoc(gatewayRef, {
        gatewayAddress: newGateway.trim().toLowerCase(),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      toast({ title: "GATEWAY_UPDATED", description: `Sequence changed to: ${newGateway}` });
      setNewGateway("");
    } catch (e) {
      toast({ variant: "destructive", title: "UPDATE_FAILED" });
    }
  };

  const handleGenerateInvite = async () => {
    const newKey = `KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const keyId = Math.random().toString(36).substring(7);
    
    try {
      await setDoc(doc(db, "accessKeys", keyId), {
        accessKey: newKey,
        isUsed: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString() // 24h
      });
      
      const link = `${window.location.origin}/?invite=${newKey}`;
      setInviteLink(link);
      toast({ title: "INVITE_GENERATED", description: "Access key recorded in the Oracle." });
    } catch (e) {
      toast({ variant: "destructive", title: "GENERATION_FAILED" });
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
            <CardTitle className="text-sm font-bold tracking-widest uppercase">Admin Terminal v1.0.4</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/20 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="members" className="h-full flex flex-col">
            <TabsList className="bg-secondary/50 border border-border w-fit mb-6">
              <TabsTrigger value="members" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                MEMBERS_REGISTRY
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                GATEWAY_CONFIG
              </TabsTrigger>
              <TabsTrigger value="invites" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                PROVISIONING
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-primary uppercase text-[10px]">Callsign</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Registry_ID</TableHead>
                    <TableHead className="text-primary uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-primary uppercase text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 animate-pulse">QUERYING_MEMBERS...</TableCell></TableRow>
                  ) : users?.map((u) => (
                    <TableRow key={u.id} className="border-border hover:bg-secondary/20">
                      <TableCell className="font-bold text-xs">{u.callsign}</TableCell>
                      <TableCell className="font-mono text-[10px] opacity-50">{u.id}</TableCell>
                      <TableCell>
                        <Badge variant={u.isBlocked ? "destructive" : "outline"} className="text-[8px] px-2 py-0">
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

            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-secondary/20 border-border">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase text-primary">Gateway Sequence</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase opacity-50">Current Sequence</label>
                      <div className="p-3 bg-background/50 border border-border rounded font-mono text-primary text-sm tracking-widest">
                        {gatewayData?.gatewayAddress || "raven.oracle"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase opacity-50">New Sequence</label>
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="ENTER_NEW_SEQUENCE"
                          value={newGateway}
                          onChange={(e) => setNewGateway(e.target.value)}
                          className="font-mono"
                        />
                        <Button onClick={handleUpdateGateway} className="bg-primary text-primary-foreground">
                          UPDATE
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/20 border-border">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase text-primary">System Integrity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 text-xs">
                      <RefreshCw className="w-3 h-3 mr-2" /> REBOOT_ORACLE
                    </Button>
                    <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 text-xs">
                      <Trash2 className="w-3 h-3 mr-2" /> PURGE_ALL_TRANSIENT_LOGS
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="invites" className="space-y-6">
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-secondary/10">
                <UserPlus className="w-12 h-12 text-primary mb-4 opacity-50" />
                <h3 className="text-sm font-bold uppercase mb-2">Generate Provisioning Key</h3>
                <p className="text-xs text-muted-foreground text-center max-w-sm mb-6">
                  New users require a single-use access key to establish their initial connection to the Oracle.
                </p>
                <Button onClick={handleGenerateInvite} className="bg-primary text-primary-foreground font-bold px-8">
                  PROVISION_NEW_KEY
                </Button>

                {inviteLink && (
                  <div className="mt-8 w-full max-w-md p-4 bg-background border border-primary/30 rounded-md animate-slide-up">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase text-primary font-bold">Generated Portal Link</span>
                      <LinkIcon className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex space-x-2">
                      <Input readOnly value={inviteLink} className="text-[10px] font-mono h-8" />
                      <Button size="sm" onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast({ title: "COPIED_TO_CLIPBOARD" });
                      }} className="h-8 px-3">COPY</Button>
                    </div>
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
