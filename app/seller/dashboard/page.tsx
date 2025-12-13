"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { 
  Store, Package, Calendar, Settings, LogOut, 
  Plus, Trash2, Edit2, MapPin, Save, X, Loader2, UploadCloud, XCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/client";

// Dynamic Import for Map
const SellerMap = dynamic(
  () => import('./components/SellerMap'),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 animate-pulse rounded-xl" /> }
);

export default function SellerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  const [shopId, setShopId] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shopProfile, setShopProfile] = useState({
    name: "",
    bio: "", 
    address: "",
    lat: 0,
    lng: 0
  });

  // PRODUCT STATES
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null); 
  const [productImageFile, setProductImageFile] = useState<File | null>(null); // New Image State
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
  
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

        // Fetch Shop using 'owner_id' from your schema
        const { data: shop, error: shopError } = await supabase
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
            lng: shop.longitude || 124.79
          });

          // Order products by newest first
          const { data: productsData } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false });
          const { data: eventsData } = await supabase.from('events').select('*').eq('shop_id', shop.id);
          
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
    await supabase.auth.signOut();
    router.push("/auth/seller-login");
  };

  // --- PRODUCT HANDLERS (UPDATED) ---

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setProductImageFile(e.target.files[0]);
    }
  };

  const openProductModal = (product: any = null) => {
    setCurrentProduct(product);
    setProductImageFile(null); // Reset image file on open
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    // Optimistic update
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
    // NOTE: Stock input removed

    try {
      let imageUrl = currentProduct?.image_url || null;

      // 1. Handle Image Upload if a new file is selected
      if (productImageFile) {
        const fileExt = productImageFile.name.split('.').pop();
        // Path: shopId/timestamp_filename
        const filePath = `${shopId}/${Date.now()}_${productImageFile.name.replace(/[^a-zA-Z0-9]/g, '')}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('product-images') // Make sure this bucket exists!
            .upload(filePath, productImageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      const productData = {
        shop_id: shopId,
        name,
        price,
        // stock is removed
        image_url: imageUrl // Add image url to DB data
      };


      if (currentProduct) {
        // UPDATE existing product
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', currentProduct.id)
          .select()
          .single();
        if (error) throw error;
        setProducts(products.map(p => p.id === currentProduct.id ? data : p));
      } else {
        // INSERT new product
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        // Add new product to top of list
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
  // ... (Keep existing event handlers)
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

  // --- SHOP SETTINGS ---
  // ... (Keep existing shop settings handlers)
  const handleSaveShopSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return;
      const shopData = { owner_id: user.id, name: shopProfile.name, description: shopProfile.bio, address: shopProfile.address, latitude: shopProfile.lat, longitude: shopProfile.lng };

      if (shopId) {
        await supabase.from('shops').update(shopData).eq('id', shopId);
      } else {
        const { data } = await supabase.from('shops').insert(shopData).select().single();
        if(data) setShopId(data.id);
      }
      alert("Shop settings saved!");
    } catch (error) { alert("Failed to save settings"); } finally { setIsSaving(false); }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-bold">Total Products</p>
                <p className="text-4xl font-bold text-[#212529] mt-2">{products.length}</p>
             </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-bold">Active Events</p>
                <p className="text-4xl font-bold text-[#212529] mt-2">{events.length}</p>
             </div>
          </div>
        )}

        {/* PRODUCTS TAB (UPDATED LIST) */}
        {activeTab === "products" && (
           <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex justify-between mb-6">
                 <h3 className="font-bold text-lg">Inventory / Menu</h3>
                 <Button onClick={() => openProductModal()} className="rounded-full bg-[#212529] text-white">
                   <Plus className="h-4 w-4 mr-2"/> Add Item
                 </Button>
              </div>
              <div className="space-y-4">
                 {products.map(p => (
                   <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        {/* Product Image Thumbnail */}
                        <div className="h-16 w-16 bg-white rounded-lg border border-gray-200 relative overflow-hidden flex-shrink-0">
                            {p.image_url ? (
                                <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-300"><Package className="h-8 w-8"/></div>
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-[#212529]">{p.name}</p>
                            <p className="text-sm text-gray-500">₱{p.price}</p>
                            {/* Stock display removed */}
                        </div>
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
                 <Button onClick={() => { setCurrentEvent(null); setIsEventModalOpen(true); }} className="rounded-full bg-[#212529] text-white">
                   <Plus className="h-4 w-4 mr-2"/> Create Event
                 </Button>
              </div>
              <div className="space-y-4">
                 {events.map(e => (
                   <div key={e.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-bold">{e.title}</p>
                        <p className="text-sm text-gray-500">
                           {e.start_date ? new Date(e.start_date).toLocaleDateString() : ""} 
                           {e.end_date ? ` - ${new Date(e.end_date).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">{e.status}</span>
                        <Button size="icon-sm" variant="outline" className="text-red-600" onClick={() => handleDeleteEvent(e.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                 <h3 className="font-bold text-lg mb-4">Shop Details</h3>
                 <div className="grid gap-2"><Label>Shop Name</Label><Input value={shopProfile.name} onChange={e => setShopProfile({...shopProfile, name: e.target.value})} /></div>
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

      {/* PRODUCT MODAL (UPDATED WITH IMAGE UPLOAD) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">{currentProduct ? "Edit Item" : "Add New Item"}</h3>
                  <button onClick={() => setIsProductModalOpen(false)}><X className="h-5 w-5 text-gray-400"/></button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="space-y-5">
                 {/* Image Upload Section */}
                 <div className="space-y-2">
                    <Label>Product Image</Label>
                    <div className="flex flex-col items-center gap-3">
                        {/* Image Preview */}
                        <div className="relative w-32 h-32 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center group">
                            {productImageFile ? (
                                <Image src={URL.createObjectURL(productImageFile)} alt="Preview" fill className="object-cover" />
                            ) : currentProduct?.image_url ? (
                                <Image src={currentProduct.image_url} alt="Current" fill className="object-cover" />
                            ) : (
                                <Package className="h-10 w-10 text-gray-300" />
                            )}
                            
                            {/* Hidden File Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleProductImageChange}
                                accept="image/*"
                                className="hidden" 
                            />
                             {/* Overlay Button */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer"
                            >
                                <UploadCloud className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        
                        {/* Clear Selection Button */}
                        {productImageFile && (
                             <button type="button" onClick={() => setProductImageFile(null)} className="text-xs text-red-500 flex items-center gap-1 hover:underline">
                                <XCircle className="h-3 w-3"/> Clear selection
                             </button>
                        )}
                        <p className="text-xs text-gray-400">Click image to upload. Max 5MB.</p>
                    </div>
                 </div>

                 <div className="grid gap-2"><Label>Name</Label><Input name="name" defaultValue={currentProduct?.name} required placeholder="e.g. Signature Coffee" /></div>
                 <div className="grid gap-2"><Label>Price (₱)</Label><Input name="price" type="number" step="0.01" defaultValue={currentProduct?.price} required placeholder="0.00" /></div>
                 {/* Stock input removed here */}
                 
                 <Button type="submit" disabled={isSaving} className="w-full bg-[#212529] text-white h-11">
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (currentProduct ? "Update Item" : "Add Item")}
                </Button>
              </form>
           </div>
        </div>
      )}

      {/* NEW EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Event</h3><button onClick={() => setIsEventModalOpen(false)}><X className="h-5 w-5 text-gray-400"/></button></div>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                 <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input name="title" defaultValue={currentEvent?.title} required placeholder="e.g. Summer Sale" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Start Date</Label><Input name="startDate" type="date" defaultValue={currentEvent?.start_date} required /></div>
                    <div className="grid gap-2"><Label>End Date</Label><Input name="endDate" type="date" defaultValue={currentEvent?.end_date} required /></div>
                 </div>

                 <div className="grid gap-2">
                    <Label>Description</Label>
                    <textarea 
                      name="description" 
                      defaultValue={currentEvent?.description} 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Describe your event..."
                    />
                 </div>

                 <div className="grid gap-2">
                    <Label>Status</Label>
                    <select name="status" defaultValue={currentEvent?.status || "Active"} className="w-full border rounded-md p-2 text-sm">
                      <option>Active</option>
                      <option>Ended</option>
                      <option>Upcoming</option>
                    </select>
                 </div>

                 <Button type="submit" disabled={isSaving} className="w-full bg-[#212529] text-white">{isSaving ? "Saving..." : "Save Event"}</Button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}