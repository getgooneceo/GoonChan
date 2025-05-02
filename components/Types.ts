// Define all shared types for the GoonChan application

/**
 * Comment type representing a user comment on a video
 */
export interface CommentType {
  id: number;
  username: string;
  avatar: string;
  content: string;
  likes: number;
  timeAgo: string;
  replies?: CommentType[];
}

/**
 * Video type representing a video in the system
 */
export interface VideoType {
  id: number;
  title: string;
  thumbnail?: string;
  duration: string;
  views: number;
  uploader: string;
  videoUrl?: string;
  uploadDate?: string;
  description?: string;
  subscriberCount?: number;
  likeCount?: number;
  dislikeCount?: number;
  comments?: CommentType[];
  tags?: string[];
}

/**
 * User type representing a registered user
 */
export interface UserType {
  id: number;
  username: string;
  avatar: string;
  subscriberCount: number;
  isVerified: boolean;
  joinDate: string;
}

/**
 * Category type for navigation and video filtering
 */
export interface CategoryType {
  id: number;
  name: string;
  icon: React.ReactNode;
}

/**
 * Notification type for user notifications
 */
export interface NotificationType {
  id: number;
  type: 'like' | 'comment' | 'subscribe' | 'mention';
  fromUser: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  videoId?: number;
}