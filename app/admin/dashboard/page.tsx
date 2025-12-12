"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import Image from "next/image";
import { createClient } from "@/lib/client";
import { 
  Search, Bell, CheckCircle2, XCircle, Eye, 
  Store, Clock, FileText, X, Filter, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"requests" | "registered">("requests");
  
  // Real Data State
  const [applications, setApplications] = useState<any[]>([]);
  const [registeredShops, setRegisteredShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  // --- 1. FETCH DATA & SETUP REALTIME ---
  useEffect(() => {
    fetchData();

    // Set up Realtime Subscription for new applications
    const channel = supabase
      .channel('seller_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT (new apps) and UPDATE (status changes)
          schema: 'public',
          table: 'seller_applications'
        },
        (payload) => {
          // When a change happens, refresh the data to stay in sync
          console.log("Realtime update received:", payload);
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    // Note: We don't set loading(true) here to avoid flashing spinners on realtime updates
    
    // A. Fetch Applications (Pending & Rejected history)
    const { data: appsData } = await supabase
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (appsData) setApplications(appsData);

    // B. Fetch Active Shops
    const { data: shopsData } = await supabase
      .from('shops')
      .select('*, profiles(email, full_name)') // Join with profile to get owner email
      .order('created_at', { ascending: false });

    if (shopsData) setRegisteredShops(shopsData);
    
    setLoading(false);
  };

  // Filter lists
  const pendingApps = applications.filter(app => app.status === 'pending');

  // --- 2. HANDLERS ---

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const handleApprove = async (app: any) => {
    if (!confirm(`Approve ${app.business_name}? This will create a new Shop.`)) return;

    try {
      // 1. Create the Shop row
      const { error: shopError } = await supabase.from('shops').insert({
        owner_id: app.user_id,
        name: app.business_name,
        address: app.address,
        category: app.category,
        rating: 0, // Start with 0 rating
        description: "Welcome to our new shop!",
        latitude: 10.745, // Default defaults (User updates later)
        longitude: 124.79
      });

      if (shopError) throw shopError;

      // 2. Update Application Status
      const { error: appError } = await supabase
        .from('seller_applications')
        .update({ status: 'approved' })
        .eq('id', app.id);

      if (appError) throw appError;

      // 3. Update User Role to 'seller'
      await supabase
        .from('profiles')
        .update({ role: 'seller' })
        .eq('id', app.user_id);

      alert("Shop Approved & Created Successfully!");
      setSelectedApp(null);
      fetchData(); // Refresh list immediately

    } catch (err: any) {
      alert("Error approving shop: " + err.message);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Reject this application?")) return;

    const { error } = await supabase
      .from('seller_applications')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      alert("Error rejecting");
    } else {
      fetchData();
      setSelectedApp(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      
      {/* --- ADMIN HEADER --- */}
      <header className="h-16 bg-[#FFFCF2] border-b border-gray-200 px-6 md:px-10 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-10 h-full">
           <div className="relative w-28 h-8 cursor-pointer">
             <Image src="/images/logo.png" alt="Logo" fill className="object-contain object-left" />
           </div>
           <div className="flex h-full">
             <button onClick={() => setActiveTab("registered")} className={cn("relative h-full flex items-center px-4 text-sm font-medium transition-all border-b-2", activeTab === "registered" ? "border-[#212529] text-[#212529]" : "border-transparent text-gray-500 hover:text-gray-800")}>
               Registered Business
             </button>
             <button onClick={() => setActiveTab("requests")} className={cn("relative h-full flex items-center px-4 text-sm font-medium transition-all border-b-2", activeTab === "requests" ? "border-[#212529] text-[#212529]" : "border-transparent text-gray-500 hover:text-gray-800")}>
               Requests
               {pendingApps.length > 0 && <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 animate-pulse">{pendingApps.length}</span>}
             </button>
           </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-[#212529] leading-none">Admin User</p>
               <p className="text-xs text-gray-400 mt-1">Super Admin</p>
             </div>
             <div className="w-9 h-9 bg-[#212529] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">A</div>
          </div>
          <button onClick={handleLogout} className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-bodoni text-[#212529]">
              {activeTab === "requests" ? "Pending Requests" : "Registered Businesses"}
            </h1>
            <p className="text-gray-500 mt-2">
              {activeTab === "requests" ? "Review and approve new seller applications." : "Manage all verified businesses on the platform."}
            </p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-500"><Clock className="h-5 w-5" /></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pending</p><p className="text-xl font-bold text-[#212529] leading-none">{pendingApps.length}</p></div>
             </div>
             <div className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-green-50 rounded-lg text-green-500"><Store className="h-5 w-5" /></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active</p><p className="text-xl font-bold text-[#212529] leading-none">{registeredShops.length}</p></div>
             </div>
          </div>
        </div>

        {/* --- TABLE SECTION --- */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
           {/* Header Row */}
           <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Business Details</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Date Applied/Created</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
           </div>

           <div className="divide-y divide-gray-50">
              {/* LOGIC: Show Pending Apps OR Registered Shops based on tab */}
              {(activeTab === "requests" ? pendingApps : registeredShops).length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300"><FileText className="h-8 w-8" /></div>
                   <p className="text-gray-900 font-medium">No records found</p>
                </div>
              ) : (
                (activeTab === "requests" ? pendingApps : registeredShops).map((item: any) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors group">
                     
                     {/* 1. Name & Owner */}
                     <div className="col-span-4">
                        <p className="font-bold text-[#212529] text-sm">{activeTab === "requests" ? item.business_name : item.name}</p>
                        {activeTab === "requests" ? (
                           <>
                             <p className="text-xs text-gray-500 mt-0.5">{item.owner_name}</p>
                             <p className="text-xs text-gray-400">{item.contact_number}</p>
                           </>
                        ) : (
                           // For registered shops, show owner email if available from join
                           <p className="text-xs text-gray-500 mt-0.5">{item.profiles?.full_name || "Owner ID: " + item.owner_id.slice(0,8)}...</p>
                        )}
                     </div>

                     {/* 2. Category */}
                     <div className="col-span-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0F4FF] text-[#88A2FF] border border-[#E0E7FF]">
                           {item.category || "General"}
                        </span>
                     </div>

                     {/* 3. Date */}
                     <div className="col-span-2 text-sm text-gray-600 font-medium">
                        {new Date(item.created_at).toLocaleDateString()}
                     </div>

                     {/* 4. Status */}
                     <div className="col-span-2">
                        {activeTab === "requests" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100">Pending</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-100">Active</span>
                        )}
                     </div>

                     {/* 5. Actions */}
                     <div className="col-span-2 flex justify-end gap-2">
                        {activeTab === "requests" ? (
                           <>
                             <Button onClick={() => handleApprove(item)} size="icon-sm" className="h-8 w-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 shadow-none"><CheckCircle2 className="h-4 w-4" /></Button>
                             <Button onClick={() => handleReject(item.id)} size="icon-sm" className="h-8 w-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-none"><XCircle className="h-4 w-4" /></Button>
                             <Button onClick={() => setSelectedApp(item)} size="icon-sm" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-[#88A2FF]"><Eye className="h-4 w-4" /></Button>
                           </>
                        ) : (
                           <Button size="sm" variant="outline" className="h-8 text-xs border-gray-200 text-gray-600">Manage</Button>
                        )}
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </main>

      {/* --- REVIEW MODAL (DETAILS) --- */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFCF2]">
                 <h3 className="font-bold text-lg text-[#212529]">{selectedApp.business_name}</h3>
                 <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Owner</label><p className="font-medium text-lg">{selectedApp.owner_name}</p></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Address</label><p className="text-sm">{selectedApp.address}</p></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Contact</label><p className="text-sm">{selectedApp.contact_number}</p></div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Proof Document</label>
                    <div className="w-full aspect-[4/3] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center relative group">
                       {selectedApp.proof_url ? (
                          // FIXED: Use the full URL directly
                          <a href={selectedApp.proof_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-zoom-in">
                             <img 
                               src={selectedApp.proof_url} 
                               alt="Proof" 
                               className="w-full h-full object-contain" 
                             />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">View Full Image</span>
                             </div>
                          </a>
                       ) : (
                          <p className="text-sm text-gray-400">No document uploaded</p>
                       )}
                    </div>
                 </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                 <Button variant="outline" onClick={() => handleReject(selectedApp.id)} className="text-red-600 border-red-200 hover:bg-red-50">Reject</Button>
                 <Button onClick={() => handleApprove(selectedApp)} className="bg-[#212529] text-white hover:bg-gray-800">Approve & Create Shop</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}