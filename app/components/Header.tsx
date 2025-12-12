"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Shield } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // 1. DEFINE PATHS TO HIDE HEADER
  const isUserDashboard = pathname.startsWith("/protected");
  const isAdminPortal = pathname.startsWith("/admin");
  const isSellerPortal = pathname.startsWith("/seller"); // <--- This hides it for Seller Dashboard
  const isSellerLogin = pathname === "/auth/seller-login"; 

  // 2. If we are in ANY of these special areas, return null (hide header)
  if (isUserDashboard || isAdminPortal || isSellerPortal || isSellerLogin) {
    return null;
  }

  // Logic for hiding buttons on specific auth pages
  const hideButtonOnPaths = ["/auth/login", "/auth/sign-up", "/auth/seller-signup"];
  const shouldHideButton = hideButtonOnPaths.includes(pathname);

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 shadow-sm bg-[#FFFCF2]">
      <div 
        className="relative h-12 w-32 cursor-pointer" 
        onClick={() => router.push("/")}
      >
        <Image 
          src="/images/logo.png" 
          alt="Neighborhood Logo"
          fill
          className="object-contain object-left"
        />
      </div>

      {!shouldHideButton && (
        <div className="flex items-center gap-4">
          
          <button
            onClick={() => router.push("/admin/login")}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#212529] transition-colors uppercase tracking-widest mr-2"
          >
            <Shield className="h-3 w-3" />
            Admin
          </button>

          <button
            onClick={() => router.push("/auth/login")}
            className="px-6 py-2 text-[#212529] text-base font-medium rounded-full border border-[#212529]/20 hover:bg-[#212529] hover:text-white transition-all duration-300"
          >
            Log in
          </button>
        </div>
      )}
    </header>
  );
}