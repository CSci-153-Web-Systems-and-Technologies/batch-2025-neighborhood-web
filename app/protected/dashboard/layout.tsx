'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import DashboardHeader from './components/Header'
import { UserProvider } from '@/app/context/UserContext' // 1. Import Provider

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/auth/login')
      } else {
        setIsAuthenticated(true)
      }
    }

    checkUser()
  }, [router, supabase])

  if (!isAuthenticated) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>
  }

  return (
    // 2. Wrap everything in UserProvider
    <UserProvider>
      <div className="min-h-screen bg-[#F8F9FA]">
        <DashboardHeader />
        <main className="w-full p-6 md:p-8"> 
          {children}
        </main>
      </div>
    </UserProvider>
  )
}