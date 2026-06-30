import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Send, Flag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function InboxDrawer({ 
  open, 
  onOpenChange, 
  initialTargetUser 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialTargetUser?: string | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    if (initialTargetUser) {
      setSelectedUser(initialTargetUser);
    }
  }, [initialTargetUser]);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user && open, // Only fetch when drawer is open
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("trust_level").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["pm-conversations", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("private_messages")
        .select(`
          id, body, created_at, sender_id, receiver_id,
          sender:profiles!sender_id(id, username),
          receiver:profiles!receiver_id(id, username)
        `)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Conversations fetch error:", error);
        throw error;
      }

      const map = new Map<string, { userId: string; username: string; lastMessage: string; date: string }>();
      for (const m of (data || [])) {
        const other = m.sender_id === user!.id ? m.receiver : m.sender;
        if (!other || map.has(other.id)) continue;
        map.set(other.id, {
          userId: other.id,
          username: other.username || "Unknown",
          lastMessage: m.body,
          date: m.created_at
        });
      }
      return Array.from(map.values());
    },
  });

  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: ["pm-messages", selectedUser],
    enabled: !!user && !!selectedUser && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("private_messages")
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Messages fetch error:", error);
        throw error;
      }
      return data || [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !selectedUser || !messageBody.trim()) return;
      
      const { error } = await supabase.from("private_messages").insert({
        sender_id: user.id,
        receiver_id: selectedUser,
        body: messageBody.trim()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageBody("");
      qc.invalidateQueries({ queryKey: ["pm-messages", selectedUser] });
      qc.invalidateQueries({ queryKey: ["pm-conversations", user?.id] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const flagMessage = useMutation({
    mutationFn: async (msgId: string) => {
      const { error } = await supabase
        .from("private_messages")
        .update({ is_flagged: true, flagged_by: user!.id })
        .eq("id", msgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message flagged for review");
      qc.invalidateQueries({ queryKey: ["pm-messages", selectedUser] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const isStaff = ["basic_moderator", "trusted_moderator"].includes(profile?.trust_level || "");
  const canChat = (profile?.trust_level === "trusted") || isStaff;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {selectedUser && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {selectedUser ? "Conversation" : "Messages"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!user ? (
             <div className="p-8 text-center text-sm text-muted-foreground">Please sign in to view messages.</div>
          ) : loadingConvs && !conversations ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !selectedUser ? (
            <div className="divide-y">
              {conversations?.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No conversations yet. Start one from a user's post or comment!
                </div>
              ) : conversations?.map((c) => (
                <button
                  key={c.userId}
                  className="w-full p-4 text-left hover:bg-muted/50 transition"
                  onClick={() => setSelectedUser(c.userId)}
                >
                  <div className="font-semibold">{c.username}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.lastMessage}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.date).toLocaleString()}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {loadingMsgs && !messages ? (
                <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : messages?.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.sender_id === user!.id ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm ${m.sender_id === user!.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.body}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</span>
                    {m.sender_id !== user!.id && !m.is_flagged && (
                      <button onClick={() => flagMessage.mutate(m.id)} className="text-[10px] text-muted-foreground hover:text-destructive">Flag</button>
                    )}
                    {m.is_flagged && <span className="text-[10px] text-destructive font-bold">Flagged</span>}
                  </div>
                </div>
              ))}
              {messages?.length === 0 && !loadingMsgs && (
                <div className="text-center text-xs text-muted-foreground py-4">No messages yet.</div>
              )}
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="p-4 border-t bg-background">
            {canChat ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send.mutate()}
                />
                <Button size="icon" onClick={() => send.mutate()} disabled={send.isPending || !messageBody.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground italic">You must be Trusted (Tier 3) to send messages.</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
