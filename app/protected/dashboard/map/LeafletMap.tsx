"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";
import { Search, MapPin, Store, Star, Locate, Loader2, ImageIcon } from "lucide-react"; 

// --- Fix for missing default Leaflet icons ---
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

// --- COMPONENT TO CONTROL MAP VIEW ---
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 2 });
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
  const [isLocating, setIsLocating] = useState(false);

  // 1. Fetch Verified Shops (Updated to include cover_image)
  useEffect(() => {
    const fetchShops = async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, latitude, longitude, category, image_url, rating, cover_image'); // <--- ADDED cover_image
      
      if (data && !error) {
        setShops(data);
      }
    };
    
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
      const matches = shops.filter(s => 
        (s.name && s.name.toLowerCase().includes(lowerQ)) || 
        (s.address && s.address.toLowerCase().includes(lowerQ))
      );
      setFilteredShops(matches);
    }
  }, [searchQuery, shops]);

  const handleShopSelect = (shop: any) => {
    setSelectedLocation([shop.latitude, shop.longitude]);
    setSearchQuery("");
    setFilteredShops([]);
  };

  const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation([latitude, longitude]);
        setIsLocating(false);
      },
      () => {
        alert("Unable to retrieve location.");
        setIsLocating(false);
      }
    );
  };

  const defaultCenter: [number, number] = [10.745, 124.79]; 

  return (
    <div className="relative w-full h-full">
      
      {/* --- FLOATING CONTROLS --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md flex flex-col gap-3">
        {/* Search Bar */}
        <div className="relative shadow-lg rounded-xl w-full">
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

        {/* Search Results Dropdown (Keeps Logo for small list items) */}
        {filteredShops.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto">
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

      {/* --- LOCATE ME BUTTON --- */}
      <button 
        onClick={handleLocateMe}
        disabled={isLocating}
        className="absolute bottom-8 right-8 z-[1000] bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-all active:scale-95 disabled:opacity-70"
      >
        {isLocating ? <Loader2 className="h-6 w-6 animate-spin text-[#88A2FF]" /> : <Locate className="h-6 w-6" />}
      </button>

      {/* --- MAP CONTAINER --- */}
      <MapContainer center={defaultCenter} zoom={10} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater center={selectedLocation} />
        
        {/* --- RENDER MARKERS --- */}
        {shops.map((shop) => (
          shop.latitude && shop.longitude ? (
            <Marker key={shop.id} position={[shop.latitude, shop.longitude]}>
              <Popup>
                <div className="min-w-[200px] text-center p-1">
                  
                  {/* UPDATE: Use Cover Image in the Popup */}
                  <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center relative">
                     {shop.cover_image ? (
                       <img src={shop.cover_image} className="w-full h-full object-cover" alt={shop.name} />
                     ) : shop.image_url ? (
                       // Fallback to logo if no cover exists, but blurry/zoomed to act like a background
                       <img src={shop.image_url} className="w-full h-full object-cover opacity-80 blur-[2px]" alt={shop.name} />
                     ) : (
                       <ImageIcon className="h-8 w-8 text-gray-300" />
                     )}
                     
                     {/* Overlay Logo (Optional small circle in corner like a profile) */}
                     {shop.image_url && (
                        <div className="absolute -bottom-2 right-2 w-10 h-10 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm">
                            <img src={shop.image_url} className="w-full h-full object-cover" />
                        </div>
                     )}
                  </div>
                  
                  <h3 className="font-bold text-base m-0 text-[#212529]">{shop.name}</h3>
                  <div className="flex items-center justify-center gap-1 my-1">
                     <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                     <span className="text-xs font-bold">{shop.rating?.toFixed(2) || "0.00"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{shop.address}</p>
                  
                  <button 
                    onClick={() => router.push(`/protected/dashboard/shop?id=${shop.id}`)}
                    className="w-full bg-[#212529] text-white py-1.5 rounded-md text-xs font-bold hover:bg-gray-800 transition-colors"
                  >
                    Visit Shop
                  </button>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {selectedLocation && !isLocating && (
           <Marker position={selectedLocation} icon={L.divIcon({ className: 'bg-transparent', html: '<div style="background-color: #88A2FF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>' })}>
             <Popup>You are here</Popup>
           </Marker>
        )}
      </MapContainer>
    </div>
  );
}