"use client";

import { useState, useEffect, useRef } from "react"; 
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft, MapPin, Mail, Edit2, Star, Image as ImageIcon,
  Heart, Shield, LogOut, X, Loader2, Activity, Camera,
  Eye, Lock, Trash2, Download, Store, UploadCloud 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Profile } from "@/types";
import { getCurrentFullProfile } from "@/services/UserService";
import { uploadImage } from "@/utils/supabase/uploadImage";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("overview");
  const [activeTab, setActiveTab] = useState("Reviews");

  // --- REAL DATA STATES ---
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Privacy States
  const [privacySettings, setPrivacySettings] = useState({
    isProfilePublic: true,
    showEmail: false,
    showActivity: true
  });

  // Edit Modal States
  const [tempProfile, setTempProfile] = useState({
    full_name: "", bio: "", location: ""
  });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  // --- 1. FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fullData = await getCurrentFullProfile();

        if (!fullData) {
             console.log("User not logged in or profile missing.");
             setLoading(false);
             return;
        }

        setUserProfile(fullData.profile);

        setPrivacySettings({
            isProfilePublic: fullData.profile.is_public ?? true,
            showEmail: fullData.profile.show_email ?? false,
            showActivity: fullData.profile.show_activity ?? true
        });

        const userId = fullData.profile.id;

        // B. Fetch User's Full Reviews List (UPDATED: Fetch ALL shop details)
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, shops(*)') // Changed from shops(name) to shops(*) to get images/address
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (reviewsData) setReviews(reviewsData);

        // C. Fetch Full Favorites List
        const { data: favData } = await supabase
          .from('favorites')
          .select('*, shops(*)')
          .eq('user_id', userId);

        if (favData) setFavorites(favData);

      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);


  // --- 2. HANDLERS ---

  const handleLogout = async () => {
    // 1. Confirm before logging out
    if (confirm("Are you sure you want to log out?")) {
      await supabase.auth.signOut();
      router.push("/auth/login");
    }
  };

  const handleEditClick = () => {
    if (userProfile) {
        setTempProfile({
            full_name: userProfile.full_name || "",
            bio: userProfile.bio || "",
            location: userProfile.location || ""
        });
        setSelectedAvatarFile(null);
        setIsEditing(true);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPEG, PNG, etc.)');
            return;
        }
        setSelectedAvatarFile(file);
    }
  };

  const handleSave = async () => {
    if (!userProfile) return;
    setIsSaving(true);

    try {
      let finalAvatarUrl = userProfile.avatar_url;

      if (selectedAvatarFile) {
          const uploadedUrl = await uploadImage(selectedAvatarFile, 'neighborhood-images', 'avatars');
          if (!uploadedUrl) {
              setIsSaving(false);
              return;
          }
          finalAvatarUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: tempProfile.full_name,
          bio: tempProfile.bio,
          location: tempProfile.location,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, ...tempProfile, avatar_url: finalAvatarUrl });
      setIsEditing(false);
      setSelectedAvatarFile(null);

    } catch (err) {
      alert("Failed to save profile.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePrivacy = async (key: keyof typeof privacySettings) => {
    if (!userProfile) return;
    const newValue = !privacySettings[key];
    setPrivacySettings(prev => ({ ...prev, [key]: newValue }));

    const dbColumnMap: Record<string, string> = {
      isProfilePublic: 'is_public',
      showEmail: 'show_email',
      showActivity: 'show_activity'
    };

    try {
      await supabase
        .from('profiles')
        .update({ [dbColumnMap[key]]: newValue })
        .eq('id', userProfile.id);
    } catch (err) {
      console.error("Failed to update privacy setting", err);
      setPrivacySettings(prev => ({ ...prev, [key]: !newValue })); 
    }
  };

  // --- 3. HELPER: Calculate Visited Shops ---
  const getVisitedShops = () => {
    // 1. Get shops from Reviews
    const reviewedShops = reviews.map(r => r.shops).filter(Boolean);
    // 2. Get shops from Favorites
    const favoritedShops = favorites.map(f => f.shops).filter(Boolean);
    
    // 3. Combine and Deduplicate by Shop ID
    const allShops = [...reviewedShops, ...favoritedShops];
    const uniqueMap = new Map();
    
    allShops.forEach(shop => {
        if (!uniqueMap.has(shop.id)) {
            uniqueMap.set(shop.id, shop);
        }
    });
    
    return Array.from(uniqueMap.values());
  };

  const visitedShops = getVisitedShops();

  // --- NEW: Helper to get all uploaded images from reviews ---
  const uploadedImages = reviews
    .filter(review => review.image_url) // Only keep reviews with images
    .map(review => ({
      id: review.id,
      url: review.image_url,
      shopName: review.shops?.name || "Unknown Shop",
      date: new Date(review.created_at).toLocaleDateString()
    }));


  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-gray-300" /></div>;
  if (!userProfile) return <div className="h-screen flex items-center justify-center">Profile not found. Please log in.</div>;


  return (
    <div className="w-full space-y-6 relative pb-20">

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-[#212529] transition-colors w-fit"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">Back</span>
      </button>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* === LEFT COLUMN: Profile Card === */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <div className="bg-[#FFFCF2] border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center sticky top-24">

            <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-md mb-4 flex items-center justify-center text-3xl font-bold text-gray-400 overflow-hidden">
               {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt={userProfile.full_name || "User"} className="w-full h-full object-cover" />
               ) : (
                  (userProfile.full_name || "N").charAt(0).toUpperCase()
               )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[#212529]">{userProfile.full_name || "Neighbor"}</h2>
              <button
                onClick={handleEditClick}
                className="text-gray-400 hover:text-[#88A2FF] transition-colors p-1"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6 italic">{userProfile.bio || "No bio yet."}</p>

            <div className="w-full space-y-3 text-sm text-gray-600 mb-8">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <MapPin className="h-4 w-4 text-[#88A2FF]" />
                <span>{userProfile.location || "Location not set"}</span>
              </div>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <Mail className="h-4 w-4 text-[#88A2FF]" />
                <span className="truncate">{privacySettings.showEmail ? userProfile.email : "Email hidden"}</span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="w-full space-y-1">
              <button onClick={() => setCurrentView("overview")} className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all font-medium", currentView === "overview" ? "bg-white shadow-sm text-[#88A2FF]" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
                <Activity className="h-4 w-4" /> <span>Activity</span>
              </button>
              <button onClick={() => setCurrentView("images")} className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all font-medium", currentView === "images" ? "bg-white shadow-sm text-[#88A2FF]" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
                <ImageIcon className="h-4 w-4" /> <span>Image Uploaded</span>
              </button>
              <button onClick={() => setCurrentView("favorites")} className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all font-medium", currentView === "favorites" ? "bg-white shadow-sm text-[#88A2FF]" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
                <Heart className="h-4 w-4" /> <span>Favorites</span>
              </button>
              <button onClick={() => setCurrentView("privacy")} className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all font-medium", currentView === "privacy" ? "bg-white shadow-sm text-[#88A2FF]" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
                <Shield className="h-4 w-4" /> <span>Privacy Settings</span>
              </button>

              <div className="pt-2 mt-2 border-t border-gray-100 w-full">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-gray-600 font-medium group">
                  <LogOut className="h-4 w-4 group-hover:text-red-600 transition-colors" /> <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: Dynamic Content === */}
        <div className="md:col-span-8 lg:col-span-9">

          {/* VIEW: OVERVIEW (Reviews & Visits) */}
          {currentView === "overview" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center gap-8 border-b border-gray-200 mb-6">
                {["Reviews", "Visited Store"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn("pb-3 text-base font-bold transition-all border-b-2 px-2", activeTab === tab ? "border-[#212529] text-[#212529]" : "border-transparent text-gray-400 hover:text-gray-600")}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {activeTab === "Reviews" ? (
                  reviews.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <p>You haven't written any reviews yet.</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="bg-[#FFFCF2] border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-[#212529] text-lg">{review.shops?.name || "Unknown Shop"}</h3>
                          <span className="text-xs text-gray-400 font-medium">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("h-4 w-4 fill-current", i < review.rating ? "text-yellow-400" : "text-gray-200")} />
                          ))}
                        </div>
                        <p className="text-gray-600 text-sm">{review.comment}</p>
                        {review.image_url && (
                             <div className="mt-3">
                                <img src={review.image_url} alt="Review attachment" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                             </div>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  // --- VISITED STORES TAB ---
                  visitedShops.length === 0 ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <p>No visited stores history yet.</p>
                        <p className="text-xs mt-2">Write a review or favorite a shop to see it here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visitedShops.map((shop: any) => (
                            <div key={shop.id} onClick={() => router.push(`/protected/dashboard/Shop?id=${shop.id}`)} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-[#88A2FF] transition-colors">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {shop.image_url ? <img src={shop.image_url} className="w-full h-full object-cover" /> : <Store className="h-6 w-6 text-gray-400" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#212529]">{shop.name}</h4>
                                    <p className="text-sm text-gray-500 truncate">{shop.address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* VIEW: UPLOADED IMAGES (UPDATED WITH REAL DATA) */}
          {currentView === "images" && (
            <div className="animate-in fade-in duration-300">
               <h2 className="text-2xl font-bold text-[#212529] mb-6">Uploaded Images</h2>
               
               {uploadedImages.length === 0 ? (
                 <div className="w-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#FFFCF2]/50 gap-4">
                    <Camera className="h-8 w-8 text-gray-400" />
                    <p className="text-gray-500 font-medium">No uploads yet</p>
                    <p className="text-sm text-gray-400">Photos you upload with your reviews will appear here.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {uploadedImages.map((img) => (
                     <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 border border-gray-200 shadow-sm">
                       <img src={img.url} alt={`Uploaded for ${img.shopName}`} className="w-full h-full object-cover" />
                       {/* Hover Overlay with Info */}
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <p className="text-white font-bold text-sm truncate">{img.shopName}</p>
                         <p className="text-gray-300 text-xs">{img.date}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {/* VIEW: FAVORITES */}
          {currentView === "favorites" && (
             <div className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-[#212529] mb-6">My Favorites</h2>

                {favorites.length === 0 ? (
                  <div className="w-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#FFFCF2]/50 gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-200"><Heart className="h-8 w-8 fill-current" /></div>
                    <div className="text-center">
                      <p className="text-gray-500 font-medium">No favorites yet</p>
                      <p className="text-sm text-gray-400 mt-1">Start exploring and save your best-loved spots!</p>
                    </div>
                    <Button onClick={() => router.push('/protected/dashboard')} className="mt-2 rounded-full bg-[#212529] text-white hover:bg-gray-800">Explore Neighborhood</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.map((fav) => (
                      fav.shops && (
                      <div key={fav.id} onClick={() => router.push(`/protected/dashboard/Shop?id=${fav.shops.id}`)} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-[#88A2FF] transition-colors">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                             {fav.shops.image_url ? <img src={fav.shops.image_url} className="w-full h-full object-cover" /> : <Store className="h-6 w-6 text-gray-400" />}
                          </div>
                          <div>
                             <h4 className="font-bold text-[#212529]">{fav.shops.name}</h4>
                             <p className="text-sm text-gray-500 truncate">{fav.shops.address}</p>
                          </div>
                      </div>
                      )
                    ))}
                  </div>
                )}
             </div>
          )}

          {/* VIEW: PRIVACY */}
          {currentView === "privacy" && (
             <div className="animate-in fade-in duration-300 space-y-6">
               <h2 className="text-2xl font-bold text-[#212529]">Privacy Settings</h2>

               <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-[#212529] flex items-center gap-2"><Eye className="h-5 w-5 text-[#88A2FF]" /> Profile Visibility</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Public Profile</Label>
                      <p className="text-sm text-gray-500">Allow neighbors to find you in search results.</p>
                    </div>
                    <button onClick={() => togglePrivacy('isProfilePublic')} className={cn("w-12 h-6 rounded-full transition-colors relative", privacySettings.isProfilePublic ? "bg-[#212529]" : "bg-gray-200")}>
                      <div className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm", privacySettings.isProfilePublic ? "translate-x-6" : "translate-x-0")} />
                    </button>
                  </div>
                  <div className="h-px bg-gray-100 w-full" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Show Email Address</Label>
                      <p className="text-sm text-gray-500">Display your email on your public profile card.</p>
                    </div>
                    <button onClick={() => togglePrivacy('showEmail')} className={cn("w-12 h-6 rounded-full transition-colors relative", privacySettings.showEmail ? "bg-[#212529]" : "bg-gray-200")}>
                      <div className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm", privacySettings.showEmail ? "translate-x-6" : "translate-x-0")} />
                    </button>
                  </div>
                  <div className="h-px bg-gray-100 w-full" />

                   <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Share Activity Status</Label>
                      <p className="text-sm text-gray-500">Let others see your reviews history.</p>
                    </div>
                    <button onClick={() => togglePrivacy('showActivity')} className={cn("w-12 h-6 rounded-full transition-colors relative", privacySettings.showActivity ? "bg-[#212529]" : "bg-gray-200")}>
                      <div className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm", privacySettings.showActivity ? "translate-x-6" : "translate-x-0")} />
                    </button>
                  </div>
               </div>

               <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Lock className="h-5 w-5" /> Data & Account</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label className="text-base">Download My Data</Label><p className="text-sm text-gray-500">Get a copy of your reviews and profile information.</p></div>
                    <Button variant="outline" className="rounded-full border-gray-200"><Download className="h-4 w-4 mr-2" /> Download</Button>
                  </div>
                   <div className="h-px bg-red-50 w-full" />
                   <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label className="text-base text-red-600">Delete Account</Label><p className="text-sm text-gray-500">Permanently remove your account and all data.</p></div>
                    <Button variant="destructive" className="rounded-full bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none"><Trash2 className="h-4 w-4 mr-2" /> Delete Account</Button>
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditing && userProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFCF2]">
              <h3 className="font-bold text-lg text-[#212529]">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-6">
               <div className="flex flex-col items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-gray-400 overflow-hidden">
                      {selectedAvatarFile ? (
                         <img src={URL.createObjectURL(selectedAvatarFile)} alt="New avatar preview" className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity" />
                      ) : userProfile.avatar_url ? (
                          <img src={userProfile.avatar_url} alt={userProfile.full_name || "User"} className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity" />
                       ) : (
                          <span className="group-hover:opacity-50 transition-opacity">{(userProfile.full_name || "N").charAt(0).toUpperCase()}</span>
                       )}
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium bg-black/30 rounded-full"
                    >
                      <UploadCloud className="w-6 h-6" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Click image to change avatar</p>
               </div>


              <div className="grid gap-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={tempProfile.full_name} onChange={(e) => setTempProfile({...tempProfile, full_name: e.target.value})} className="bg-white border-gray-200"/></div>
              <div className="grid gap-2"><Label htmlFor="bio">Bio</Label><Input id="bio" value={tempProfile.bio} onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})} className="bg-white border-gray-200"/></div>
              <div className="grid gap-2"><Label htmlFor="location">Location</Label><Input id="location" value={tempProfile.location} onChange={(e) => setTempProfile({...tempProfile, location: e.target.value})} className="bg-white border-gray-200"/></div>
               <div className="grid gap-2"><Label htmlFor="email">Email (Read only)</Label><Input id="email" value={userProfile.email || ""} disabled className="bg-gray-50 text-gray-400 border-gray-200"/></div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-full border-gray-300">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-full bg-[#212529] hover:bg-gray-800 text-white min-w-[100px]">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}