"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, ChevronDown, User, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
// 1. Import the hook to access shared user data
import { useUser } from "@/app/context/UserContext";

const leyteTowns = [
  "Tacloban City", "Ormoc City", "Baybay City", "Abuyog", "Alangalang", "Albuera",
  "Babatngon", "Barugo", "Bato", "Burauen", "Calubian", "Capoocan", "Carigara",
  "Dagami", "Dulag", "Hilongos", "Hindang", "Inopacan", "Isabel", "Jaro",
  "Javier", "Julita", "Kananga", "La Paz", "Leyte", "MacArthur", "Mahaplag",
  "Matag-ob", "Matalom", "Mayorga", "Merida", "Palo", "Palompon", "Pastrana",
  "San Isidro", "San Miguel", "Santa Fe", "Tabango", "Tabontabon", "Tanauan",
  "Tolosa", "Tunga", "Villaba"
];

export default function DashboardHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 2. Get the dynamic user data
  const { user } = useUser();

  const selectedTown = searchParams.get("town") || "Town";

  const handleSelectTown = (town: string) => {
    setIsDropdownOpen(false);
    
    const params = new URLSearchParams(searchParams.toString());
    if (town === "Town") {
      params.delete("town");
    } else {
      params.set("town", town);
    }
    
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="w-full flex items-center justify-between px-8 py-4 bg-[#FFFCF2] border-b border-gray-100 sticky top-0 z-50">
      <div 
        className="relative h-10 w-28 cursor-pointer" 
        onClick={() => router.push("/protected/dashboard")}
      >
        <Image src="/images/logo.png" alt="Neighborhood Logo" fill className="object-contain object-left" />
      </div>

      <div className="flex-1 max-w-xl mx-8 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            type="text" 
            placeholder={`Search in ${selectedTown === "Town" ? "Neighborhood" : selectedTown}...`}
            className="w-full pl-10 bg-white border-gray-300 rounded-lg focus-visible:ring-[#88A2FF]"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 text-[#212529]">
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 font-medium hover:text-[#88A2FF] transition-colors"
          >
            <span className={cn(selectedTown !== "Town" && "text-[#88A2FF]")}>
              {selectedTown}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isDropdownOpen && "rotate-180")} />
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 max-h-80 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Select Location (Leyte)
                </div>
                
                <button
                  onClick={() => handleSelectTown("Town")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#88A2FF] flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 opacity-50" />
                  All Locations
                </button>

                {leyteTowns.map((town) => (
                  <button
                    key={town}
                    onClick={() => handleSelectTown(town)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 hover:text-[#88A2FF] transition-colors",
                      selectedTown === town ? "text-[#88A2FF] font-medium bg-blue-50/50" : "text-gray-700"
                    )}
                  >
                    {town}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={() => router.push("/protected/dashboard/Map")} className="font-medium hover:text-[#88A2FF]">
          Map
        </button>

        <div onClick={() => router.push("/protected/dashboard/Profile")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          {/* 3. Updated Avatar Circle */}
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300 text-sm font-bold text-gray-600">
             {/* Show the first letter of the name (e.g., "J") */}
             {user.name.charAt(0).toUpperCase()}
          </div>
          
          {/* 4. Updated Name Display */}
          <span className="font-semibold text-sm hidden sm:block">{user.name}</span>
        </div>
      </div>
    </header>
  );
}