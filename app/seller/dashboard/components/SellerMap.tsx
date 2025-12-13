"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import L from "leaflet";
import { useEffect, useState, useMemo, useRef } from "react";
import { Geocoder, geocoders } from "leaflet-control-geocoder";

// Fix Icons for Next.js
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

// --- 1. REVERSE GEOCODING HELPER ---
// Takes Lat/Lng and returns a text address
const getAddressFromCoordinates = async (lat: number, lng: number) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await response.json();
    // Return the formatted address
    return data.display_name;
  } catch (error) {
    console.error("Error fetching address:", error);
    return null;
  }
};

// --- 2. SEARCH BAR COMPONENT ---
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
        const addressName = e.geocode.name; 
        
        map.setView(latlng, 16);
        onLocationFound(latlng.lat, latlng.lng, addressName);
      })
      .addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, onLocationFound]);

  return null;
}

// --- 3. DRAGGABLE MARKER COMPONENT ---
function LocationMarker({ 
  position, 
  setPosition, 
  onLocationUpdate, // New prop to pass data back up
  shopName 
}: { 
  position: [number, number] | null, 
  setPosition: (pos: [number, number]) => void,
  onLocationUpdate: (lat: number, lng: number, address: string) => void,
  shopName: string 
}) {
  const map = useMap();
  const markerRef = useRef<any>(null);

  // HANDLE DRAG EVENTS
  const eventHandlers = useMemo(
    () => ({
      async dragend() {
        const marker = markerRef.current;
        if (marker) {
          const { lat, lng } = marker.getLatLng();
          
          // Update Map Pin Position
          setPosition([lat, lng]);
          
          // Fetch Address & Update Dashboard
          const address = await getAddressFromCoordinates(lat, lng);
          if (address) {
            onLocationUpdate(lat, lng, address);
          }
        }
      },
    }),
    [setPosition, onLocationUpdate]
  );

  // HANDLE CLICK EVENTS
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      map.flyTo(e.latlng, map.getZoom());
      
      // Fetch Address on click too
      const address = await getAddressFromCoordinates(lat, lng);
      if (address) {
        onLocationUpdate(lat, lng, address);
      }
    },
  });

  return position === null ? null : (
    <Marker 
      draggable={true} // ALLOW DRAGGING
      eventHandlers={eventHandlers} // LISTEN FOR DRAG
      position={position}
      ref={markerRef}
    >
      <Popup>
        <div className="text-center">
           <span className="font-bold">{shopName || "My Shop"}</span>
           <br />
           <span className="text-xs text-gray-500">Drag me to adjust address!</span>
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
            onLocationFound={(lat, lng, name) => {
              setPosition([lat, lng]);
              onLocationSelect(lat, lng, name);
            }} 
          />
          
          <LocationMarker 
            position={position} 
            setPosition={setPosition}
            onLocationUpdate={onLocationSelect} // Connect marker to dashboard
            shopName={shopName}
          />
        </MapContainer>
        
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-md text-xs font-medium text-gray-600 pointer-events-none">
            {position ? "Drag pin to adjust address" : "Search or click to pin"}
        </div>
    </div>
  );
}