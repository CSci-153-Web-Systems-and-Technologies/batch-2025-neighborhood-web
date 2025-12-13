"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic"; // 1. Import dynamic


const LeafletMap = dynamic(
  () => import("./LeafletMap"),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading Map...</span>
      </div>
    )
  }
);

export default function MapPage() {
  const router = useRouter();

  return (
    <div className="space-y-4 h-[calc(100vh-120px)]">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-gray-600 font-medium hover:text-[#212529]"
      >
        <ArrowLeft className="h-5 w-5" /> Back to Dashboard
      </button>

      <div className="w-full h-full border border-gray-200 rounded-xl overflow-hidden shadow-sm relative z-0">
        <LeafletMap />
      </div>
    </div>
  );
}