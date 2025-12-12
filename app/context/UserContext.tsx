"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/client"; // Import Supabase client

interface UserProfile {
  name: string;
  email: string;
  location: string;
  bio: string;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (newData: Partial<UserProfile>) => void;
  loading: boolean;
}

// Default empty state (instead of "John Doe")
const defaultUser = {
  name: "",
  email: "",
  location: "",
  bio: "",
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load Real User Data on Mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. Get the Auth User (Email/ID)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser && authUser.email) {
          // Default Name logic: "molarbea" from "molarbea123@gmail.com"
          const emailName = authUser.email.split('@')[0];

          // 2. Try to fetch extra details from 'profiles' table
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, location, bio')
            .eq('id', authUser.id)
            .single();

          // 3. Set the state
          setUser({
            // If they edited their profile, use that name. Otherwise, use email prefix.
            name: profile?.full_name || emailName, 
            email: authUser.email,
            location: profile?.location || "Leyte, Philippines",
            bio: profile?.bio || "No bio yet.",
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const updateUser = (newData: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...newData }));
  };

  return (
    <UserContext.Provider value={{ user, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}