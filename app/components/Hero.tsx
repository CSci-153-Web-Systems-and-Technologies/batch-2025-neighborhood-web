"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col md:flex-row items-center justify-between px-6 md:px-16 bg-[#FFFCF2] overflow-hidden">
      
      {/* Text Content */}
      <div className="w-full md:w-1/2 z-10 flex flex-col gap-6 mt-10 md:mt-0">
        <h1 className="text-5xl md:text-7xl leading-[1.1] text-[#212529]">
          <span className="font-boldonse font-bold">
            Explore, find, and connect
          </span>
          <br />
          <span className="font-sans text-4xl md:text-5xl font-medium text-gray-600 block mt-2">
             with your local market.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-lg">
          Neighborhood is your go-to platform for discovering local businesses, services, and events in your community. Find a cozy café, a reliable plumber, or the latest happenings around town.
        </p>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
          <Button 
            onClick={() => router.push("/auth/sign-up")}
            size="lg"
            className="text-lg px-8 h-12 bg-[#212529] hover:bg-gray-800 text-white rounded-full transition-all shadow-lg hover:shadow-xl"
          >
            Get Started
          </Button>
          
          <div className="flex items-center gap-2 text-gray-600">
            <span>Own a business?</span>
            <button 
              onClick={() => router.push("/auth/seller-signup")}
              className="font-semibold text-[#88A2FF] hover:text-[#6b89ff] hover:underline"
            >
              Sign Up As Seller
            </button>
          </div>
        </div>
      </div>

      {/* Hero Image Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center relative mt-12 md:mt-0">
        {/* Decorative background blob */}
        <div className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#C0E0FF]/30 rounded-full blur-3xl -z-0"></div>
        
        <div className="relative w-full h-[400px] md:h-[600px] z-10">
          <Image
            src="/images/illustration.png"
            alt="Local Markets Guide Illustration"
            fill
            className="object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500 ease-in-out"
            priority
          />
        </div>
      </div>

    </section>
  );
}