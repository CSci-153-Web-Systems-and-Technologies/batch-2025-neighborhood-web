"use client";

import { useEffect, useState } from 'react';
import StoreCard from './StoreCard';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Loader2 } from 'lucide-react';

export default function TopRatedSection() {
  const router = useRouter();
  const supabase = createClient();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      // Fetch shops that are 'approved' (we assume existing shops in DB are approved for now)
      // You can add .eq('status', 'approved') if you have that column in a 'shops' or 'applications' join
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .limit(6); // Just show top 6 for now

      if (!error && data) {
        setShops(data);
      }
      setLoading(false);
    };

    fetchShops();
  }, []);

  if (loading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#212529]">Top-rated Stores</h2>
        <button className="text-[#88A2FF] hover:text-blue-800 font-medium text-sm">
          See all →
        </button>
      </div>
      
      {shops.length === 0 ? (
        <p className="text-gray-500 italic">No shops found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((store) => (
            <StoreCard 
              key={store.id} 
              name={store.name}
              rating={store.rating || 0} // Default to 0 if null
              address={store.address}
              image={store.cover_image} 
              // PASS THE ID IN THE URL
              onClick={() => router.push(`/protected/dashboard/Shop?id=${store.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  )
}