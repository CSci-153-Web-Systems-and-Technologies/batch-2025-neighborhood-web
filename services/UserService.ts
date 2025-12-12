// services/UserService.ts
// FIX: Corrected typo 'supabse' -> 'supabase'
import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
// Import types from the central types file
import { Profile, UserStats, ActivityItem, FullProfileData } from "@/types";


// --- Helper Function to generate Activity feed ---
async function fetchRecentActivities(userId: string, supabaseClient: any): Promise<ActivityItem[]> {
    const limitPerType = 10; // Fetch a decent amount to sort later

    // Run queries in parallel
    const [reviewsReq, favoritesReq] = await Promise.all([
        // 1. Get recent reviews (NOW INCLUDING image_url)
        supabaseClient
            .from('reviews')
            .select('id, created_at, comment, image_url, rating, shops(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limitPerType),
        // 2. Get recent favorites
        // NOTE: Ensure your favorites table has a 'created_at' column for correct sorting.
        supabaseClient
            .from('favorites')
            .select('id, created_at, shops(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limitPerType),
    ]);

    let activities: ActivityItem[] = [];

    // Normalize Reviews
    if (reviewsReq.data) {
        activities.push(...reviewsReq.data.map((r: any) => {
            const shopName = r.shops?.name || 'Unknown shop';
            // Tailor content based on if an image was uploaded
            let contentStr = `Rated ${shopName} ${r.rating} stars`;
            if (r.image_url) {
                 contentStr += ` and uploaded an image`;
            }
            if (r.comment) {
                contentStr += `: "${r.comment.substring(0, 50)}${r.comment.length > 50 ? '...' : ''}"`;
            }

            return {
                id: r.id,
                type: 'review' as const,
                content: contentStr,
                date: r.created_at,
                imageUrl: r.image_url, // Pass the image URL along
                shopName: shopName
            };
        }));
    }

    // Normalize Favorites
    if (favoritesReq.data) {
        activities.push(...favoritesReq.data.map((f: any) => {
             const shopName = f.shops?.name || 'Unknown shop';
             return {
                id: f.id,
                type: 'favorite' as const,
                content: `Favorited the shop: ${shopName}`,
                date: f.created_at,
                shopName: shopName
            };
        }));
    }

    // Combine, sort by date descending, and take the top 15 overall
    return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);
}


// --- Main Function ---
export const getCurrentFullProfile = async (): Promise<FullProfileData | null> => {
  const supabase = createClient();

  // 1. Get current auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn("UserService: No logged-in user found.");
    return null;
  }

  // 2. Start fetching everything in parallel
  const [profileResult, reviewsCountResult, favoritesCountResult, activitiesResult] = await Promise.all([
      // a. Profile Row
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      // b. Reviews Count
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      // c. Favorites Count
      supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      // d. Recent Activities Feed
      fetchRecentActivities(user.id, supabase)
  ]);


  if (profileResult.error) {
    // Cast to PostgrestError to access 'code'
    const pgError = profileResult.error as PostgrestError;
    console.error('Error fetching profile row:', pgError.message);
    return null;
  }

  // 4. Combine and return
  return {
    profile: profileResult.data as Profile,
    stats: {
        reviewsCount: reviewsCountResult.count || 0,
        favoritesCount: favoritesCountResult.count || 0,
    },
    recentActivities: activitiesResult
  };
};