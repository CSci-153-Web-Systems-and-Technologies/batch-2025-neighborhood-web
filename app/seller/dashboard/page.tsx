"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { 
  Store, Package, Calendar, Settings, LogOut, 
  Plus, Trash2, Edit2, Loader2, UploadCloud, XCircle, X, Camera, ImageIcon, Check 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Ensure you have this or use standard input range
import { createClient } from "@/lib/client";
import { uploadImage } from "@/utils/supabase/uploadImage";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";

// Dynamic Import for Map
const SellerMap = dynamic(
  () => import('./components/SellerMap'),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 animate-pulse rounded-xl" /> }
);

// --- HELPER: GENERATE CROPPED IMAGE ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
}

export default function SellerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  const [shopId, setShopId] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  // SHOP PROFILE STATE
  const [shopProfile, setShopProfile] = useState({
    name: "",
    bio: "", 
    address: "",
    lat: 0,
    lng: 0,
    image_url: "" as string | null,
    cover_image: "" as string | null
  });
  
  // IMAGE STATES
  const [shopImageFile, setShopImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  
  // CROPPER STATES
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const shopFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // PRODUCT STATES
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null); 
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // EVENT STATES
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push("/auth/seller-login");

        const { data: shop } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (shop) {
          setShopId(shop.id);
          setShopProfile({
            name: shop.name,
            bio: shop.description || "",
            address: shop.address,
            lat: shop.latitude || 10.745,
            lng: shop.longitude || 124.79,
            image_url: shop.image_url || null,
            cover_image: shop.cover_image || null
          });

          const { data: productsData } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false });
          const { data: eventsData } = await supabase.from('events').select('*').eq('shop_id', shop.id).order('start_date', { ascending: true });
          
          if (productsData) setProducts(productsData);
          if (eventsData) setEvents(eventsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, supabase]);

  const handleLogout = async () => {
    // 1. Add confirmation check
    if (confirm("Are you sure you want to log out?")) {
      await supabase.auth.signOut();
      router.push("/auth/seller-login");
    }
  };

  // --- PRODUCT HANDLERS ---
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setProductImageFile(e.target.files[0]);
    }
  };

  const openProductModal = (product: any = null) => {
    setCurrentProduct(product);
    setProductImageFile(null);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setProducts(products.filter(p => p.id !== id));
    await supabase.from('products').delete().eq('id', id);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return alert("Please save your Shop Settings first.");
    
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const price = formData.get("price");

    try {
      let imageUrl = currentProduct?.image_url || null;

      if (productImageFile) {
        imageUrl = await uploadImage(productImageFile, 'product-images');
        if (!imageUrl) throw new Error("Image upload failed");
      }

      const productData = { shop_id: shopId, name, price, image_url: imageUrl };

      if (currentProduct) {
        const { data, error } = await supabase.from('products').update(productData).eq('id', currentProduct.id).select().single();
        if (error) throw error;
        setProducts(products.map(p => p.id === currentProduct.id ? data : p));
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select().single();
        if (error) throw error;
        setProducts([data, ...products]);
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      alert("Error saving product: " + err.message);
    } finally {
      setIsSaving(false);
      setProductImageFile(null);
    }
  };

  // --- EVENT HANDLERS ---
  const openEventModal = (event: any = null) => {
    setCurrentEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    setEvents(events.filter(e => e.id !== id));
    await supabase.from('events').delete().eq('id', id);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return alert("Shop not found.");

    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get("title");
    const description = formData.get("description");
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const status = formData.get("status");

    const eventData = { shop_id: shopId, title, description, start_date: startDate, end_date: endDate, status };

    try {
      if (currentEvent) {
        const { data, error } = await supabase.from('events').update(eventData).eq('id', currentEvent.id).select().single();
        if (error) throw error;
        setEvents(events.map(ev => ev.id === currentEvent.id ? data : ev));
      } else {
        const { data, error } = await supabase.from('events').insert(eventData).select().single();
        if (error) throw error;
        setEvents([...events, data]);
      }
      setIsEventModalOpen(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- SHOP SETTINGS & CROP HANDLERS ---
  
  const handleShopImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShopImageFile(e.target.files[0]);
    }
  };

  // 1. Intercept Cover Image Selection
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageToCrop(reader.result as string);
        setIsCropModalOpen(true); // Open Modal instead of setting file immediately
      });
      reader.readAsDataURL(file);
    }
  };

  // 2. Handle Crop Complete
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 3. Save Cropped Image
  const handleCropSave = async () => {
    try {
      if (!imageToCrop || !croppedAreaPixels) return;
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      
      if (croppedBlob) {
        const file = new File([croppedBlob], "cover-image.jpg", { type: "image/jpeg" });
        setCoverImageFile(file); // Set the CROPPED file as the one to upload
        setIsCropModalOpen(false);
        setImageToCrop(null);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to crop image.");
    }
  };

  const handleSaveShopSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return;

      let finalImageUrl = shopProfile.image_url;
      let finalCoverUrl = shopProfile.cover_image;

      // Upload Logo
      if (shopImageFile) {
         const uploadedUrl = await uploadImage(shopImageFile, 'neighborhood-images', 'shops');
         if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      // Upload Cover (This now uses the Cropped File)
      if (coverImageFile) {
         const uploadedUrl = await uploadImage(coverImageFile, 'neighborhood-images', 'shop-covers');
         if (uploadedUrl) finalCoverUrl = uploadedUrl;
      }

      const shopData = { 
        owner_id: user.id, 
        name: shopProfile.name, 
        description: shopProfile.bio, 
        address: shopProfile.address, 
        latitude: shopProfile.lat, 
        longitude: shopProfile.lng,
        image_url: finalImageUrl,
        cover_image: finalCoverUrl
      };

      if (shopId) {
        await supabase.from('shops').update(shopData).eq('id', shopId);
      } else {
        const { data } = await supabase.from('shops').insert(shopData).select().single();
        if(data) setShopId(data.id);
      }
      
      setShopProfile(prev => ({ 
          ...prev, 
          image_url: finalImageUrl,
          cover_image: finalCoverUrl 
      }));
      setShopImageFile(null); 
      setCoverImageFile(null);
      
      alert("Shop settings saved!");
    } catch (error) { 
        console.error(error);
        alert("Failed to save settings"); 
    } finally { 
        setIsSaving(false); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full hidden md:flex flex-col z-20">
        <div className="p-6 h-16 flex items-center">
           <Image src="/images/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab("overview")} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors", activeTab === "overview" ? "bg-[#212529] text-white" : "text-gray-600 hover:bg-gray-50")}>
            <Store className="h-4 w-4" /> Overview
          </button>
          <button onClick={() => setActiveTab("products")} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors", activeTab === "products" ? "bg-[#212529] text-white" : "text-gray-600 hover:bg-gray-50")}>
            <Package className="h-4 w-4" /> Products
          </button>
          <button onClick={() => setActiveTab("events")} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors", activeTab === "events" ? "bg-[#212529] text-white" : "text-gray-600 hover:bg-gray-50")}>
            <Calendar className="h-4 w-4" /> Events
          </button>
          <button onClick={() => setActiveTab("settings")} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors", activeTab === "settings" ? "bg-[#212529] text-white" : "text-gray-600 hover:bg-gray-50")}>
            <Settings className="h-4 w-4" /> Shop Settings
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              <LogOut className="h-4 w-4" /> Log out
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-8">
        <div className="mb-8">
           <h1 className="text-2xl font-bold font-bodoni text-[#212529]">Seller Dashboard</h1>
           <p className="text-gray-500 text-sm">Managing: {shopProfile.name || "My Shop"}</p>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                   <p className="text-sm text-gray-500 font-bold">Total Products</p>
                   <p className="text-4xl font-bold text-[#212529] mt-2">{products.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                   <p className="text-sm text-gray-500 font-bold">Total Events Created</p>
                   <p className="text-4xl font-bold text-[#212529] mt-2">{events.length}</p>
                </div>
             </div>

             <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                 <h3 className="font-bold text-lg mb-4 text-[#212529]">Happening Now & Coming Soon</h3>
                 <div className="space-y-4">
                     {events.filter(e => e.status === 'Active' || e.status === 'Upcoming').length === 0 ? (
                         <div className="text-center py-8 text-gray-400 border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No active or upcoming events.</p>
                         </div>
                     ) : (
                         events.filter(e => e.status === 'Active' || e.status === 'Upcoming').map(e => (
                             <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-[#88A2FF]/30 transition-colors">
                                 <div>
                                     <div className="flex items-center gap-2 mb-1">
                                         <h4 className="font-bold text-[#212529]">{e.title}</h4>
                                         <span className={cn("px-2 py-0.5 text-[10px] uppercase font-bold rounded-full", e.status === 'Active' ? "bg-green-100 text-green-700 border border-green-200" : "bg-blue-100 text-blue-700 border border-blue-200")}>{e.status}</span>
                                     </div>
                                     <p className="text-sm text-gray-500">{new Date(e.start_date).toLocaleDateString()} - {new Date(e.end_date).toLocaleDateString()}</p>
                                 </div>
                                 <Button variant="outline" size="sm" onClick={() => openEventModal(e)} className="bg-white border-gray-200 text-gray-500 hover:text-[#212529]"><Edit2 className="h-3 w-3 mr-2" /> Edit</Button>
                             </div>
                         ))
                     )}
                 </div>
             </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
           <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex justify-between mb-6">
                 <h3 className="font-bold text-lg">Inventory / Menu</h3>
                 <Button onClick={() => openProductModal()} className="rounded-full bg-[#212529] text-white"><Plus className="h-4 w-4 mr-2"/> Add Item</Button>
              </div>
              <div className="space-y-4">
                 {products.map(p => (
                   <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-lg border border-gray-200 relative overflow-hidden flex-shrink-0">
                            {p.image_url ? (<Image src={p.image_url} alt={p.name} fill className="object-cover" />) : (<div className="flex h-full items-center justify-center text-gray-300"><Package className="h-8 w-8"/></div>)}
                        </div>
                        <div><p className="font-bold text-[#212529]">{p.name}</p><p className="text-sm text-gray-500">₱{p.price}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon-sm" variant="outline" onClick={() => openProductModal(p)}><Edit2 className="h-4 w-4"/></Button>
                        <Button size="icon-sm" variant="outline" className="text-red-600" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
           <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex justify-between mb-6">
                 <h3 className="font-bold text-lg">Events</h3>
                 <Button onClick={() => openEventModal(null)} className="rounded-full bg-[#212529] text-white"><Plus className="h-4 w-4 mr-2"/> Create Event</Button>
              </div>
              <div className="space-y-4">
                 {events.map(e => (
                   <div key={e.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <div><p className="font-bold">{e.title}</p><p className="text-sm text-gray-500">{e.start_date ? new Date(e.start_date).toLocaleDateString() : ""} {e.end_date ? ` - ${new Date(e.end_date).toLocaleDateString()}` : ""}</p></div>
                      <div className="flex items-center gap-3">
                        <span className={cn("px-3 py-1 text-xs rounded-full border", e.status === 'Active' ? "bg-green-100 text-green-700 border-green-200" : e.status === 'Upcoming' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-700 border-gray-200")}>{e.status || "Active"}</span>
                        <Button size="icon-sm" variant="outline" onClick={() => openEventModal(e)}><Edit2 className="h-4 w-4 text-gray-600"/></Button>
                        <Button size="icon-sm" variant="outline" className="text-red-600" onClick={() => handleDeleteEvent(e.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                   </div>
                 ))}
                 {events.length === 0 && <p className="text-center text-gray-400 py-8">No events created yet.</p>}
              </div>
           </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                 <h3 className="font-bold text-lg mb-4">Shop Details</h3>
                 
                 <div className="relative mb-12 group">
                    {/* COVER IMAGE - Shows cropped version if available */}
                    <div className="h-40 w-full rounded-xl bg-gray-200 overflow-hidden relative border border-gray-100">
                        {coverImageFile ? (
                           <img src={URL.createObjectURL(coverImageFile)} alt="Cover Preview" className="h-full w-full object-cover" />
                        ) : shopProfile.cover_image ? (
                           <img src={shopProfile.cover_image} alt="Shop Cover" className="h-full w-full object-cover" />
                        ) : (
                           <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                              <ImageIcon className="h-8 w-8 mb-2 opacity-50"/>
                              <span className="text-xs font-medium">Add a cover photo</span>
                           </div>
                        )}
                        <div 
                           onClick={() => coverFileInputRef.current?.click()}
                           className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors cursor-pointer flex items-center justify-center"
                        >
                           <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit2 className="h-3 w-3"/> Edit Cover
                           </span>
                        </div>
                        <input type="file" ref={coverFileInputRef} onChange={handleCoverImageChange} accept="image/*" className="hidden" />
                    </div>

                    {/* LOGO */}
                    <div className="absolute -bottom-10 left-6">
                        <div className="h-24 w-24 rounded-full border-4 border-white bg-white shadow-md relative overflow-hidden flex items-center justify-center group/logo cursor-pointer">
                           {shopImageFile ? (
                              <img src={URL.createObjectURL(shopImageFile)} alt="Logo Preview" className="h-full w-full object-cover" />
                           ) : shopProfile.image_url ? (
                              <img src={shopProfile.image_url} alt="Shop Logo" className="h-full w-full object-cover" />
                           ) : (
                              <Store className="h-8 w-8 text-gray-400" />
                           )}
                           <div 
                             onClick={() => shopFileInputRef.current?.click()}
                             className="absolute inset-0 bg-black/30 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center"
                           >
                              <Camera className="h-6 w-6 text-white" />
                           </div>
                           <input type="file" ref={shopFileInputRef} onChange={handleShopImageChange} accept="image/*" className="hidden" />
                        </div>
                    </div>
                 </div>

                 <div className="grid gap-2 mt-12"><Label>Shop Name</Label><Input value={shopProfile.name} onChange={e => setShopProfile({...shopProfile, name: e.target.value})} /></div>
                 <div className="grid gap-2"><Label>Bio</Label><Input value={shopProfile.bio} onChange={e => setShopProfile({...shopProfile, bio: e.target.value})} /></div>
                 <div className="grid gap-2"><Label>Address</Label><Input value={shopProfile.address} onChange={e => setShopProfile({...shopProfile, address: e.target.value})} /></div>
                 <Button onClick={handleSaveShopSettings} disabled={isSaving} className="w-full bg-[#212529] text-white mt-4">{isSaving ? "Saving..." : "Save Changes"}</Button>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                 <h3 className="font-bold text-lg mb-4">Location</h3>
                 <SellerMap shopName={shopProfile.name} onLocationSelect={(lat, lng, address) => setShopProfile(prev => ({ ...prev, lat, lng, address: address || prev.address }))} />
              </div>
           </div>
        )}
      </main>

      {/* --- CROP MODAL (NEW) --- */}
      {isCropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
           <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg">Adjust Cover Photo</h3>
                 <button onClick={() => setIsCropModalOpen(false)}><X className="h-5 w-5 text-gray-400"/></button>
              </div>
              
              {/* Cropper Container */}
              <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden mb-6">
                 <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={3 / 1} // FORCE 3:1 ASPECT RATIO
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                 />
              </div>

              {/* Controls */}
              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-500">Zoom</span>
                    {/* Simple Slider using input range if Slider component not available */}
                    <input 
                      type="range" 
                      min={1} 
                      max={3} 
                      step={0.1} 
                      value={zoom} 
                      onChange={(e) => setZoom(Number(e.target.value))} 
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 
                 <div className="flex gap-3">
                    <Button variant="outline" className="w-full" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
                    <Button className="w-full bg-[#212529] text-white" onClick={handleCropSave}>
                       <Check className="h-4 w-4 mr-2" /> Apply
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">{currentProduct ? "Edit Item" : "Add New Item"}</h3>
                  <button onClick={() => setIsProductModalOpen(false)}><X className="h-5 w-5 text-gray-400"/></button>
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-5">
                 <div className="space-y-2">
                    <Label>Product Image</Label>
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative w-32 h-32 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center group">
                            {productImageFile ? (<Image src={URL.createObjectURL(productImageFile)} alt="Preview" fill className="object-cover" />) : currentProduct?.image_url ? (<Image src={currentProduct.image_url} alt="Current" fill className="object-cover" />) : (<Package className="h-10 w-10 text-gray-300" />)}
                            <input type="file" ref={fileInputRef} onChange={handleProductImageChange} accept="image/*" className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer"><UploadCloud className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        </div>
                        {productImageFile && (<button type="button" onClick={() => setProductImageFile(null)} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><XCircle className="h-3 w-3"/> Clear selection</button>)}
                    </div>
                 </div>
                 <div className="grid gap-2"><Label>Name</Label><Input name="name" defaultValue={currentProduct?.name} required placeholder="e.g. Signature Coffee" /></div>
                 <div className="grid gap-2"><Label>Price (₱)</Label><Input name="price" type="number" step="0.01" defaultValue={currentProduct?.price} required placeholder="0.00" /></div>
                 <Button type="submit" disabled={isSaving} className="w-full bg-[#212529] text-white h-11">{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (currentProduct ? "Update Item" : "Add Item")}</Button>
              </form>
           </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{currentEvent ? "Edit Event" : "New Event"}</h3>
                <button onClick={() => setIsEventModalOpen(false)}><X className="h-5 w-5 text-gray-400"/></button>
              </div>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                 <div className="grid gap-2"><Label>Title</Label><Input name="title" defaultValue={currentEvent?.title} required placeholder="e.g. Summer Sale" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Start Date</Label><Input name="startDate" type="date" defaultValue={currentEvent?.start_date} required /></div>
                    <div className="grid gap-2"><Label>End Date</Label><Input name="endDate" type="date" defaultValue={currentEvent?.end_date} required /></div>
                 </div>
                 <div className="grid gap-2"><Label>Description</Label><textarea name="description" defaultValue={currentEvent?.description} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Describe your event..." /></div>
                 <div className="grid gap-2"><Label>Status</Label><select name="status" defaultValue={currentEvent?.status || "Upcoming"} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"><option value="Upcoming">Upcoming</option><option value="Active">Active</option><option value="Ended">Ended</option></select></div>
                 <Button type="submit" disabled={isSaving} className="w-full bg-[#212529] text-white">{isSaving ? "Saving..." : (currentEvent ? "Save Changes" : "Create Event")}</Button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}