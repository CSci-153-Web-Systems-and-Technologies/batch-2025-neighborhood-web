"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Geocoder, geocoders } from "leaflet-control-geocoder";

// Fix Icons
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

// --- 1. SEARCH BAR COMPONENT ---
function LeafletControlGeocoder({ onLocationFound }: { onLocationFound: (lat: number, lng: number, name: string) => void }) {
  const map = useMap();

  useEffect(() => {
    const geocoder = new Geocoder({
      defaultMarkGeocode: false,
      geocoder: new geocoders.Nominatim(),
      placeholder: "Search location...",
    });

    // @ts-ignore
    const control = L.Control.geocoder({
      geocoder: geocoder.options.geocoder,
      defaultMarkGeocode: false,
    })
      .on("markgeocode", function (e: any) {
        const latlng = e.geocode.center;
        const addressName = e.geocode.name; // <--- This gets the place name
        
        map.setView(latlng, 16);
        
        // Pass coordinates AND name back to parent
        onLocationFound(latlng.lat, latlng.lng, addressName);
      })
      .addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, onLocationFound]);

  return null;
}

// --- 2. CLICK MARKER COMPONENT ---
function LocationMarker({ 
  position, 
  setPosition, 
  shopName 
}: { 
  position: [number, number] | null, 
  setPosition: (pos: [number, number]) => void,
  shopName: string 
}) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      {/* 3. SHOW SHOP NAME IN POPUP */}
      <Popup>
        <div className="text-center">
           <span className="font-bold">{shopName || "My Shop"}</span>
           <br />
           <span className="text-xs text-gray-500">Selected Location</span>
        </div>
      </Popup>
    </Marker>
  );
}

// --- MAIN EXPORT ---
export default function SellerMap({ 
  onLocationSelect, 
  shopName 
}: { 
  onLocationSelect: (lat: number, lng: number, address?: string) => void,
  shopName: string 
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    (async function init() {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
    })();
  }, []);

  const handleSetPosition = (pos: [number, number], addressName?: string) => {
    setPosition(pos);
    onLocationSelect(pos[0], pos[1], addressName);
  };

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden relative z-0 border border-gray-200">
        <MapContainer 
          center={[10.745, 124.79]} 
          zoom={10} 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <LeafletControlGeocoder 
            onLocationFound={(lat, lng, name) => handleSetPosition([lat, lng], name)} 
          />
          
          <LocationMarker 
            position={position} 
            setPosition={(pos) => handleSetPosition(pos)} 
            shopName={shopName}
          />
        </MapContainer>
        
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-md text-xs font-medium text-gray-600 pointer-events-none">
            {position ? "Location Pinned!" : "Search or click to pin"}
        </div>
    </div>
  );
}