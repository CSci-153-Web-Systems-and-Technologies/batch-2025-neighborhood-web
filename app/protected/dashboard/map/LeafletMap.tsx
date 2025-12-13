"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";
import { Search, MapPin, Store, Star } from "lucide-react"; 

// --- Fix for missing default Leaflet icons in Next.js ---
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

// --- COMPONENT TO CONTROL MAP VIEW ---
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 2 }); // Zoom level 16, smooth fly animation
    }
  }, [center, map]);
  return null;
}

export default function LeafletMap() {
  const router = useRouter();
  const supabase = createClient();
  
  const [shops, setShops] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredShops, setFilteredShops] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);

  // 1. Fetch Verified Shops from Supabase
  useEffect(() => {
    const fetchShops = async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, latitude, longitude, category, image_url, rating');
      
      if (data && !error) {
        setShops(data);
      }
    };
    
    // Ensure icons load correctly
    (async function init() {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
    })();

    fetchShops();
  }, []);

  // 2. Handle Search Logic
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredShops([]);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      // Filter shops by Name or Address
      const matches = shops.filter(s => 
        (s.name && s.name.toLowerCase().includes(lowerQ)) || 
        (s.address && s.address.toLowerCase().includes(lowerQ))
      );
      setFilteredShops(matches);
    }
  }, [searchQuery, shops]);

  const handleShopSelect = (shop: any) => {
    // Fly to the shop
    setSelectedLocation([shop.latitude, shop.longitude]);
    // Close the search dropdown
    setSearchQuery("");
    setFilteredShops([]);
  };

  // Default Coordinates (Leyte)
  const defaultCenter: [number, number] = [10.745, 124.79]; 

  return (
    <div className="relative w-full h-full">
      
      {/* --- CUSTOM SEARCH BAR OVERLAY --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
        <div className="relative shadow-lg rounded-xl">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="h-5 w-5" />
          </div>
          <input 
            type="text"
            placeholder="Search for a verified shop..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#88A2FF] bg-white/95 backdrop-blur-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Search Results Dropdown */}
        {filteredShops.length > 0 && (
          <div className="mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto">
            {filteredShops.map((shop) => (
              <div 
                key={shop.id}
                onClick={() => handleShopSelect(shop)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                   {shop.image_url ? (
                     <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                   ) : (
                     <Store className="h-5 w-5 text-gray-400" />
                   )}
                </div>
                <div>
                  <p className="font-bold text-sm text-[#212529]">{shop.name}</p>
                  <p className="text-xs text-gray-500 truncate">{shop.address}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MAP CONTAINER --- */}
      <MapContainer 
        center={defaultCenter} 
        zoom={10} 
        style={{ height: "100%", width: "100%", zIndex: 0 }} 
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Controls the flying animation */}
        <MapUpdater center={selectedLocation} />
        
        {/* --- RENDER MARKERS FOR ALL SHOPS --- */}
        {shops.map((shop) => (
          shop.latitude && shop.longitude ? (
            <Marker key={shop.id} position={[shop.latitude, shop.longitude]}>
              <Popup>
                <div className="min-w-[200px] text-center p-1">
                  {/* Shop Image in Popup */}
                  <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                     {shop.image_url ? (
                       <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                     ) : (
                       <Store className="h-8 w-8 text-gray-300" />
                     )}
                  </div>
                  
                  <h3 className="font-bold text-base m-0 text-[#212529]">{shop.name}</h3>
                  <div className="flex items-center justify-center gap-1 my-1">
                     <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                     <span className="text-xs font-bold">{shop.rating?.toFixed(2) || "0.00"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{shop.address}</p>
                  
                  <button 
                    onClick={() => router.push(`/protected/dashboard/Shop?id=${shop.id}`)}
                    className="w-full bg-[#212529] text-white py-1.5 rounded-md text-xs font-bold hover:bg-gray-800 transition-colors"
                  >
                    Visit Shop
                  </button>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

      </MapContainer>
    </div>
  );
}