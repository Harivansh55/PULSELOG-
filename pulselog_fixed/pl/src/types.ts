export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
  email_verified: boolean;
  created_at: string;
}

export type ChangelogCategory = 'New' | 'Improved' | 'Fixed' | 'Maintenance';
export type ChangelogStatus = 'Draft' | 'Published';

export interface ReactionCounts {
  heart: number;
  celebrate: number;
  rocket: number;
}

export interface ChangelogItem {
  id: number;
  title: string;
  slug: string;
  content_markdown: string;
  category: ChangelogCategory;
  cover_image: string | null;
  status: ChangelogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  reactions: ReactionCounts;
  user_reactions: string[];
}

export interface UnreadNotificationData {
  unread_count: number;
  last_viewed_at: string | null;
}

export interface JSONFeedItem {
  id: string;
  url: string;
  title: string;
  content_html: string;
  content_text: string;
  date_published: string;
  tags?: string[];
  _pulselog_markdown?: string;
}

export interface JSONFeedResponse {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  items: JSONFeedItem[];
}
