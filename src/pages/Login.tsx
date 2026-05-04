import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@spa.test");
  const [password, setPassword] = useState("Demo1234!");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate("/");
  };

  const seed = async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke("bootstrap-demo");
      toast.success("Demo data is ready");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle>Serenity Spa</CardTitle>
          <CardDescription>Sign in to your management console</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
          </form>
          <div className="mt-6 rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            <div className="font-medium">Demo accounts</div>
            <div>Owner: owner@spa.test / Demo1234!</div>
            <div>Admin: admin1@spa.test / Demo1234!</div>
            <div>Admin: admin2@spa.test / Demo1234!</div>
            <Button type="button" variant="link" size="sm" className="px-0 h-auto" onClick={seed}>Reload demo data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
