import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Grid,
  Bookmark,
  Download,
  Loader2,
  User,
  PlaySquare,
  Images,
  AlertCircle,
  PlayCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Columns,
  RectangleVertical,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// Helper to fallback to direct RapidAPI fetch if backend is missing (e.g., Netlify static deployment)
const rapidApiKey = "f2a97f0d4fmsh3f12358e8168654p190e98jsn798748b183c4";
const rapidApiHost = "instagram120.p.rapidapi.com";

export const fetchWithFallback = async (endpoint: string, bodyParams: any, localUrl: string) => {
  try {
    const res = await fetch(localUrl);
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      return res;
    }
  } catch (err) {}
  
  return fetch(`https://${rapidApiHost}/api/instagram/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": rapidApiHost,
      "x-rapidapi-key": rapidApiKey,
    },
    body: JSON.stringify(bodyParams)
  });
};

export const proxify = (url: string, dl = false) => {
  if (!url) return url;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Use fallback proxies on any deployment outside of localhost or AI Studio (run.app)
    // This ensures it works seamlessly on Netlify, Vercel, GitHub Pages even with custom domains
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.includes('run.app')) {
      // wsrv.nl is great for images, use it unless it's a video (mp4) or download
      if (!dl && !url.includes('.mp4')) {
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
      }
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
  }
  return `/api/proxy?url=${encodeURIComponent(url)}${dl ? "&dl=1" : ""}`;
};

function useResponsiveColumns() {
  const [cols, setCols] = useState(2);
  
  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth >= 768) setCols(4);
      else if (window.innerWidth >= 640) setCols(3);
      else setCols(2);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);
  
  return cols;
}

const VideoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M2 7a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7Zm7.5 2.5v5l5-2.5-5-2.5Z" />
  </svg>
);

const CarouselIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 9v10a2 2 0 0 1-2 2H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="3" y="3" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
);

// High-performance image component with smooth fade-in and self-healing fallback
function FadeInImage({ src, alt, className, onError, fastLoad = true, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fastLoad?: boolean }) {
  const [isLoaded, setIsLoaded] = useState(fastLoad);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [attemptedFallback, setAttemptedFallback] = useState(false);
  
  // Extract raw URL if it's currently proxied
  const getRawUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith("/api/proxy?url=")) {
      try {
        return decodeURIComponent(url.split("/api/proxy?url=")[1].split("&")[0]);
      } catch (e) {
        return null;
      }
    }
    if (url.startsWith("https://wsrv.nl/?url=")) {
      try { return decodeURIComponent(url.split("https://wsrv.nl/?url=")[1]); } catch (e) { return null; }
    }
    if (url.startsWith("https://api.allorigins.win/raw?url=")) {
      try { return decodeURIComponent(url.split("https://api.allorigins.win/raw?url=")[1]); } catch (e) { return null; }
    }
    return null;
  };

  useEffect(() => {
    if (!src) {
      setCurrentSrc(null);
      return;
    }
    
    setCurrentSrc(src);
    
    if (!fastLoad) setIsLoaded(false);
    setHasError(false);
    setAttemptedFallback(false);
  }, [src, fastLoad]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!src) return;
    if (!attemptedFallback) {
      setAttemptedFallback(true);
      const raw = getRawUrl(src);
      setCurrentSrc(raw || src); // fallback to raw or something else if needed
    } else {
      setHasError(true);
      if (onError) onError(e);
    }
  };

  const isAvatar = className?.includes("rounded-full");

  return (
    <div className={`relative overflow-hidden bg-[#121212] ${className || ""}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 bg-[#161616] flex flex-col items-center justify-center text-neutral-500">
          {isAvatar ? (
            <svg className="w-1/2 h-1/2 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 p-2">
              <svg className="w-8 h-8 opacity-40 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-[10px] tracking-wider text-neutral-500 font-medium">Failed to load</span>
            </div>
          )}
        </div>
      ) : (
        <img
          src={currentSrc || undefined}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
          {...props}
        />
      )}
    </div>
  );
}

// Interfaces
interface MediaCandidate {
  url: string;
  width: number;
  height: number;
}
interface VideoVersion {
  url: string;
  type: number;
}
interface PostNode {
  id: string;
  caption?: { text: string };
  image_versions2?: { candidates: MediaCandidate[] };
  video_versions?: VideoVersion[];
  carousel_media?: {
    image_versions2?: { candidates: MediaCandidate[] };
    video_versions?: VideoVersion[];
  }[];
  play_count?: number;
  like_count?: number;
  comment_count?: number;
  display_url?: string;
  media_type?: number;
  user?: any;
  owner?: any;
}
interface ProfileData {
  username: string;
  full_name: string;
  biography: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  profile_pic_url_hd: string;
  is_private: boolean;
  is_verified?: boolean;
}

interface CacheEntry {
  profileData: ProfileData | null;
  posts: PostNode[];
  stories: any[];
  highlights: any[];
  nextPageCursor: string | null;
  timestamp: number;
}

const localCache: Record<string, CacheEntry> = {};

export default function App() {
  const bentoCols = useResponsiveColumns();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isStoriesLoading, setIsStoriesLoading] = useState(false);
  const [isHighlightsLoading, setIsHighlightsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostNode[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "posts" | "reels" | "stories" | "highlights"
  >("posts");
  const [selectedPost, setSelectedPost] = useState<PostNode | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [selectedHighlightIndex, setSelectedHighlightIndex] = useState<number | null>(null);
  const [activeHighlightStories, setActiveHighlightStories] = useState<any[]>([]);
  const [isHighlightStoriesLoading, setIsHighlightStoriesLoading] = useState(false);
  const [activeHighlightStoryIndex, setActiveHighlightStoryIndex] = useState(0);

  const [isBentoGrid, setIsBentoGrid] = useState(false);
  const [reelsViewMode, setReelsViewMode] = useState<"grid" | "immersive">("grid");

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageCursor, setNextPageCursor] = useState<string | null>(null);

  const [homepageTab, setHomepageTab] = useState<"welcome" | "saved" | "history">("welcome");

  const [historyList, setHistoryList] = useState<any[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("anolmy_history_profiles") ||
        localStorage.getItem("anonyview_history_profiles") ||
        "[]"
      );
    } catch {
      return [];
    }
  });

  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("anolmy_saved_profiles") ||
        localStorage.getItem("anonyview_saved_profiles") ||
        "[]"
      );
    } catch {
      return [];
    }
  });

  const [savedPosts, setSavedPosts] = useState<any[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("anolmy_saved_posts") ||
        localStorage.getItem("anonyview_saved_posts") ||
        "[]"
      );
    } catch {
      return [];
    }
  });

  const isProfileSaved = (username: string) => {
    return savedProfiles.some((p: any) => p.username.toLowerCase() === username.toLowerCase());
  };

  const toggleSaveProfile = (profile: ProfileData) => {
    try {
      let updated;
      if (isProfileSaved(profile.username)) {
        updated = savedProfiles.filter((p: any) => p.username.toLowerCase() !== profile.username.toLowerCase());
      } else {
        updated = [
          {
            username: profile.username,
            full_name: profile.full_name,
            profile_pic_url_hd: profile.profile_pic_url_hd,
            media_count: profile.media_count,
            follower_count: profile.follower_count,
            timestamp: Date.now()
          },
          ...savedProfiles
        ];
      }
      setSavedProfiles(updated);
      localStorage.setItem("anolmy_saved_profiles", JSON.stringify(updated));
      localStorage.setItem("anonyview_saved_profiles", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const isPostSaved = (postId: string) => {
    return savedPosts.some((p: any) => p.id === postId);
  };

  const toggleSavePost = (post: PostNode) => {
    try {
      let updated;
      if (isPostSaved(post.id)) {
        updated = savedPosts.filter((p: any) => p.id !== post.id);
      } else {
        updated = [
          {
            ...post,
            savedAt: Date.now()
          },
          ...savedPosts
        ];
      }
      setSavedPosts(updated);
      localStorage.setItem("anolmy_saved_posts", JSON.stringify(updated));
      localStorage.setItem("anonyview_saved_posts", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectProfile = (username: string) => {
    setSearchQuery(username);
    fetchProfile(undefined, username);
  };

  // Preload post feed images for instant render
  useEffect(() => {
    if (posts && posts.length > 0) {
      // Preload first 9 images (visible above the fold)
      posts.slice(0, 9).forEach((post) => {
        const url = getMediaUrl(post, true);
        if (url) {
          const img = new Image();
          img.src = proxify(url);
        }
      });
    }
  }, [posts]);

  // Preload profile pic
  useEffect(() => {
    if (profileData?.profile_pic_url_hd) {
      const img = new Image();
      img.src = proxify(profileData.profile_pic_url_hd);
    }
  }, [profileData]);

  // History tracking effect
  useEffect(() => {
    if (profileData) {
      try {
        const historyJson =
          localStorage.getItem("anolmy_history_profiles") ||
          localStorage.getItem("anonyview_history_profiles") ||
          "[]";
        let history: any[] = JSON.parse(historyJson);
        history = history.filter((p: any) => p.username.toLowerCase() !== profileData.username.toLowerCase());
        history.unshift({
          username: profileData.username,
          full_name: profileData.full_name,
          profile_pic_url_hd: profileData.profile_pic_url_hd,
          media_count: profileData.media_count,
          follower_count: profileData.follower_count,
          timestamp: Date.now()
        });
        if (history.length > 50) {
          history = history.slice(0, 50);
        }
        localStorage.setItem("anolmy_history_profiles", JSON.stringify(history));
        localStorage.setItem("anonyview_history_profiles", JSON.stringify(history));
        setHistoryList(history);
      } catch (err) {
        console.error("Failed to add to history", err);
      }
    }
  }, [profileData]);

  const fetchProfile = async (e?: React.FormEvent, targetUsername?: string) => {
    if (e) e.preventDefault();
    const query = targetUsername || searchQuery;
    if (!query.trim()) return;

    let input = query.trim();
    let user = input;
    let isDirectPostOrReel = false;

    // Robust extraction of username from various Instagram link formats
    if (input.includes("instagram.com/")) {
      try {
        let cleanedUrl = input;
        if (!cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
          cleanedUrl = "https://" + cleanedUrl;
        }
        const urlObj = new URL(cleanedUrl);
        const paths = urlObj.pathname.split("/").filter(Boolean);
        
        if (paths.length > 0) {
          if (paths[0] === "p" || paths[0] === "reel" || paths[0] === "reels") {
            isDirectPostOrReel = true;
          } else if (paths[0] === "stories") {
            user = paths[1] || "";
          } else {
            user = paths[0];
          }
        }
      } catch (e) {
        // Simple fallback parsing if URL construction fails
        const paths = input.split("instagram.com/")[1]?.split("?")[0]?.split("/").filter(Boolean) || [];
        if (paths.length > 0) {
          if (paths[0] === "p" || paths[0] === "reel" || paths[0] === "reels") {
            isDirectPostOrReel = true;
          } else if (paths[0] === "stories") {
            user = paths[1] || "";
          } else {
            user = paths[0];
          }
        }
      }
    }

    if (isDirectPostOrReel) {
      setErrorMsg("You entered a direct link to a single post or reel. This app is designed to view and download full profile feeds, stories, and highlights. Please search for a public username (e.g., 'cristiano' or 'kyliejenner') to download their content.");
      setHasSearched(true);
      setProfileData(null);
      setPosts([]);
      setStories([]);
      setHighlights([]);
      setIsLoading(false);
      setIsProfileLoading(false);
      setIsPostsLoading(false);
      setIsStoriesLoading(false);
      setIsHighlightsLoading(false);
      return;
    }

    if (user.startsWith("@")) {
      user = user.substring(1);
    }
    // Remove query parameters or trailing slashes if any
    user = user.split("?")[0].split("/").filter(Boolean)[0] || "";
    user = user.trim();

    if (!user) {
      setErrorMsg("Please enter a valid Instagram username or profile link.");
      setHasSearched(true);
      setProfileData(null);
      setPosts([]);
      setStories([]);
      setHighlights([]);
      setIsLoading(false);
      setIsProfileLoading(false);
      setIsPostsLoading(false);
      setIsStoriesLoading(false);
      setIsHighlightsLoading(false);
      return;
    }

    const cacheKey = user.toLowerCase();

    // Use Cache immediately (SWR - Stale-While-Revalidate)
    const cached = localCache[cacheKey];
    setHasSearched(true);
    if (cached) {
      setProfileData(cached.profileData);
      setPosts(cached.posts);
      setStories(cached.stories);
      setHighlights(cached.highlights);
      setNextPageCursor(cached.nextPageCursor);
      setErrorMsg(null);
      setIsLoading(false);
      setIsProfileLoading(false);
      setIsPostsLoading(false);
      setIsStoriesLoading(false);
      setIsHighlightsLoading(false);
    } else {
      setIsLoading(true);
      setIsProfileLoading(true);
      setIsPostsLoading(true);
      setIsStoriesLoading(true);
      setIsHighlightsLoading(true);
      setProfileData(null);
      setPosts([]);
      setStories([]);
      setHighlights([]);
      setErrorMsg(null);
      setNextPageCursor(null);
    }

    // Initialize state holders for this fetch cycle
    let activePosts: PostNode[] = cached ? cached.posts : [];
    let activeProfile: ProfileData | null = cached ? cached.profileData : null;
    let activeStories: any[] = cached ? cached.stories : [];
    let activeHighlights: any[] = cached ? cached.highlights : [];
    let activeCursor: string | null = cached ? cached.nextPageCursor : null;

    // Helper to update global cache
    const updateCache = () => {
      localCache[cacheKey] = {
        profileData: activeProfile,
        posts: activePosts,
        stories: activeStories,
        highlights: activeHighlights,
        nextPageCursor: activeCursor,
        timestamp: Date.now(),
      };
    };

    // Parallel fetch: Posts (primary view content)
    const fetchPostsPromise = fetchWithFallback("posts", { username: user }, `/api/posts/${encodeURIComponent(user)}`)
      .then(async (res) => {
        const pData = await res.json();
        if (!res.ok) {
          throw new Error(pData.message || pData.error || "Failed to fetch posts");
        }

        if (pData.result && pData.result.edges) {
          const fetchedPosts = pData.result.edges
            .map((e: any) => e.node)
            .filter(Boolean);
          
          activePosts = fetchedPosts;
          setPosts(fetchedPosts);
          
          if (pData.result.page_info?.has_next_page) {
            activeCursor = pData.result.page_info.end_cursor;
            setNextPageCursor(activeCursor);
          } else {
            activeCursor = null;
            setNextPageCursor(null);
          }

          // If profileData is not set yet, create a quick placeholder from post user node to show avatar/username instantly!
          if (!activeProfile && fetchedPosts.length > 0) {
            const usrInfo = fetchedPosts[0].user || fetchedPosts[0].owner || {};
            activeProfile = {
              username: usrInfo.username || user,
              full_name: usrInfo.full_name || usrInfo.fullname || user,
              biography: usrInfo.biography || usrInfo.bio || "No biography available.",
              follower_count: usrInfo.follower_count || usrInfo.followers || 0,
              following_count: usrInfo.following_count || usrInfo.following || 0,
              media_count: usrInfo.media_count || usrInfo.posts || fetchedPosts.length || 0,
              profile_pic_url_hd: usrInfo.hd_profile_pic_url_info?.url || usrInfo.profile_pic_url || "",
              is_private: usrInfo.is_private || false,
              is_verified: usrInfo.is_verified || false,
            };
            setProfileData(activeProfile);
          }
          updateCache();
        }
        setIsPostsLoading(false); // Stop post grid loader as soon as posts are ready
      })
      .catch((err) => {
        console.error("Posts fetch error:", err);
        // Fallback to /api/profile if special endpoint fails
        return fetchWithFallback("posts", { username: user }, `/api/profile/${encodeURIComponent(user)}`)
          .then(async (res) => {
            const pData = await res.json();
            if (!res.ok) throw new Error(pData.message || "Profile not found");
            
            if (pData.result && pData.result.edges) {
              const fetchedPosts = pData.result.edges
                .map((e: any) => e.node)
                .filter(Boolean);
              activePosts = fetchedPosts;
              setPosts(fetchedPosts);
              if (pData.result.page_info?.has_next_page) {
                activeCursor = pData.result.page_info.end_cursor;
                setNextPageCursor(activeCursor);
              }
            }
            const usrInfo = pData.user_info || (activePosts.length > 0 ? (activePosts[0].user || activePosts[0].owner) : null) || {};
            activeProfile = {
              username: usrInfo.username || pData.username || user,
              full_name: usrInfo.full_name || pData.full_name || pData.fullname || user,
              biography: usrInfo.biography || pData.biography || pData.bio || "No biography available.",
              follower_count: usrInfo.follower_count || pData.follower_count || pData.followers || 0,
              following_count: usrInfo.following_count || pData.following_count || pData.following || 0,
              media_count: usrInfo.media_count || pData.media_count || pData.posts || activePosts.length || 0,
              profile_pic_url_hd: usrInfo.hd_profile_pic_url_info?.url || usrInfo.profile_pic_url || pData.profile_pic_url_hd || "",
              is_private: usrInfo.is_private || pData.is_private || false,
              is_verified: usrInfo.is_verified || pData.is_verified || false,
            };
            setProfileData(activeProfile);
            updateCache();
            setIsPostsLoading(false);
          });
      });

    // Parallel fetch: User Info (does not block showing posts)
    const fetchUserInfoPromise = fetchWithFallback("userInfo", { username: user }, `/api/user-info/${encodeURIComponent(user)}`)
      .then(async (res) => {
        const uiData = await res.json();
        if (uiData.result && uiData.result[0] && uiData.result[0].user) {
          const usrInfo = uiData.result[0].user;
          activeProfile = {
            username: usrInfo.username || activeProfile?.username || user,
            full_name: usrInfo.full_name || activeProfile?.full_name || user,
            biography: usrInfo.biography || activeProfile?.biography || "No biography available.",
            follower_count: usrInfo.follower_count || activeProfile?.follower_count || 0,
            following_count: usrInfo.following_count || activeProfile?.following_count || 0,
            media_count: usrInfo.media_count || activeProfile?.media_count || activePosts.length || 0,
            profile_pic_url_hd: usrInfo.hd_profile_pic_url_info?.url || usrInfo.profile_pic_url || activeProfile?.profile_pic_url_hd || "",
            is_private: usrInfo.is_private || activeProfile?.is_private || false,
            is_verified: usrInfo.is_verified || activeProfile?.is_verified || false,
          };
          setProfileData(activeProfile);
          updateCache();
        }
        setIsProfileLoading(false);
      })
      .catch((err) => {
        console.error("User Info fetch error:", err);
        setIsProfileLoading(false);
      });

    // Parallel fetch: Stories
    const fetchStoriesPromise = fetchWithFallback("stories", { username: user }, `/api/stories/${encodeURIComponent(user)}`)
      .then(async (r) => {
        const data = await r.json();
        if (data.result) {
          activeStories = data.result;
          setStories(data.result);
          updateCache();
        }
        setIsStoriesLoading(false);
      })
      .catch((e) => {
        console.log(e);
        setIsStoriesLoading(false);
      });

    // Parallel fetch: Highlights
    const fetchHighlightsPromise = fetchWithFallback("highlights", { username: user }, `/api/highlights/${encodeURIComponent(user)}`)
      .then(async (r) => {
        const data = await r.json();
        if (data.result) {
          activeHighlights = data.result;
          setHighlights(data.result);
          updateCache();
        }
        setIsHighlightsLoading(false);
      })
      .catch((e) => {
        console.log(e);
        setIsHighlightsLoading(false);
      });

    // Wait for the primary post list to complete (or fail) to manage overall loader
    try {
      await fetchPostsPromise;
    } catch (err: any) {
      if (!cached) {
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
      setIsPostsLoading(false);
      setIsProfileLoading(false);
    }
  };

  const handleHighlightClick = async (index: number) => {
    const hlt = highlights[index];
    if (!hlt) return;

    setSelectedHighlightIndex(index);
    setActiveHighlightStoryIndex(0);
    setIsHighlightStoriesLoading(true);
    setActiveHighlightStories([]);

    try {
      const pRes = await fetchWithFallback(
        "stories",
        { username: profileData?.username, highlight_id: hlt.id },
        `/api/stories/${encodeURIComponent(profileData?.username || "")}?highlight_id=${encodeURIComponent(hlt.id)}`
      );
      const data = await pRes.json();
      if (data.result) {
        setActiveHighlightStories(data.result);
      }
    } catch (err) {
      console.error("Failed to load highlight stories", err);
    } finally {
      setIsHighlightStoriesLoading(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (!nextPageCursor || isLoadingMore || !profileData) return;
    setIsLoadingMore(true);
    try {
      const pRes = await fetchWithFallback("posts", { username: profileData.username, maxId: nextPageCursor }, `/api/profile/${encodeURIComponent(profileData.username)}?maxId=${encodeURIComponent(nextPageCursor)}`);
      const pData = await pRes.json();
      if (!pRes.ok)
        throw new Error(pData.message || pData.error || "Failed to load more");

      if (pData.result && pData.result.edges) {
        const morePosts = pData.result.edges
          .map((e: any) => e.node)
          .filter(Boolean);
        setPosts((prev) => [...prev, ...morePosts]);
        if (pData.result.page_info?.has_next_page) {
          setNextPageCursor(pData.result.page_info.end_cursor);
        } else {
          setNextPageCursor(null);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageCursor, isLoadingMore, profileData]);

  const loadMorePostsRef = useRef(loadMorePosts);
  useEffect(() => {
    loadMorePostsRef.current = loadMorePosts;
  }, [loadMorePosts]);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    if (!node) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePostsRef.current();
        }
      },
      { rootMargin: "150px" },
    );
    observer.current.observe(node);
  }, []);

  const formatNum = (num?: number) => {
    if (num === undefined) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getMediaUrl = (item: any, thumbnail = false) => {
    let url = "";
    if (item.image_versions2?.candidates?.length > 0) {
      const candidates = item.image_versions2.candidates;
      if (thumbnail && candidates.length > 1) {
        const sorted = [...candidates].sort((a, b) => a.width - b.width);
        const thumb =
          sorted.find((cand: any) => cand.width >= 320) ||
          sorted[sorted.length - 1];
        url = thumb.url;
      } else {
        url = candidates[0].url;
      }
    } else if (item.cover_media?.cropped_image_version?.url) {
      url = item.cover_media.cropped_image_version.url;
    } else if (item.display_url) {
      url = item.display_url;
    }
    return url;
  };

  const getMediaDimensions = (item: any) => {
    if (item.image_versions2?.candidates?.length > 0) {
      const cand = item.image_versions2.candidates[0];
      if (cand.width && cand.height) return { width: cand.width, height: cand.height };
    } else if (item.original_width && item.original_height) {
      return { width: item.original_width, height: item.original_height };
    }
    return { width: 1, height: 1 }; // fallback square
  };

  const triggerDownload = (url: string, filename?: string) => {
    let finalUrl = url;
    if (finalUrl.startsWith("/api/proxy") && !finalUrl.includes("&dl=1")) {
      finalUrl += "&dl=1";
    } else if (typeof window !== 'undefined' && (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('vercel.app') || window.location.hostname.includes('github.io'))) {
      // Create a blob from the cors proxy to force download
      fetch(finalUrl)
        .then(r => r.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          if (filename) link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        })
        .catch(e => {
          // fallback if blob fails
          const link = document.createElement("a");
          link.href = finalUrl;
          if (filename) link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      return;
    }
    const link = document.createElement("a");
    link.href = finalUrl;
    if (filename) link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-[#262626]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 font-bold text-lg tracking-tight select-none cursor-pointer shrink-0"
            onClick={() => {
              setProfileData(null);
              setHasSearched(false);
              setErrorMsg(null);
              setHomepageTab("welcome");
              setSearchQuery("");
            }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center text-white p-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </div>
            <span className="hidden sm:inline font-bold tracking-tight text-white">anolmy</span>
          </div>

          <form
            onSubmit={fetchProfile}
            className="flex-1 max-w-md relative group"
          >
            <input
              type="text"
              placeholder="Enter username or profile URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-transparent rounded-xl py-2 pl-11 pr-4 text-sm focus:bg-black focus:border-[#262626] focus:ring-2 focus:ring-neutral-800 transition-all outline-none"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-neutral-300 transition-colors" />
          </form>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                setProfileData(null);
                setHasSearched(false);
                setErrorMsg(null);
                setHomepageTab("saved");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs font-semibold ${
                homepageTab === "saved" && !profileData && !hasSearched
                  ? "bg-zinc-800 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-zinc-900"
              }`}
              title="Saved Bookmarks"
            >
              <Bookmark className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Saved</span>
            </button>

            <button
              onClick={() => {
                setProfileData(null);
                setHasSearched(false);
                setErrorMsg(null);
                setHomepageTab("history");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs font-semibold ${
                homepageTab === "history" && !profileData && !hasSearched
                  ? "bg-zinc-800 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-zinc-900"
              }`}
              title="Search History"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-0 sm:px-4 py-4 sm:py-12">
        <AnimatePresence mode="wait">
          {errorMsg ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center bg-red-50 text-red-900 rounded-3xl p-8 border border-red-100 mx-4 sm:mx-0"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">Notice</h2>
              <p className="max-w-md mx-auto whitespace-pre-line leading-relaxed text-red-700/80">
                {errorMsg}
              </p>
            </motion.div>
          ) : hasSearched ? (
            <motion.div
              key="profile-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Profile Header (Skeleton if loading profile AND no data yet) */}
              {profileData === null && isProfileLoading ? (
                <div className="animate-pulse">
                  <section className="flex flex-col sm:flex-row items-start gap-4 sm:gap-16 px-0 sm:px-8 mb-6 sm:mb-16">
                    <div className="shrink-0 relative hidden sm:block">
                      <div className="w-40 h-40 rounded-full bg-[#262626]"></div>
                    </div>

                    <div className="flex flex-col gap-3 w-full px-4 sm:px-0 sm:items-start flex-1">
                      {/* Mobile Row: Photo + Username & Stats */}
                      <div className="flex sm:hidden flex-row items-center w-full gap-6 mb-2">
                        <div className="shrink-0 relative">
                          <div className="w-20 h-20 rounded-full bg-[#262626]"></div>
                        </div>
                        <div className="flex flex-col flex-1 gap-2">
                          <div className="h-6 bg-[#262626] rounded w-32 mb-1"></div>
                          <div className="flex justify-between flex-1 text-center pr-2">
                            <div className="w-10 h-8 bg-[#262626] rounded"></div>
                            <div className="w-10 h-8 bg-[#262626] rounded"></div>
                            <div className="w-10 h-8 bg-[#262626] rounded"></div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Header */}
                      <div className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-1">
                        <div className="h-8 bg-[#262626] rounded w-48"></div>
                      </div>

                      {/* Desktop Stats */}
                      <div className="hidden sm:flex gap-10 w-full justify-start mb-2 py-2">
                        <div className="h-10 bg-[#262626] rounded w-16"></div>
                        <div className="h-10 bg-[#262626] rounded w-16"></div>
                        <div className="h-10 bg-[#262626] rounded w-16"></div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : profileData ? (
                <section className="flex flex-col sm:flex-row items-start gap-4 sm:gap-16 px-0 sm:px-8 mb-6 sm:mb-16 animate-fade-in">
                  {/* Desktop: Photo on the left */}
                  <div className="hidden sm:block shrink-0 relative">
                    <div className="w-40 h-40 rounded-full overflow-hidden">
                      {profileData.profile_pic_url_hd ? (
                        <FadeInImage
                          src={proxify(profileData.profile_pic_url_hd)}
                          alt={profileData.username}
                          loading="eager"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#121212] flex items-center justify-center rounded-full">
                          <User className="w-12 h-12 text-[#555555]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full px-4 sm:px-0 sm:items-start flex-1">
                    {/* Mobile Row: Photo + Username & Stats */}
                    <div className="flex sm:hidden flex-row items-center w-full gap-6 mb-2">
                      <div className="shrink-0 relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden">
                          {profileData.profile_pic_url_hd ? (
                            <FadeInImage
                              src={proxify(profileData.profile_pic_url_hd)}
                              alt={profileData.username}
                              loading="eager"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#121212] flex items-center justify-center rounded-full">
                              <User className="w-8 h-8 text-[#555555]" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-1 truncate max-w-[130px]">
                            {profileData.username}
                            {profileData.is_verified && (
                              <svg
                                className="w-4 h-4 text-blue-500 fill-current shrink-0"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z" />
                              </svg>
                            )}
                          </h1>
                          <button
                            onClick={() => toggleSaveProfile(profileData)}
                            className={`flex items-center justify-center p-2 rounded-xl transition-all border shrink-0 ${
                              isProfileSaved(profileData.username)
                                ? "bg-white text-black border-white"
                                : "bg-[#121212] border-zinc-800 text-neutral-300 hover:text-white"
                            }`}
                            title={isProfileSaved(profileData.username) ? "Saved" : "Save Profile"}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isProfileSaved(profileData.username) ? "fill-current" : ""}`} />
                          </button>
                        </div>

                        {/* Mobile Stats Row */}
                        <div className="flex gap-4 text-center mt-1">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-white">
                              {formatNum(profileData.media_count)}
                            </span>
                            <span className="text-[#A8A8A8] text-[10px]">
                              posts
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-white">
                              {formatNum(profileData.follower_count)}
                            </span>
                            <span className="text-[#A8A8A8] text-[10px]">
                              followers
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-white">
                              {formatNum(profileData.following_count)}
                            </span>
                            <span className="text-[#A8A8A8] text-[10px]">
                              following
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Name & Bio */}
                    <div className="flex sm:hidden flex-col text-sm mb-4 w-full px-1">
                      <span className="font-bold text-white text-[13px]">{profileData.full_name}</span>
                      <span className="text-neutral-300 whitespace-pre-wrap mt-0.5 leading-relaxed text-xs">
                        {profileData.biography}
                      </span>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden sm:flex flex-row items-center gap-4 mb-1.5">
                      <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-white flex items-center gap-2">
                        {profileData.username}
                        {profileData.is_verified && (
                          <svg
                            className="w-5 h-5 text-blue-500 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z" />
                          </svg>
                        )}
                      </h1>
                      <button
                        onClick={() => toggleSaveProfile(profileData)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isProfileSaved(profileData.username)
                            ? "bg-white text-black border-white"
                            : "bg-[#121212] border-zinc-800 text-neutral-300 hover:text-white"
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isProfileSaved(profileData.username) ? "fill-current" : ""}`} />
                        <span>{isProfileSaved(profileData.username) ? "Saved" : "Save Profile"}</span>
                      </button>
                    </div>

                    {/* Desktop Stats */}
                    <div className="hidden sm:flex gap-10 text-base py-2 w-full justify-start mb-2">
                      <div className="flex gap-1.5 items-baseline">
                        <span className="font-bold text-white">
                          {formatNum(profileData.media_count)}
                        </span>
                        <span className="text-[#A8A8A8] text-sm">posts</span>
                      </div>
                      <div className="flex gap-1.5 items-baseline">
                        <span className="font-bold text-white">
                          {formatNum(profileData.follower_count)}
                        </span>
                        <span className="text-[#A8A8A8] text-sm">followers</span>
                      </div>
                      <div className="flex gap-1.5 items-baseline">
                        <span className="font-bold text-white">
                          {formatNum(profileData.following_count)}
                        </span>
                        <span className="text-[#A8A8A8] text-sm">following</span>
                      </div>
                    </div>

                    {/* Desktop Name & Bio */}
                    <div className="hidden sm:flex flex-col text-sm max-w-md">
                      <span className="font-bold text-white text-[15px]">{profileData.full_name}</span>
                      <span className="text-neutral-300 whitespace-pre-wrap mt-1 leading-relaxed">
                        {profileData.biography}
                      </span>
                    </div>
                  </div>
                </section>
              ) : null}

              {/* Tabs */}
              <div className="relative border-t border-[#262626] flex items-center justify-center min-h-[48px] mb-8 select-none">
                <div className="flex flex-row justify-center gap-4 sm:gap-12 uppercase text-[10px] sm:text-xs font-bold tracking-widest overflow-x-auto w-full no-scrollbar px-2 sm:px-0">
                  <TabBtn
                    icon={<Grid className="w-3.5 h-3.5" />}
                    label="Posts"
                    active={activeTab === "posts"}
                    onClick={() => setActiveTab("posts")}
                  />
                  <TabBtn
                    icon={<PlaySquare className="w-3.5 h-3.5" />}
                    label="Reels"
                    active={activeTab === "reels"}
                    onClick={() => setActiveTab("reels")}
                  />
                  <TabBtn
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label={`Stories (${isStoriesLoading && stories.length === 0 ? "..." : stories.length})`}
                    active={activeTab === "stories"}
                    onClick={() => setActiveTab("stories")}
                  />
                  <TabBtn
                    icon={<Star className="w-3.5 h-3.5" />}
                    label={`Highlights (${isHighlightsLoading && highlights.length === 0 ? "..." : highlights.length})`}
                    active={activeTab === "highlights"}
                    onClick={() => setActiveTab("highlights")}
                  />
                </div>

                {/* Right Corner Buttons */}
                {profileData && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-2 sm:pr-3 z-10 bg-gradient-to-l from-black via-black/80 to-transparent pl-4">
                    {/* View Mode (Bento vs. Standard Grid) - Only for Posts */}
                    {activeTab === "posts" && !isPostsLoading && posts.length > 0 && (
                      <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-full border border-zinc-800/80">
                        <button
                          onClick={() => setIsBentoGrid(false)}
                          className={`p-1.5 rounded-full transition-all ${
                            !isBentoGrid
                              ? "bg-white text-black shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title="Standard Square Grid"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIsBentoGrid(true)}
                          className={`p-1.5 rounded-full transition-all ${
                            isBentoGrid
                              ? "bg-white text-black shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title="Staggered Bento Grid"
                        >
                          <Columns className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Reels Mode Selectors - Only for Reels */}
                    {activeTab === "reels" && (
                      <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-full border border-zinc-800/80">
                        <button
                          onClick={() => setReelsViewMode("grid")}
                          className={`p-1.5 rounded-full transition-all ${
                            reelsViewMode === "grid"
                              ? "bg-white text-black shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title="Grid View"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setReelsViewMode("immersive")}
                          className={`p-1.5 rounded-full transition-all ${
                            reelsViewMode === "immersive"
                              ? "bg-white text-black shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title="Immersive View"
                        >
                          <RectangleVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Content */}
              {(activeTab === "posts" || activeTab === "reels") && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  {isPostsLoading && posts.length === 0 ? (
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 px-1 sm:px-0">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] bg-[#121212] border border-[#262626] animate-pulse rounded-sm"
                        />
                      ))}
                    </div>
                  ) : activeTab === "reels" && reelsViewMode === "immersive" ? (
                    <ReelsImmersiveFeed
                      reels={posts.filter(
                        (p) =>
                          p.media_type === 2 ||
                          (p.video_versions && p.video_versions.length > 0)
                      )}
                      proxify={proxify}
                      getMediaUrl={getMediaUrl}
                      triggerDownload={triggerDownload}
                    />
                  ) : (
                    <>
                      {posts.filter(
                        (p) =>
                          activeTab === "posts" ||
                          p.media_type === 2 ||
                          (p.video_versions && p.video_versions.length > 0),
                      ).length === 0 ? (
                        <div className="col-span-3 py-20 text-center text-[#A8A8A8]">
                          No {activeTab} found or account is completely private.
                        </div>
                      ) : isBentoGrid ? (
                        /* Staggered Bento Grid Layout (JS Masonry) */
                        (() => {
                          const bentoPosts = posts.filter(
                            (p) =>
                              activeTab === "posts" ||
                              p.media_type === 2 ||
                              (p.video_versions && p.video_versions.length > 0)
                          );
                          const colsData = Array.from({ length: bentoCols }, () => [] as typeof bentoPosts);
                          bentoPosts.forEach((p, i) => colsData[i % bentoCols].push(p));

                          return (
                            <div className="flex w-full gap-2 sm:gap-4 animate-fade-in items-start">
                              {colsData.map((colPosts, colIndex) => (
                                <div key={colIndex} className="flex flex-col flex-1 gap-2 sm:gap-4">
                                  {colPosts.map((post) => {
                                    const index = bentoPosts.indexOf(post);
                                    const dims = getMediaDimensions(post);
                                    const ratio = dims.width / dims.height;
                                    return (
                                      <div
                                        key={post.id || `post-${index}`}
                                        className="relative group bg-[#121212] cursor-pointer overflow-hidden rounded-xl border border-zinc-800 hover:scale-[1.02] transition-all duration-300 shadow-md"
                                        style={{ aspectRatio: `${ratio}` }}
                                        onClick={() => setSelectedPost(post)}
                                      >
                                        <FadeInImage
                                          src={proxify(getMediaUrl(post, true))}
                                          alt={post.caption?.text || "Post"}
                                          loading={index < 12 ? "eager" : "lazy"}
                                          decoding="async"
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-105 rounded-xl"
                                        />

                                        <div className="absolute top-3 right-3 text-white drop-shadow-md z-10">
                                          {post.media_type === 8 ? (
                                            <CarouselIcon className="w-5 h-5 text-white" />
                                          ) : post.video_versions ? (
                                            <VideoIcon className="w-5 h-5 text-white" />
                                          ) : null}
                                        </div>

                                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        /* Standard Square Grid Layout */
                        <div className="grid grid-cols-3 gap-1 sm:gap-2">
                          {posts
                            .filter(
                              (p) =>
                                activeTab === "posts" ||
                                p.media_type === 2 ||
                                (p.video_versions && p.video_versions.length > 0),
                            )
                            .map((post, index) => {
                              return (
                                <div
                                  key={post.id || `post-${index}`}
                                  onClick={() => setSelectedPost(post)}
                                  className="aspect-[3/4] relative group bg-[#121212] cursor-pointer overflow-hidden rounded-sm hover:-translate-y-0.5 transition-transform duration-300"
                                >
                                  <FadeInImage
                                    src={proxify(getMediaUrl(post, true))}
                                    alt={post.caption?.text || "Post"}
                                    loading={index < 12 ? "eager" : "lazy"}
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  />

                                  <div className="absolute top-2 right-2 text-white drop-shadow-md z-10">
                                    {post.media_type === 8 ? (
                                      <CarouselIcon className="w-5 h-5 text-white" />
                                    ) : post.video_versions ? (
                                      <VideoIcon className="w-5 h-5 text-white" />
                                    ) : null}
                                  </div>

                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </>
                  )}

                  {nextPageCursor && reelsViewMode !== "immersive" && (
                    <div
                      ref={loadMoreRef}
                      className="flex justify-center mt-4 mb-8 py-4 w-full"
                    >
                      {isLoadingMore && (
                        <Loader2 className="w-8 h-8 animate-spin text-[#A8A8A8]" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "stories" && (
                <div className="animate-fade-in">
                  {isStoriesLoading && stories.length === 0 ? (
                    <div className="grid grid-cols-3 gap-1 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[9/16] bg-[#121212] border border-[#262626] animate-pulse rounded-xl"
                        />
                      ))}
                    </div>
                  ) : stories.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-[#A8A8A8]">
                      No active stories available right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                      {stories.map((story, index) => {
                        return (
                          <div
                            key={story.id || `story-${index}`}
                            onClick={() => {
                              setSelectedStoryIndex(index);
                            }}
                            className="aspect-[9/16] relative group bg-[#121212] rounded-xl overflow-hidden shadow-sm cursor-pointer hover:scale-[1.02] transition-transform duration-300 border border-zinc-800"
                          >
                            <FadeInImage
                              src={proxify(getMediaUrl(story, true))}
                              alt="Story"
                              loading={index < 5 ? "eager" : "lazy"}
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-80"
                            />

                            {story.video_versions && (
                              <PlayCircle className="absolute top-2 right-2 w-5 h-5 text-white z-10" />
                            )}
                            
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDownload(
                                    story.video_versions
                                      ? proxify(story.video_versions[0].url, true)
                                      : proxify(getMediaUrl(story), true),
                                    `story_${story.id}.${story.video_versions ? "mp4" : "jpg"}`,
                                  );
                                }}
                                className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-colors"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "highlights" && (
                <div className="animate-fade-in">
                  {isHighlightsLoading && highlights.length === 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 sm:gap-6 px-4 sm:px-0">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-3 animate-pulse">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#121212] border border-[#262626]" />
                          <div className="h-4 bg-[#121212] rounded w-16" />
                        </div>
                      ))}
                    </div>
                  ) : highlights.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-[#A8A8A8]">
                      No highlights found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 sm:gap-6 px-4 sm:px-0">
                      {highlights.map((hlt, index) => (
                        <div
                          key={hlt.id || `hlt-${index}`}
                          className="flex flex-col items-center gap-3 group cursor-pointer"
                          onClick={() => handleHighlightClick(index)}
                        >
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] bg-[#262626] group-hover:bg-[#363636] transition-colors">
                            <FadeInImage
                              src={proxify(getMediaUrl(hlt, true))}
                              alt={hlt.title}
                              loading={index < 5 ? "eager" : "lazy"}
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover rounded-full border-2 border-black"
                            />
                          </div>
                          <span className="text-xs font-semibold text-center truncate w-full px-2 text-neutral-300">
                            {hlt.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 sm:px-0"
            >
              {/* Dynamic Dashboard Header */}
              <div className="flex flex-col items-center text-center mt-6 mb-10">
                <div className="w-16 h-16 bg-[#121212] border border-zinc-800 rounded-full flex items-center justify-center mb-4">
                  {homepageTab === "welcome" && <Search className="w-6 h-6 text-neutral-400" />}
                  {homepageTab === "saved" && <Bookmark className="w-6 h-6 text-neutral-400" />}
                  {homepageTab === "history" && <Clock className="w-6 h-6 text-neutral-400" />}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {homepageTab === "welcome" && "anolmy"}
                  {homepageTab === "saved" && "Saved Bookmarks"}
                  {homepageTab === "history" && "Search History"}
                </h2>
                <p className="max-w-md text-sm text-[#A8A8A8] mt-2 font-normal">
                  {homepageTab === "welcome" && "Search any public profile to view and download their high-res posts, reels, and stories anonymously."}
                  {homepageTab === "saved" && "Quickly access your saved profiles, posts, photos, and videos anytime."}
                  {homepageTab === "history" && "Your recently visited public profiles. Tapping any will instantly reload their feed."}
                </p>
              </div>

              {/* Centered Tab Switcher */}
              <div className="flex justify-center mb-10">
                <div className="flex bg-[#121212] p-1 rounded-xl border border-zinc-800 w-full max-w-md">
                  <button
                    onClick={() => setHomepageTab("welcome")}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      homepageTab === "welcome" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Search
                  </button>
                  <button
                    onClick={() => setHomepageTab("saved")}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      homepageTab === "saved" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Saved ({savedProfiles.length + savedPosts.length})
                  </button>
                  <button
                    onClick={() => setHomepageTab("history")}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      homepageTab === "history" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    History ({historyList.length})
                  </button>
                </div>
              </div>

              {/* TAB CONTENT: Welcome */}
              {homepageTab === "welcome" && (
                <div className="flex flex-col items-center">
                  {historyList.length > 0 && (
                    <div className="w-full max-w-3xl mt-4 text-left">
                      <h3 className="text-xs font-bold text-neutral-400 tracking-wider uppercase mb-4">Quick Access Profiles</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                        {historyList.slice(0, 8).map((profile) => (
                          <div
                            key={profile.username}
                            onClick={() => handleSelectProfile(profile.username)}
                            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group bg-[#121212]/30 p-3 rounded-xl border border-zinc-900/50 hover:bg-[#121212] hover:border-zinc-800 transition-all duration-200 w-28 text-center"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-zinc-700 transition-colors">
                              {profile.profile_pic_url_hd ? (
                                <FadeInImage src={proxify(profile.profile_pic_url_hd)} className="w-full h-full rounded-full" alt={profile.username} />
                              ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center rounded-full">
                                  <User className="w-5 h-5 text-neutral-500" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-neutral-300 group-hover:text-white transition-colors truncate w-full">{profile.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Saved Bookmarks */}
              {homepageTab === "saved" && (
                <div className="w-full">
                  <SavedTabsView
                    savedProfiles={savedProfiles}
                    savedPosts={savedPosts}
                    onSelectProfile={handleSelectProfile}
                    onRemoveProfile={(username) => {
                      const updated = savedProfiles.filter((p) => p.username.toLowerCase() !== username.toLowerCase());
                      setSavedProfiles(updated);
                      localStorage.setItem("anolmy_saved_profiles", JSON.stringify(updated));
                      localStorage.setItem("anonyview_saved_profiles", JSON.stringify(updated));
                    }}
                    onSelectPost={setSelectedPost}
                    onRemovePost={(postId) => {
                      const updated = savedPosts.filter((p) => p.id !== postId);
                      setSavedPosts(updated);
                      localStorage.setItem("anolmy_saved_posts", JSON.stringify(updated));
                      localStorage.setItem("anonyview_saved_posts", JSON.stringify(updated));
                    }}
                    getMediaUrl={getMediaUrl}
                    proxify={proxify}
                  />
                </div>
              )}

              {/* TAB CONTENT: History */}
              {homepageTab === "history" && (
                <div className="w-full max-w-2xl mx-auto">
                  {historyList.length === 0 ? (
                    <div className="py-16 text-center text-neutral-500 border border-zinc-900 border-dashed rounded-2xl bg-[#121212]/10">
                      <Clock className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                      <p className="text-sm font-medium text-neutral-400">No search history yet.</p>
                      <p className="text-xs text-neutral-600 mt-1">Visited public profiles will be securely cataloged here for fast access.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Visited Profiles</span>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to clear your search history?")) {
                              setHistoryList([]);
                              localStorage.removeItem("anolmy_history_profiles");
                              localStorage.removeItem("anonyview_history_profiles");
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {historyList.map((item) => (
                          <div
                            key={item.username}
                            onClick={() => handleSelectProfile(item.username)}
                            className="flex items-center justify-between p-3 rounded-xl bg-[#121212]/40 hover:bg-[#121212] border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                                {item.profile_pic_url_hd ? (
                                  <FadeInImage src={proxify(item.profile_pic_url_hd)} className="w-full h-full" alt={item.username} />
                                ) : (
                                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                    <User className="w-5 h-5 text-neutral-500" />
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <h4 className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">{item.username}</h4>
                                <p className="text-xs text-[#A8A8A8] truncate max-w-[180px] sm:max-w-xs">{item.full_name || "Instagram User"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-600 font-medium hidden sm:inline">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = historyList.filter((p) => p.username.toLowerCase() !== item.username.toLowerCase());
                                  setHistoryList(updated);
                                  localStorage.setItem("anolmy_history_profiles", JSON.stringify(updated));
                                  localStorage.setItem("anonyview_history_profiles", JSON.stringify(updated));
                                }}
                                className="p-2 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Remove from history"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Post Modal overlay */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            proxify={proxify}
            triggerDownload={triggerDownload}
            isPostSaved={isPostSaved}
            toggleSavePost={toggleSavePost}
          />
        )}
      </AnimatePresence>

      {/* Story Modal overlay */}
      <AnimatePresence>
        {selectedStoryIndex !== null && (
          <StoryModal
            stories={stories}
            currentIndex={selectedStoryIndex}
            onChangeIndex={setSelectedStoryIndex}
            onClose={() => setSelectedStoryIndex(null)}
            proxify={proxify}
            getMediaUrl={getMediaUrl}
            triggerDownload={triggerDownload}
            profileData={profileData}
          />
        )}
      </AnimatePresence>

      {/* Highlight Modal overlay */}
      <AnimatePresence>
        {selectedHighlightIndex !== null && (
          isHighlightStoriesLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
              onClick={() => setSelectedHighlightIndex(null)}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-500 border-t-white animate-spin"></div>
                <div className="text-sm text-zinc-400 font-medium">Loading highlight...</div>
              </div>
            </motion.div>
          ) : activeHighlightStories.length > 0 ? (
            <StoryModal
              stories={activeHighlightStories}
              currentIndex={activeHighlightStoryIndex}
              onChangeIndex={(idx) => {
                if (idx === null) {
                  setSelectedHighlightIndex(null);
                } else {
                  setActiveHighlightStoryIndex(idx);
                }
              }}
              onClose={() => setSelectedHighlightIndex(null)}
              proxify={proxify}
              getMediaUrl={getMediaUrl}
              triggerDownload={triggerDownload}
              profileData={profileData}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
              onClick={() => setSelectedHighlightIndex(null)}
            >
              <div className="text-sm text-zinc-400 font-medium bg-zinc-900 px-6 py-3 rounded-full border border-zinc-800">
                This highlight is empty or could not be loaded.
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

function TabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 relative transition-colors ${active ? "text-white border-t-2 border-white -mt-[1px]" : "text-[#A8A8A8] hover:text-white border-t-2 border-transparent -mt-[1px]"}`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PostModal({
  post,
  onClose,
  proxify,
  triggerDownload,
  isPostSaved,
  toggleSavePost,
}: {
  post: PostNode;
  onClose: () => void;
  proxify: (url: string, dl?: boolean) => string;
  triggerDownload: (u: string, f: string) => void;
  isPostSaved: (postId: string) => boolean;
  toggleSavePost: (post: PostNode) => void;
}) {
  // Collect all media items for carousel
  const mediaItems: { isVideo: boolean; url: string; rawUrl: string }[] = [];

  if (post.carousel_media && post.carousel_media.length > 0) {
    post.carousel_media.forEach((m) => {
      if (m.video_versions && m.video_versions.length > 0) {
        mediaItems.push({
          isVideo: true,
          url: proxify(m.video_versions[0].url),
          rawUrl: m.video_versions[0].url,
        });
      } else if (m.image_versions2 && m.image_versions2.candidates) {
        mediaItems.push({
          isVideo: false,
          url: proxify(m.image_versions2.candidates[0].url),
          rawUrl: m.image_versions2.candidates[0].url,
        });
      }
    });
  } else {
    if (post.video_versions && post.video_versions.length > 0) {
      mediaItems.push({
        isVideo: true,
        url: proxify(post.video_versions[0].url),
        rawUrl: post.video_versions[0].url,
      });
    } else if (post.image_versions2 && post.image_versions2.candidates) {
      mediaItems.push({
        isVideo: false,
        url: proxify(post.image_versions2.candidates[0].url),
        rawUrl: post.image_versions2.candidates[0].url,
      });
    } else if (post.display_url) {
      mediaItems.push({
        isVideo: false,
        url: proxify(post.display_url),
        rawUrl: post.display_url,
      });
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = mediaItems[currentIndex];

  const handleDL = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem) return;
    triggerDownload(
      proxify(currentItem.rawUrl, true),
      `download_${post.id}_${currentIndex}.${currentItem.isVideo ? "mp4" : "jpg"}`,
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-12 bg-black/95 sm:bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-[60] p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="bg-black sm:rounded-lg overflow-hidden max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col md:flex-row shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media Viewer */}
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[50vh] sm:min-h-0">
          <AnimatePresence mode="wait">
            {currentItem?.isVideo ? (
              <motion.video
                key={currentItem.url}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={currentItem.url}
                controls
                autoPlay
                playsInline
                referrerPolicy="no-referrer"
                className="w-full h-full sm:max-h-[90vh] object-contain"
              />
            ) : (
              <TransformWrapper
                key={currentItem?.url}
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
              >
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FadeInImage
                    src={currentItem?.url}
                    alt="Post media"
                    referrerPolicy="no-referrer"
                    className="w-full h-full sm:max-h-[90vh] object-contain cursor-zoom-in"
                    fastLoad={true}
                  />
                </TransformComponent>
              </TransformWrapper>
            )}
          </AnimatePresence>

          {mediaItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => Math.max(0, i - 1));
                }}
                disabled={currentIndex === 0}
                className="absolute left-2 sm:left-4 p-2 bg-black/50 hover:bg-black text-white rounded-full disabled:opacity-0 transition-all"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) =>
                    Math.min(mediaItems.length - 1, i + 1),
                  );
                }}
                disabled={currentIndex === mediaItems.length - 1}
                className="absolute right-2 sm:right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full disabled:opacity-0 transition-all"
              >
                <ChevronRight />
              </button>
              <div className="absolute bottom-4 flex gap-1.5 z-10">
                {mediaItems.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${i === currentIndex ? "bg-white w-3" : "bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}

        </div>

        {/* Meta sidebar */}
        <div className="w-full md:w-80 lg:w-96 bg-black text-white flex flex-col h-auto max-h-[40vh] sm:max-h-none md:h-[90vh] overflow-hidden border-l border-[#262626]">
          <div className="p-5 border-b border-[#262626] flex items-center gap-3 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
            <div className="w-10 h-10 rounded-full bg-[#262626] overflow-hidden shrink-0">
              {post.user?.profile_pic_url && (
                <FadeInImage
                  src={proxify(post.user.profile_pic_url)}
                  alt="avatar"
                  className="w-full h-full rounded-full"
                  fastLoad={true}
                />
              )}
            </div>
            <div className="font-bold text-sm truncate">
              {post.user?.username || "Instagram User"}
            </div>
          </div>
          <div className="p-5 text-sm text-white whitespace-pre-line leading-relaxed flex-1 overflow-y-auto">
            {post.caption?.text || "No caption provided."}
          </div>
          <div className="p-4 border-t border-[#262626] flex gap-3 sticky bottom-0 bg-black/95 backdrop-blur-sm">
            <button
              onClick={handleDL}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={() => toggleSavePost(post)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isPostSaved(post.id)
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "bg-neutral-800 text-white hover:bg-neutral-700"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isPostSaved(post.id) ? "fill-current" : ""}`} /> 
              {isPostSaved(post.id) ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StoryModal({
  stories,
  currentIndex,
  onChangeIndex,
  onClose,
  proxify,
  getMediaUrl,
  triggerDownload,
  profileData,
}: {
  stories: any[];
  currentIndex: number;
  onChangeIndex: (idx: number | null) => void;
  onClose: () => void;
  proxify: (url: string, dl?: boolean) => string;
  getMediaUrl: (item: any, thumbnail?: boolean) => string;
  triggerDownload: (u: string, f: string) => void;
  profileData: ProfileData | null;
}) {
  const activeStory = stories[currentIndex];
  const isVideo = !!activeStory?.video_versions;
  const duration = isVideo ? 15000 : 5000;
  const [progress, setProgress] = useState(0);
  const [activeMediaUrl, setActiveMediaUrl] = useState<string>("");
  const [attemptedFallback, setAttemptedFallback] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!activeStory) return;
    const initialUrl = isVideo 
      ? proxify(activeStory.video_versions[0].url)
      : proxify(getMediaUrl(activeStory));
    setActiveMediaUrl(initialUrl);
    setAttemptedFallback(false);
    setProgress(0);
  }, [activeStory, isVideo]);

  const handleImageError = () => {
    if (!attemptedFallback) {
      setAttemptedFallback(true);
      const proxied = proxify(getMediaUrl(activeStory));
      if (proxied) setActiveMediaUrl(proxied);
    }
  };

  const handleVideoError = () => {
    if (!attemptedFallback) {
      setAttemptedFallback(true);
      const proxied = proxify(activeStory.video_versions[0]?.url);
      if (proxied) setActiveMediaUrl(proxied);
    }
  };

  useEffect(() => {
    if (isHolding) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      return;
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }

    const intervalTime = 50;
    const step = (100 * intervalTime) / duration;

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          if (currentIndex < stories.length - 1) {
            onChangeIndex(currentIndex + 1);
          } else {
            onClose();
          }
          return 100;
        }
        return p + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, duration, stories.length, onChangeIndex, onClose, isHolding]);

  if (!activeStory) return null;

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      onChangeIndex(currentIndex - 1);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      onChangeIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = isVideo
      ? proxify(activeStory.video_versions[0].url, true)
      : proxify(getMediaUrl(activeStory), true);
    triggerDownload(
      url,
      `story_${activeStory.id}.${isVideo ? "mp4" : "jpg"}`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
      onClick={onClose}
    >
      {/* Hide close & navigation buttons when holding to show full immersive content */}
      {!isHolding && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 lg:left-8 z-[60] hidden md:flex items-center justify-center p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentIndex < stories.length - 1 ? (
            <button
              onClick={handleNext}
              className="absolute right-4 lg:right-8 z-[60] hidden md:flex items-center justify-center p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="absolute right-4 lg:right-8 z-[60] hidden md:flex items-center justify-center p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[70] p-2 bg-black/40 hover:bg-white/15 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </>
      )}

      <div
        className="relative max-w-[420px] w-full h-[90vh] sm:h-[80vh] aspect-[9/16] bg-zinc-950 sm:rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsHolding(true)}
        onMouseUp={() => setIsHolding(false)}
        onMouseLeave={() => setIsHolding(false)}
        onTouchStart={() => setIsHolding(true)}
        onTouchEnd={() => setIsHolding(false)}
      >
        {/* Progress indicators - hidden on hold */}
        <div className={`absolute top-2 left-0 right-0 px-2 flex gap-1 z-50 transition-opacity duration-300 ${isHolding ? "opacity-0" : "opacity-100"}`}>
          {stories.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                style={{
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Profile Info Overlay - hidden on hold */}
        <div className={`absolute top-5 left-0 right-0 px-4 flex items-center justify-between z-40 bg-gradient-to-b from-black/60 to-transparent pt-2 pb-6 transition-opacity duration-300 ${isHolding ? "opacity-0" : "opacity-100"}`}>
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-zinc-800">
              {profileData?.profile_pic_url_hd ? (
                <FadeInImage
                  src={proxify(profileData.profile_pic_url_hd)}
                  alt="avatar"
                  className="w-full h-full rounded-full"
                  fastLoad={true}
                />
              ) : (
                <User className="w-4 h-4 m-auto text-zinc-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight text-white shadow-sm">
                {profileData?.username || "Instagram User"}
              </span>
              <span className="text-[10px] text-zinc-300 shadow-sm font-mono">
                {activeStory?.taken_at ? new Date(activeStory.taken_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active Story"}
              </span>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors flex items-center gap-1 text-xs font-semibold backdrop-blur-md"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>

        {/* Main Content Stage */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center bg-black">
          {!isHolding && (
            <>
              <div className="absolute inset-y-0 left-0 w-1/4 z-30 cursor-w-resize" onClick={() => handlePrev()} />
              <div className="absolute inset-y-0 right-0 w-3/4 z-30 cursor-e-resize" onClick={() => handleNext()} />
            </>
          )}

          {isVideo ? (
            <video
              ref={videoRef}
              src={activeMediaUrl || undefined}
              autoPlay
              playsInline
              referrerPolicy="no-referrer"
              onError={handleVideoError}
              className="w-full h-full object-contain"
              onEnded={() => handleNext()}
            />
          ) : (
            <img
              src={activeMediaUrl || undefined}
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="w-full h-full object-contain"
              alt="story content"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SavedTabsView({
  savedProfiles,
  savedPosts,
  onSelectProfile,
  onRemoveProfile,
  onSelectPost,
  onRemovePost,
  getMediaUrl,
  proxify,
}: {
  savedProfiles: any[];
  savedPosts: any[];
  onSelectProfile: (u: string) => void;
  onRemoveProfile: (u: string) => void;
  onSelectPost: (p: any) => void;
  onRemovePost: (id: string) => void;
  getMediaUrl: (item: any, thumb?: boolean) => string;
  proxify: (u: string) => string;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"profiles" | "posts">("profiles");

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Sub tabs header */}
      <div className="flex justify-center gap-6 border-b border-[#262626] mb-6">
        <button
          onClick={() => setActiveSubTab("profiles")}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            activeSubTab === "profiles" ? "text-white border-b-2 border-white" : "text-neutral-500 hover:text-white"
          }`}
        >
          Saved Profiles ({savedProfiles.length})
        </button>
        <button
          onClick={() => setActiveSubTab("posts")}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            activeSubTab === "posts" ? "text-white border-b-2 border-white" : "text-neutral-500 hover:text-white"
          }`}
        >
          Saved Posts & Media ({savedPosts.length})
        </button>
      </div>

      {activeSubTab === "profiles" && (
        <div className="w-full">
          {savedProfiles.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 border border-zinc-900 border-dashed rounded-2xl bg-[#121212]/10 max-w-md mx-auto">
              <Bookmark className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-neutral-400">No saved profiles yet.</p>
              <p className="text-xs text-neutral-600 mt-1">Tap "Save Profile" on any user feed to bookmark them here for fast access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {savedProfiles.map((profile) => (
                <div
                  key={profile.username}
                  onClick={() => onSelectProfile(profile.username)}
                  className="bg-[#121212]/50 border border-zinc-900 hover:border-zinc-800 rounded-xl p-4 flex flex-col items-center text-center cursor-pointer relative group transition-all hover:scale-[1.02]"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveProfile(profile.username);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/40 text-neutral-400 hover:text-red-400 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remove Bookmark"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-800 mb-3 shrink-0">
                    {profile.profile_pic_url_hd ? (
                      <FadeInImage src={proxify(profile.profile_pic_url_hd)} className="w-full h-full" alt={profile.username} />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-6 h-6 text-neutral-500" />
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors truncate w-full px-1">
                    {profile.username}
                  </h4>
                  <p className="text-[11px] text-neutral-500 truncate w-full px-1 mt-0.5">
                    {profile.full_name || "Instagram User"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "posts" && (
        <div className="w-full">
          {savedPosts.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 border border-zinc-900 border-dashed rounded-2xl bg-[#121212]/10 max-w-md mx-auto">
              <Bookmark className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-neutral-400">No saved posts yet.</p>
              <p className="text-xs text-neutral-600 mt-1">Tap the bookmark button on any post thumbnail or modal details to save it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {savedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="aspect-[3/4] relative group bg-[#121212] cursor-pointer overflow-hidden rounded-sm hover:-translate-y-0.5 transition-transform duration-300"
                >
                  <FadeInImage
                    src={proxify(getMediaUrl(post, true))}
                    alt={post.caption?.text || "Saved Post"}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute top-2 right-2 text-white drop-shadow-md z-10">
                    {post.media_type === 8 ? (
                      <CarouselIcon className="w-5 h-5 text-white" />
                    ) : post.video_versions ? (
                      <VideoIcon className="w-5 h-5 text-white" />
                    ) : null}
                  </div>

                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReelsImmersiveFeed({
  reels,
  proxify,
  getMediaUrl,
  triggerDownload,
}: any) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (reels.length > 0 && !activeId) {
      setActiveId(reels[0].id || String(reels[0].pk));
    }
  }, [reels, activeId]);

  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      rootMargin: "0px",
      threshold: 0.6, // Must be 60% visible to count as active
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("data-id");
          if (id) {
            setActiveId(id);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Give a short delay to let elements mount
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const items = containerRef.current.querySelectorAll("[data-id]");
        items.forEach((item) => observer.observe(item));
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [reels]);

  if (reels.length === 0) {
    return (
      <div className="py-20 text-center text-[#A8A8A8]">
        No Reels found or account is completely private.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[420px] mx-auto h-[80vh] overflow-y-scroll snap-y snap-mandatory bg-black rounded-3xl border border-zinc-800 shadow-2xl relative scrollbar-thin"
      style={{ scrollbarWidth: "none" }}
    >
      {reels.map((reel, index) => {
        const id = reel.id || String(reel.pk);
        const isActive = activeId === id;
        const videoUrl = reel.video_versions?.[0]?.url;
        const coverUrl = getMediaUrl(reel);

        return (
          <ReelItem
            key={id}
            id={id}
            reel={reel}
            isActive={isActive}
            videoUrl={videoUrl}
            coverUrl={coverUrl}
            proxify={proxify}
            triggerDownload={triggerDownload}
          />
        );
      })}
    </div>
  );
}

function ReelItem({
  id,
  reel,
  isActive,
  videoUrl,
  coverUrl,
  proxify,
  triggerDownload,
}: any) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoUrl) {
      triggerDownload(proxify(videoUrl, true), `reel_${id}.mp4`);
    } else {
      triggerDownload(proxify(coverUrl, true), `reel_${id}.jpg`);
    }
  };

  return (
    <div
      data-id={id}
      className="w-full h-full snap-start snap-always relative flex items-center justify-center bg-zinc-950"
      onClick={togglePlay}
    >
      {/* Background/fallback image */}
      {!isPlaying && (
        <img
          src={proxify(coverUrl)}
          alt="Reel Cover"
          className="absolute inset-0 w-full h-full object-cover opacity-40 z-0 filter blur-sm"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Actual Video */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={proxify(videoUrl)}
          loop
          muted={isMuted}
          playsInline
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain relative z-10"
        />
      ) : (
        <img
          src={proxify(coverUrl)}
          alt="Reel Thumbnail"
          className="w-full h-full object-contain relative z-10"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Interactive controls/overlay on top */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4 pointer-events-none">
        {/* Header toolbar */}
        <div className="flex items-center justify-between w-full pointer-events-auto pt-2">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-red-600 text-[10px] font-extrabold uppercase rounded-full text-white tracking-wider animate-pulse">
              Reel
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white border border-white/10 transition-colors backdrop-blur-md"
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
                <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Play State Indicator Overlay */}
        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 m-auto w-16 h-16 bg-black/40 border border-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Footer info & active quick download */}
        <div className="flex items-end justify-between w-full gap-4 mt-auto">
          <div className="flex flex-col gap-1.5 max-w-[70%]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/20 overflow-hidden flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <span className="text-xs font-bold text-white shadow-sm truncate">
                {reel.user?.username || "instagram_user"}
              </span>
            </div>
            {reel.caption?.text && (
              <p className="text-[11px] text-zinc-200 line-clamp-2 shadow-sm leading-relaxed">
                {reel.caption.text}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 items-center pointer-events-auto">
            <button
              onClick={handleDownload}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
              title="Download Reel"
            >
              <Download className="w-5 h-5" />
            </button>
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-300 shadow-sm">
              Save
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
