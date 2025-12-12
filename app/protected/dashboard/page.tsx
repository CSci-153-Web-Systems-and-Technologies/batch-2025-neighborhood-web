'use client';

import CategoryTabs from './components/CategoryTabs'
import TopRatedSection from './components/TopRatedSection'
import StoresNearYou from './components/StoresNearYou'
import { MapPin } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // CHANGE HERE:
  // If no town is selected, it defaults to "Leyte" instead of "Town Name"
  const townName = searchParams.get("town") || "Leyte";
  
  return (
    <div className="relative min-h-screen pb-20"> 
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#212529]">
          Welcome to <span className="text-[#88A2FF]">{townName}</span>
        </h1>
      </div>

      <CategoryTabs />

      <div className="space-y-10">
        <TopRatedSection />
        <StoresNearYou />
      </div>

      <button 
        onClick={() => router.push("/protected/dashboard/Map")}
        className="fixed bottom-8 right-8 bg-[#212529] text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-105 group z-50"
      >
        <MapPin className="h-6 w-6" />
        <span className="sr-only">Open Map</span>
      </button>
      
    </div>
  )
}