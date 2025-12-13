"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Store, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/client";

export default function SellerLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      // 1. Authenticate (Check Email/Password)
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !user) throw new Error("Invalid credentials");

      // 2. Authorization (Check Role)
      // Fetch the profile to see if they are actually a seller
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Profile not found. Please contact support.");
      }

      // --- SECURITY CHECK: KICK OUT NON-SELLERS ---
      if (profile.role !== 'seller') {
        await supabase.auth.signOut(); // Log them out immediately
        throw new Error("Access Denied: This portal is for verified Sellers only.");
      }
      
      // 3. Success! Redirect to Seller Dashboard
      router.push("/seller/dashboard");
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFCF2] flex flex-col items-center justify-center relative p-6">
      
      {/* Back to Home */}
      <button 
        onClick={() => router.push("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-[#212529] transition-colors font-medium text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-3xl p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F0F4FF] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#88A2FF]">
             <Store className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold font-bodoni text-[#212529]">Seller Centre</h1>
          <p className="text-gray-500 mt-2 text-sm">Log in to manage your shop</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="shop@business.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-gray-50 border-gray-200 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/auth/forgot-password" className="text-xs text-[#88A2FF] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-gray-50 border-gray-200 rounded-xl"
              required
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 bg-[#212529] hover:bg-gray-800 text-white rounded-full mt-2 font-medium transition-all shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Log In to Dashboard"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          New to Neighborhood?{' '}
          <Link href="/auth/seller-signup" className="font-bold text-[#212529] hover:underline">
            Apply as a Seller
          </Link>
        </div>
      </div>
    </div>
  );
}