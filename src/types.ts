export interface MediaCandidate {
  url: string;
  width: number;
  height: number;
}

export interface VideoVersion {
  url: string;
  type: number;
}

export interface PostNode {
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
  savedAt?: number;
}

export interface ProfileData {
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

export interface CacheEntry {
  profileData: ProfileData | null;
  posts: PostNode[];
  stories: any[];
  highlights: any[];
  nextPageCursor: string | null;
  timestamp: number;
}
