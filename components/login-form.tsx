"use client"

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Authenticate (Check Email/Password)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError

      // 2. Authorization (Check Role)
      if (authData.user) {
        // Fetch the profile AND the role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role') 
          .eq('id', authData.user.id)
          .single()

        if (profileError || !profile) {
          await supabase.auth.signOut()
          throw new Error("Account setup incomplete. Please contact support.")
        }

        // --- NEW CHECK: PREVENT ADMIN LOGIN ---
        if (profile.role === 'admin') {
          await supabase.auth.signOut() // Immediately log them out
          throw new Error("Admins are restricted from this portal. Please use the Admin Login.")
        }
      }

      // 3. Success! Redirect regular users
      router.push('/protected/dashboard') 
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex w-full min-h-screen bg-[#FFFCF2]", className)} {...props}>
      
      {/* LEFT SIDE — FORM */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-12 lg:p-16 relative justify-center">
        
        {/* Back Button */}
        <button 
          onClick={() => router.push("/")}
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-[#212529] transition-colors font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back 
        </button>

        <div className="mx-auto w-full max-w-[400px] flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-bodoni text-[#212529] mb-3">
              Welcome Back
            </h1>
            <p className="text-gray-500">
              Enter your details to access your neighborhood.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white border-gray-200 focus-visible:ring-[#88A2FF] rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-[#88A2FF] hover:text-[#6b89ff] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white border-gray-200 focus-visible:ring-[#88A2FF] rounded-xl"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="h-12 w-full bg-[#212529] hover:bg-gray-800 text-white text-base font-medium rounded-full mt-2 shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...</>
              ) : (
                'Log in'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="font-semibold text-[#88A2FF] hover:underline">
              Sign up 
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — IMAGE */}
      <div className="hidden lg:flex w-1/2 bg-[#C0E0FF]/30 relative items-center justify-center p-12 overflow-hidden">
        {/* Decorative Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C0E0FF] rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-[600px]">
          <img
            src="/images/login.png" 
            alt="Login Illustration"
            className="w-full h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700"
          />
        </div>
      </div>

    </div>
  )
}