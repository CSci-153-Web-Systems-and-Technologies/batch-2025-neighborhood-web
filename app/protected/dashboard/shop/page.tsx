"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/client";
import { 
  ArrowLeft, MapPin, Mail, Star, Calendar, ShoppingBag, 
  Heart, X, Loader2, Camera, Send 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/utils/supabase/uploadImage"; 

export default function ShopProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const shopId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState("Products");
  const [loading, setLoading] = useState(true);
  
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [newReview, setNewReview] = useState({ rating: 0, comment: "" });
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shopId) return;

    const fetchShopData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        // 1. Fetch Shop
        const { data: shopData } = await supabase.from('shops').select('*').eq('id', shopId).single();
        if (shopData) setShop(shopData);

        // 2. Fetch Products
        const { data: prodData } = await supabase.from('products').select('*').eq('shop_id', shopId);
        if (prodData) setProducts(prodData);

        // 3. Fetch Events
        const { data: eventData } = await supabase.from('events').select('*').eq('shop_id', shopId);
        if (eventData) setEvents(eventData);

        // 4. Fetch Reviews (Join with profiles to get name/avatar)
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*, profiles(full_name, avatar_url)')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false });
          
        if (reviewData) setReviews(reviewData);

        // 5. Check Favorite
        if (user) {
          const { data: favData } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('shop_id', shopId)
            .single();
          if (favData) setIsFavorite(true);
        }

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [shopId]);

  const handleToggleFavorite = async () => {
    if (!currentUserId || !shopId) return alert("Please log in.");
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', currentUserId).eq('shop_id', shopId);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ user_id: currentUserId, shop_id: shopId });
      setIsFavorite(true);
    }
  };

  const handlePostReview = async () => {
    if (!currentUserId || !shopId) return alert("Please log in to review.");
    if (newReview.rating === 0) return alert("Please select a star rating.");
    if (!newReview.comment.trim()) return alert("Please write a comment.");

    setIsSubmittingReview(true);

    try {
      let imageUrl = null;

      // 1. Upload Image (if selected)
      if (reviewImage) {
        imageUrl = await uploadImage(reviewImage, 'neighborhood-images', 'reviews');
        if (!imageUrl) throw new Error("Image upload failed");
      }

      // 2. Insert Review to Database
      const { data: insertedReview, error } = await supabase
        .from('reviews')
        .insert({
          shop_id: shopId,
          user_id: currentUserId,
          rating: newReview.rating,
          comment: newReview.comment,
          image_url: imageUrl
        })
        .select('*, profiles(full_name, avatar_url)') 
        .single();

      if (error) throw error;

      // --- REMOVED: The manual calculation logic. The Database Trigger handles it now! ---

      // 3. Update UI (Add new review to top of list)
      setReviews([insertedReview, ...reviews]);
      
      // 4. Optimistically update the star display for the user immediately
      // (Optional: You can calculate it locally just for display, or assume the fetch on refresh will get it)
      setShop((prev: any) => ({ 
         ...prev, 
         // Simple recalculation for immediate feedback without refreshing
         rating: ((prev.rating * reviews.length) + newReview.rating) / (reviews.length + 1)
      }));

      // 5. Reset Form
      setNewReview({ rating: 0, comment: "" });
      setReviewImage(null);
      alert("Review posted successfully!");

    } catch (error: any) {
      alert("Error posting review: " + error.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-[#88A2FF]" /></div>;
  if (!shop) return <div className="p-8 text-center">Shop not found.</div>;

  return (
    <div className="w-full space-y-6 pb-20">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 font-medium">
        <ArrowLeft className="h-5 w-5" /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column (Shop Info) */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <div className="bg-[#FFFCF2] border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center sticky top-24">
            <div className="w-full h-32 bg-gray-200 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
               {shop.image_url ? <img src={shop.image_url} className="w-full h-full object-cover"/> : <ShoppingBag className="h-8 w-8 text-gray-400 opacity-50"/>}
            </div>
            <h2 className="text-xl font-bold font-bodoni text-[#212529] mb-1">{shop.name}</h2>
            
            {/* ADDED: Display Numeric Rating */}
            <div className="flex items-center gap-1 mb-2 bg-yellow-50 px-3 py-1 rounded-full">
                <span className="text-lg font-bold text-[#212529]">{shop.rating ? shop.rating.toFixed(1) : "0.0"}</span>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>

            <p className="text-sm text-gray-500 italic mb-6">{shop.description || "No description"}</p>
            <div className="w-full space-y-3 text-sm text-gray-600 mb-8 text-left">
              <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-[#88A2FF]" /><span>{shop.address}</span></div>
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#88A2FF]" /><span>Contact owner</span></div>
            </div>
            <Button onClick={handleToggleFavorite} variant="outline" className={cn("w-full rounded-full border-gray-300", isFavorite && "bg-red-50 text-red-600 border-red-200")}>
              <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-current")} /> {isFavorite ? "Favorited" : "Add to Favorites"}
            </Button>
          </div>
        </div>

        {/* Right Column (Tabs) */}
        <div className="md:col-span-8 lg:col-span-9">
          <div className="flex items-center gap-8 border-b border-gray-200 mb-6 overflow-x-auto">
            {["Products", "Reviews", "Events"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn("pb-3 text-base font-bold border-b-2 px-2", activeTab === tab ? "border-[#212529] text-[#212529]" : "border-transparent text-gray-400")}>{tab}</button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === "Products" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.length === 0 ? <p className="text-gray-400 col-span-full text-center">No products found.</p> : products.map((item) => (
                  <div key={item.id} className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                       {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover"/> : <ShoppingBag className="text-gray-300"/>}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                    <p className="text-[#88A2FF] font-bold text-sm">₱{item.price}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Events" && (
              <div className="space-y-4">
                {events.length === 0 ? <p className="text-gray-400 text-center">No events.</p> : events.map((ev) => (
                  <div key={ev.id} className="flex gap-4 bg-white border rounded-xl p-4 shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0"><Calendar className="h-6 w-6"/></div>
                    <div><h3 className="font-bold text-lg">{ev.title}</h3><p className="text-sm text-gray-500 font-medium">{ev.description}</p></div>
                  </div>
                ))}
              </div>
            )}

            {/* --- REVIEWS TAB --- */}
            {activeTab === "Reviews" && (
              <div className="space-y-8">
                 
                 {/* 1. WRITE REVIEW FORM */}
                 <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Write a Review</h3>
                    <div className="space-y-4">
                       
                       {/* Star Rating Selector */}
                       <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                              key={star} 
                              type="button"
                              onClick={() => setNewReview({ ...newReview, rating: star })}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star className={cn("h-6 w-6", star <= newReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
                            </button>
                          ))}
                       </div>

                       {/* Comment Box */}
                       <textarea 
                          placeholder="Share your experience..." 
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#88A2FF]/20 min-h-[100px] text-sm resize-none bg-gray-50/50"
                          value={newReview.comment}
                          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                       />

                       {/* Upload & Submit Buttons */}
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <input 
                               type="file" 
                               ref={fileInputRef} 
                               className="hidden" 
                               accept="image/*"
                               onChange={(e) => setReviewImage(e.target.files ? e.target.files[0] : null)}
                             />
                             <Button 
                               type="button" 
                               variant="outline" 
                               size="sm" 
                               className="text-gray-500 border-gray-200 rounded-full"
                               onClick={() => fileInputRef.current?.click()}
                             >
                               <Camera className="h-4 w-4 mr-2"/> {reviewImage ? "Image Selected" : "Add Photo"}
                             </Button>
                             
                             {reviewImage && (
                               <span className="text-xs text-[#88A2FF] flex items-center bg-blue-50 px-2 py-1 rounded-md">
                                 {reviewImage.name.substring(0, 10)}... 
                                 <X className="h-3 w-3 ml-2 cursor-pointer hover:text-red-500" onClick={() => setReviewImage(null)} />
                               </span>
                             )}
                          </div>

                          <Button 
                            onClick={handlePostReview} 
                            disabled={isSubmittingReview}
                            className="bg-[#212529] hover:bg-gray-800 text-white rounded-full px-6"
                          >
                            {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Send className="h-3 w-3 mr-2"/> Post Review</>}
                          </Button>
                       </div>
                    </div>
                 </div>

                 {/* 2. REVIEWS LIST */}
                 <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <div className="text-center py-10">
                           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300"><Star className="h-8 w-8"/></div>
                           <p className="text-gray-400">No reviews yet. Be the first!</p>
                        </div>
                    ) : (
                        reviews.map((r) => (
                          <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                              <div className="flex items-start gap-4">
                                 {/* Avatar */}
                                 <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                    {r.profiles?.avatar_url ? (
                                      <img src={r.profiles.avatar_url} className="w-full h-full object-cover"/>
                                    ) : (
                                      <span className="text-gray-500 font-bold text-xs">{(r.profiles?.full_name?.[0] || "U").toUpperCase()}</span>
                                    )}
                                 </div>
                                 
                                 {/* Content */}
                                 <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                       <h4 className="font-bold text-sm text-[#212529]">{r.profiles?.full_name || "Anonymous"}</h4>
                                       <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1 my-1">
                                       {[...Array(5)].map((_, i) => (
                                          <Star key={i} className={cn("h-3 w-3", i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200")}/>
                                       ))}
                                    </div>
                                    <p className="text-gray-600 text-sm mt-2">{r.comment}</p>
                                    
                                    {r.image_url && (
                                       <div className="mt-3">
                                          <img src={r.image_url} alt="Review attachment" className="h-32 w-auto object-cover rounded-lg border border-gray-200" />
                                       </div>
                                    )}
                                 </div>
                              </div>
                          </div>
                        ))
                    )}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}