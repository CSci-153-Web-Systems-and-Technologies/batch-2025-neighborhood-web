"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/client';
import StoreCard from './StoreCard';
import { Loader2, MapPin } from 'lucide-react';

export default function StoresNearYou() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get filters from URL
  const selectedTown = searchParams.get("town");
  const selectedCategory = searchParams.get("category");

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      
      try {
        // Start building the query
        let query = supabase.from('shops').select('*');

        // 1. Filter by Category (if selected)
        if (selectedCategory && selectedCategory !== "All") {
          query = query.eq('category', selectedCategory);
        }

        // 2. Filter by Town (Search text inside the address field)
        // We use .ilike() for case-insensitive partial match
        if (selectedTown) {
          query = query.ilike('address', `%${selectedTown}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setShops(data || []);

      } catch (error) {
        console.error("Error fetching shops:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, [selectedTown, selectedCategory]); // Re-run whenever URL changes

  // --- RENDER ---

  if (loading) {
    return <div className="h-40 flex items-center justify-center text-[#88A2FF]"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-[#212529]">
          {selectedCategory ? `${selectedCategory} Stores` : "Stores"} 
          {selectedTown ? ` in ${selectedTown}` : " Near You"}
        </h2>
      </div>
      
      {shops.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
           <MapPin className="h-8 w-8 mb-2 opacity-50" />
           <p>No stores found matching your filters.</p>
           {(selectedTown || selectedCategory) && (
             <button 
               onClick={() => router.push('/protected/dashboard')}
               className="text-sm text-[#88A2FF] hover:underline mt-2"
             >
               Clear Filters
             </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((store) => (
            <StoreCard 
              key={store.id} 
              name={store.name}
              rating={store.rating || 0}
              address={store.address}
              image={store.cover_image}
              // Link to dynamic shop page
              onClick={() => router.push(`/protected/dashboard/Shop?id=${store.id}`)} 
            />
          ))}
        </div>
      )}
    </section>
  )
}