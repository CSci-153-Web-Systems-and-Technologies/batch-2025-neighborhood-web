// types.ts

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  role: 'buyer' | 'seller' | 'admin'; 
  is_public: boolean;
  show_email: boolean;
  show_activity: boolean;
  created_at: string | null;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  contact_number: string | null;
  category: string | null;
  image_url: string | null;
  rating: number | null;
  created_at: string;
  latitude: number;
  longitude: number | null;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  image_url: string | null;
  created_at: string;
  stock: number | null;
}

export interface UserStats {
  reviewsCount: number;
  favoritesCount: number;
}

export interface ActivityItem {
    id: string;
    type: 'review' | 'favorite'; 
    content: string;
    date: string; 
    imageUrl?: string | null; 
    shopName?: string;
}

export interface FullProfileData {
    profile: Profile;
    stats: UserStats;
    recentActivities: ActivityItem[];
}

