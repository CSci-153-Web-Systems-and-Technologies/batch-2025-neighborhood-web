"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function MapPage() {
  const router = useRouter();


  const Map = useMemo(() => dynamic(
    () => import('@/app/protected/dashboard/map/LeafletMap'),
    { 
      loading: () => <p className="text-[#88A2FF] font-medium animate-pulse">Loading Map...</p>,
      ssr: false 
    }
  ), []);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-[#212529] transition-colors w-fit"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">Back</span>
      </button>

      {/* Map Container */}
      <div className="w-full flex-1 min-h-[600px] bg-white p-2 rounded-3xl shadow-sm border border-gray-100 relative">
        <div className="w-full h-full rounded-2xl overflow-hidden relative z-0">
           <Map />
        </div>
      </div>
    </div>
  );
}