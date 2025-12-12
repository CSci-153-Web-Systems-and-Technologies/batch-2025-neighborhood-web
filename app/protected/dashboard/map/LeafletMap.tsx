"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.css"; // 1. Import CSS
import L from "leaflet";
import { useEffect } from "react";
import { Geocoder, geocoders } from "leaflet-control-geocoder"; // 2. Import Geocoder

// --- Fix for missing default Leaflet icons in Next.js ---
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

// --- SEARCH COMPONENT ---
function LeafletControlGeocoder() {
  const map = useMap();

  useEffect(() => {
    const geocoder = new Geocoder({
      defaultMarkGeocode: false, 
      geocoder: new geocoders.Nominatim(),
      placeholder: "Search for a town or place...",
    });

    // @ts-ignore
    const control = L.Control.geocoder({
      geocoder: geocoder.options.geocoder,
      defaultMarkGeocode: false,
    })
      .on("markgeocode", function (e: any) {
        const latlng = e.geocode.center;
        
        // Fly to the location found
        map.setView(latlng, 16);
        
        // Optional: Add a temporary popup to show the found address
        L.popup()
          .setLatLng(latlng)
          .setContent(e.geocode.name)
          .openOn(map);
      })
      .addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
}

export default function LeafletMap() {
  
  // Ensure icons load correctly
  useEffect(() => {
    (async function init() {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
      });
    })();
  }, []);

  // Default Coordinates (Leyte)
  const center: [number, number] = [10.745, 124.79]; 

  return (
    <MapContainer 
      center={center} 
      zoom={10} 
      style={{ height: "600px", width: "100%", zIndex: 0 }} 
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* 3. Add the Search Control here */}
      <LeafletControlGeocoder />
      
      {/* Example Static Marker (You can keep or remove this) */}
      <Marker position={center}>
        <Popup>
          A sample location in Leyte. <br /> Your store could be here!
        </Popup>
      </Marker>
    </MapContainer>
  );
}