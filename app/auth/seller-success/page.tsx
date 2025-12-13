"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SellerSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-[#FFFCF2] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold font-bodoni text-[#212529] mb-4">
          Application Submitted!
        </h1>
        
        <p className="text-gray-500 mb-8 leading-relaxed">
          Thank you for applying to be a seller on Neighborhood. We have received your documents and business details.
          <br /><br />
          Our team will review your application within <strong>24-48 hours</strong>. You will receive an email once your shop is verified and ready to go!
        </p>

        <Button 
          onClick={() => router.push("/")}
          className="w-full h-12 rounded-full bg-[#212529] hover:bg-gray-800 text-white font-medium"
        >
          Back to Home <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

      </div>
    </div>
  );
}