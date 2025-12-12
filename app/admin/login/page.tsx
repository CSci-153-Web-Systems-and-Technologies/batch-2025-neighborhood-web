"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      // 1. Log in the user
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !user) throw new Error("Invalid credentials");

      // 2. Check if they are actually an ADMIN
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        // If not admin, sign them out immediately
        await supabase.auth.signOut();
        throw new Error("Access Denied: You do not have admin privileges.");
      }

      // 3. Success! Redirect to dashboard
      router.push("/admin/dashboard");

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFCF2] flex flex-col items-center justify-center relative">
      
      {/* Top Left Logo */}
      <div className="absolute top-8 left-8 w-32 h-10">
        <Image 
          src="/images/logo.png" 
          alt="Neighborhood Logo" 
          fill
          className="object-contain object-left"
        />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-bodoni text-[#212529]">Admin Portal</h1>
          <p className="text-gray-500 mt-2 text-sm">Restricted Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input 
              id="email" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-gray-50 border-gray-200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-gray-50 border-gray-200"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 bg-[#212529] hover:bg-black text-white rounded-lg mt-4 font-medium transition-all"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Authenticate"}
          </Button>
        </form>

        <div className="mt-6 flex justify-center text-xs text-gray-400 gap-2 items-center">
          <Lock className="h-3 w-3" />
          <span>Secured Admin Environment</span>
        </div>
      </div>
    </div>
  );
}