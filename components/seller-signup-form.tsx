"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, UploadCloud, FileText, Store } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/client";

// List of Towns in Leyte
const leyteTowns = [
  "Tacloban City", "Ormoc City", "Baybay City", "Abuyog", "Alangalang", "Albuera",
  "Babatngon", "Barugo", "Bato", "Burauen", "Calubian", "Capoocan", "Carigara",
  "Dagami", "Dulag", "Hilongos", "Hindang", "Inopacan", "Isabel", "Jaro",
  "Javier", "Julita", "Kananga", "La Paz", "Leyte", "MacArthur", "Mahaplag",
  "Matag-ob", "Matalom", "Mayorga", "Merida", "Palo", "Palompon", "Pastrana",
  "San Isidro", "San Miguel", "Santa Fe", "Tabango", "Tabontabon", "Tanauan",
  "Tolosa", "Tunga", "Villaba"
];

export function SellerSignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Form States
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    businessName: "",
    ownerName: "",
    contactNumber: "",
    address: "", // This will now store the selected town
    category: "",
    proofFile: null as File | null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, proofFile: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { 
            role: 'seller',
            full_name: formData.ownerName, 
          }
        }
      });

      if (authError) throw authError;

      const userId = authData.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Unable to resolve user id after signup.");

      // 2. Upload proof file to 'seller-proofs' bucket
      let proofUrl: string | null = null;
      if (formData.proofFile) {
        const fileExt = formData.proofFile.name.split('.').pop() || 'dat';
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('seller-proofs') 
          .upload(filePath, formData.proofFile, {
            cacheControl: '3600',
            upsert: true,
          });
          
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('seller-proofs')
          .getPublicUrl(filePath);
          
        proofUrl = publicUrlData.publicUrl;
      }

      // 3. Save Application Data
      const { error: dbError } = await supabase
        .from('seller_applications')
        .insert({
          user_id: userId,
          business_name: formData.businessName,
          owner_name: formData.ownerName,
          contact_number: formData.contactNumber,
          category: formData.category,
          address: formData.address,
          proof_url: proofUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      router.push("/auth/seller-success");

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex w-full min-h-screen bg-[#FFFCF2]", className)} {...props}>
      <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-12 lg:p-16 relative overflow-y-auto max-h-screen">
        <button onClick={() => router.push("/")} className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-[#212529] transition-colors font-medium text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        <div className="mx-auto w-full max-w-[480px] flex flex-col gap-8 mt-12">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold font-bodoni text-[#212529] mb-3">Partner with Neighborhood</h1>
            <p className="text-gray-500">Grow your local business. Submit your details for verification.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#88A2FF] uppercase tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#88A2FF]/20 flex items-center justify-center text-[#88A2FF]">1</div>Account Login</h3>
              <div className="grid gap-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" placeholder="you@business.com" required onChange={handleInputChange} className="h-11 bg-white" /></div>
              <div className="grid gap-2"><Label htmlFor="password">Create Password</Label><Input id="password" type="password" placeholder="••••••••" required onChange={handleInputChange} className="h-11 bg-white" /></div>
            </div>
            <div className="h-px w-full bg-gray-200 my-2" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#88A2FF] uppercase tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#88A2FF]/20 flex items-center justify-center text-[#88A2FF]">2</div>Business Information</h3>
              <div className="grid gap-2"><Label htmlFor="businessName">Business Name</Label><Input id="businessName" placeholder="e.g. Cafe Cafe" required onChange={handleInputChange} className="h-11 bg-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="ownerName">Owner Name</Label><Input id="ownerName" placeholder="Full Name" required onChange={handleInputChange} className="h-11 bg-white" /></div>
                <div className="grid gap-2"><Label htmlFor="contactNumber">Contact No.</Label><Input id="contactNumber" placeholder="0912 345 6789" required onChange={handleInputChange} className="h-11 bg-white" /></div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Business Category</Label>
                <div className="relative">
                  <select id="category" className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-[#88A2FF]" onChange={handleInputChange} value={formData.category} required>
                    <option value="" disabled>Select a category...</option>
                    <option value="Food">Food</option>
                    <option value="Clothes">Clothes</option>
                    <option value="Services">Services</option>
                    <option value="Tourism">Tourism</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Stalls">Stalls</option>
                    <option value="Shopping & Malls">Shopping & Malls</option>
                  </select>
                </div>
              </div>

              {/* MODIFIED: Address Field is now a Dropdown */}
              <div className="grid gap-2">
                 <Label htmlFor="address">Business Address (Town/City)</Label>
                 <div className="relative">
                  <select 
                    id="address" 
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-[#88A2FF]" 
                    onChange={handleInputChange} 
                    value={formData.address} 
                    required
                  >
                    <option value="" disabled>Select a town...</option>
                    {leyteTowns.map((town) => (
                      <option key={town} value={town}>{town}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gray-200 my-2" />
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#88A2FF] uppercase tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#88A2FF]/20 flex items-center justify-center text-[#88A2FF]">3</div>Proof of Business</h3>
              <div className="grid gap-2">
                <Label>Upload Business Permit / DTI (PDF or Image)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center relative">
                  <input type="file" id="proofFile" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,.pdf" required />
                  <div className="flex flex-col items-center gap-2">
                    {formData.proofFile ? (
                      <><FileText className="h-8 w-8 text-[#88A2FF]" /><span className="text-sm font-medium text-[#212529]">{formData.proofFile.name}</span><span className="text-xs text-green-500 font-medium">Ready to upload</span></>
                    ) : (
                      <><UploadCloud className="h-8 w-8 text-gray-400" /><span className="text-sm text-gray-500">Click to upload or drag and drop</span><span className="text-xs text-gray-400">Max size 5MB</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="h-12 w-full bg-[#212529] hover:bg-gray-800 text-white text-base font-medium rounded-full mt-4 shadow-lg transition-all">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </form>
          <div className="text-center text-sm text-gray-500 pb-8">Already a partner? <Link href="/auth/seller-login" className="font-semibold text-[#88A2FF] hover:underline">Log in to Seller Dashboard</Link></div>
        </div>
      </div>
      <div className="hidden lg:flex w-1/2 bg-[#FFEFD5]/30 relative items-center justify-center p-12 overflow-hidden border-l border-[#FFEFD5]">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FFEFD5] rounded-full blur-3xl opacity-60 pointer-events-none" />
         <div className="relative z-10 w-full max-w-[600px] text-center">
             <Store className="w-48 h-48 mx-auto text-[#212529]/10 mb-6" /> 
             <h2 className="text-3xl font-bold font-bodoni text-[#212529] mb-4">Grow your Reach</h2>
             <p className="text-gray-600 max-w-md mx-auto text-lg">Join hundreds of local businesses in Leyte connecting with their neighbors every day.</p>
         </div>
      </div>
    </div>
  );
}