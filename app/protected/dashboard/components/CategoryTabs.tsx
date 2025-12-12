"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const categories = [
  "All", // Added an "All" option
  "Food",
  "Clothes",
  "Services",
  "Tourism",
  "Entertainment",
  "Stalls",
  "Shopping & Malls",
];

export default function CategoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get active category from URL, default to "All"
  const activeCategory = searchParams.get("category") || "All";

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (category === "All") {
      params.delete("category"); // Remove filter if "All"
    } else {
      params.set("category", category);
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full border-b border-gray-200 mb-8 overflow-x-auto">
      <div className="flex items-center gap-8 min-w-max px-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={cn(
              "pb-3 text-sm font-semibold transition-all border-b-2",
              activeCategory === category
                ? "border-[#88A2FF] text-[#88A2FF]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}