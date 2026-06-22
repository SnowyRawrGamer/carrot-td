import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Carrot, ArrowLeft, ChevronUp, ChevronDown, AlertCircle, Clock, CheckCircle2, MessageSquare, X } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Feedback");

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["my-feedback"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("site_feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first");
      if (!body.trim()) throw new Error("Please enter your feedback");

      const { data: note, error: noteError } = await supabase
        .from("site_notes")
        .insert({
          title: `${category}: ${body.substring(0, 40)}${body.length > 40 ? '...' : ''}`,
          body: `User: ${user.email}\n\n${body}`,
          status: "viewer_ideas",
          created_by: user.id
        })
        .select()
        .single();

      if (noteError) throw noteError;

      const { error: feedbackError } = await supabase.from("site_feedback").insert({
        user_id: user.id,
        body: body.trim(),
        category,
        note_id: note.id
      });

      if (feedbackError) throw feedbackError;
    },
    onSuccess: () => {
      toast.success("Feedback submitted!");
      setBody("");
      qc.invalidateQueries({ queryKey: ["my-feedback"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) {
    return (
      <Page>
        <Card className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign in required</h2>
          <p className="text-muted-foreground text-sm">
            Sign in to leave bug reports or feedback.
          </p>
        </Card>
      </Page>
    );
  }

  const pendingCount = submissions?.filter(s => s.status === 'pending').length || 0;

  return (
    <Page>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Bugs & Feedback</h1>
        <p className="text-muted-foreground mb-8">Help us improve Carrot TD by reporting issues or suggesting new features.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Submit Feedback</h2>
              {pendingCount >= 3 ? (
                <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
                  You have 3 pending submissions. Please wait for an admin to review them before submitting more.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bug Report">Bug Report</SelectItem>
                        <SelectItem value="Feedback">Feedback</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Details</Label>
                    <Textarea 
                      placeholder="Describe the bug or share your idea..." 
                      rows={6}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => submit.mutate()} 
                    disabled={submit.isPending}
                  >
                    {submit.isPending ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Submissions</h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : submissions?.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't submitted any feedback yet.</p>
            ) : (
              submissions?.map(sub => (
                <Card key={sub.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted uppercase tracking-wider">{sub.category}</span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {sub.status === 'pending' && <><Clock className="h-3 w-3 text-amber-500" /> Pending</>}
                      {sub.status === 'accepted' && <><CheckCircle2 className="h-3 w-3 text-green-500" /> Accepted</>}
                      {sub.status === 'declined' && <><X className="h-3 w-3 text-destructive" /> Declined</>}
                      {sub.status === 'maybe' && <><Clock className="h-3 w-3 text-blue-500" /> Maybe</>}
                    </div>
                  </div>
                  <p className="text-sm line-clamp-3">{sub.body}</p>
                  {sub.admin_response && (
                    <div className="mt-3 p-3 bg-primary/5 border-l-2 border-primary rounded-r-md">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                        <MessageSquare className="h-3 w-3" /> ADMIN RESPONSE
                      </div>
                      <p className="text-sm text-primary/90 italic">"{sub.admin_response}"</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground pt-1">Submitted {new Date(sub.created_at).toLocaleDateString()}</p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
