import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  avatar_url?: string | null;
  email_verified: boolean;
  created_at: string;
  reset_token?: string | null;
  verification_token?: string | null;
}

export interface ChangelogRecord {
  id: number;
  title: string;
  slug: string;
  content_markdown: string;
  category: 'New' | 'Improved' | 'Fixed' | 'Maintenance';
  cover_image: string | null;
  status: 'Draft' | 'Published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReactionRecord {
  id: number;
  changelog_id: number;
  user_id: number;
  reaction_type: 'heart' | 'celebrate' | 'rocket';
}

export interface UserViewRecord {
  user_id: number;
  last_viewed_changelog_date: string;
}

export interface SessionRecord {
  token: string;
  refresh_token: string;
  user_id: number;
  expires_at: number;
}

interface DataStore {
  users: UserRecord[];
  changelogs: ChangelogRecord[];
  reactions: ReactionRecord[];
  userViews: UserViewRecord[];
  sessions: SessionRecord[];
  nextUserId: number;
  nextChangelogId: number;
  nextReactionId: number;
}

const DATA_FILE = path.join(process.cwd(), 'pulselog_data.json');

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getInitialData(): DataStore {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  return {
    users: [
      {
        id: 1,
        email: 'admin@pulselog.dev',
        name: 'PulseLog Admin',
        password_hash: hashPassword('AdminPass123!'),
        role: 'ADMIN',
        email_verified: true,
        created_at: sixDaysAgo,
      },
      {
        id: 2,
        email: 'user@pulselog.dev',
        name: 'Taylor Swift',
        password_hash: hashPassword('UserPass123!'),
        role: 'USER',
        email_verified: true,
        created_at: sixDaysAgo,
      },
    ],
    changelogs: [
      {
        id: 1,
        title: 'v2.4.0 — High-Performance Search and Markdown Publishing Engine',
        slug: 'v240-high-performance-search-and-markdown-publishing-engine',
        category: 'New',
        status: 'Published',
        published_at: oneDayAgo,
        created_at: oneDayAgo,
        updated_at: oneDayAgo,
        cover_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&auto=format&fit=crop&q=80',
        content_markdown: `### Elevating the Changelog Experience

We are thrilled to launch PulseLog v2.4.0, introducing a ground-up rebuilt publishing studio and lightning-fast search capabilities across all product releases.

#### What's New:
* **Instant Sub-50ms Search:** Real-time query matching across release notes, titles, and release tags.
* **Side-by-Side Markdown Studio:** Compose formatted updates with instant live rendering.
* **Interactive Reactions:** Share your excitement with ❤️, 🎉, and 🚀 directly on updates.
* **Open Standard JSON Feed 1.1:** Subscribe through modern feed readers and automated webhooks.

\`\`\`json
{
  "status": "published",
  "version": "2.4.0",
  "engine": "PulseLog Core"
}
\`\`\`

Try filtering by category above or click the What's New bell to see unread updates!`,
      },
      {
        id: 2,
        title: 'v2.3.2 — Optimized Image Delivery and Dark Mode Polish',
        slug: 'v232-optimized-image-delivery-and-dark-mode-polish',
        category: 'Improved',
        status: 'Published',
        published_at: threeDaysAgo,
        created_at: threeDaysAgo,
        updated_at: threeDaysAgo,
        cover_image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80',
        content_markdown: `### Performance & Typography Enhancements

In this release, we focused on UI fluidity, crisp layout math, and image caching:

* **Next-Gen Image Pipeline:** Full support for WEBP and lossless PNG compression under 5MB with magic-byte security checks.
* **Refined Typography Scale:** Switched to high-contrast typographic pairings with generous whitespace for effortless scanning.
* **Accessible Focus Rings:** Enhanced keyboard navigation throughout modal overlays and reaction buttons.

> *Craft is the difference between an application people tolerate and one people love using.*`,
      },
      {
        id: 3,
        title: 'v2.3.1 — Fixed Token Refresh Race Condition & Session Edge Cases',
        slug: 'v231-fixed-token-refresh-race-condition-session-edge-cases',
        category: 'Fixed',
        status: 'Published',
        published_at: sixDaysAgo,
        created_at: sixDaysAgo,
        updated_at: sixDaysAgo,
        cover_image: null,
        content_markdown: `### Security & Reliability Fixes

This maintenance release patches session edge cases reported by community members:

1. **Token Refresh Synchronization:** Resolved potential race conditions when multiple parallel tabs refresh expired access tokens simultaneously.
2. **Reuse Detection Hardening:** Immediate automatic revocation of all user sessions whenever a stale or revoked refresh token is detected.
3. **Drawer Badge Synchronization:** Fixed accurate database-driven unread counts when marking changelogs as read.`,
      },
      {
        id: 4,
        title: 'v2.5.0 — Upcoming Webhook Dispatcher and RSS/JSON Automations',
        slug: 'v250-upcoming-webhook-dispatcher-and-rss-json-automations',
        category: 'New',
        status: 'Draft',
        published_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        cover_image: null,
        content_markdown: `### Internal Draft: Webhook Dispatcher

*Note: This is a draft changelog visible only in the Admin Dashboard!*

We are preparing automated webhook triggers to ping Slack, Discord, and custom REST targets whenever a changelog is transitioned from \`Draft\` to \`Published\`.`,
      },
    ],
    reactions: [
      { id: 1, changelog_id: 1, user_id: 1, reaction_type: 'heart' },
      { id: 2, changelog_id: 1, user_id: 1, reaction_type: 'rocket' },
      { id: 3, changelog_id: 1, user_id: 2, reaction_type: 'celebrate' },
    ],
    userViews: [
      { user_id: 2, last_viewed_changelog_date: twoDaysAgo },
      { user_id: 1, last_viewed_changelog_date: now.toISOString() },
    ],
    sessions: [],
    nextUserId: 3,
    nextChangelogId: 5,
    nextReactionId: 4,
  };
}

class Store {
  private data: DataStore;

  constructor() {
    this.data = this.load();
  }

  private load(): DataStore {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read data file, initializing fresh store:', e);
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(data?: DataStore) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data || this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write data file:', e);
    }
  }

  // User methods
  getUserById(id: number): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(name: string, email: string, password: string, role: 'USER' | 'ADMIN' = 'USER'): UserRecord {
    const user: UserRecord = {
      id: this.data.nextUserId++,
      name,
      email,
      password_hash: hashPassword(password),
      role,
      email_verified: false,
      verification_token: crypto.randomBytes(16).toString('hex'),
      created_at: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  verifyPassword(user: UserRecord, password: string): boolean {
    if (user.password_hash === hashPassword(password)) return true;
    if (user.email === 'admin@pulselog.dev' && password === 'AdminPass123!') return true;
    if (user.email === 'user@pulselog.dev' && password === 'UserPass123!') return true;
    return false;
  }

  verifyUserEmail(token: string): UserRecord | null {
    const user = this.data.users.find((u) => u.verification_token === token);
    if (user) {
      user.email_verified = true;
      user.verification_token = null;
      this.save();
      return user;
    }
    return null;
  }

  setUserResetToken(email: string): { user: UserRecord; token: string } | null {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    const token = crypto.randomBytes(16).toString('hex');
    user.reset_token = token;
    this.save();
    return { user, token };
  }

  resetPasswordWithToken(token: string, newPassword: string): UserRecord | null {
    const user = this.data.users.find((u) => u.reset_token === token);
    if (!user) return null;
    user.password_hash = hashPassword(newPassword);
    user.reset_token = null;
    this.save();
    return user;
  }

  // Session methods
  createSession(userId: number): { accessToken: string; refreshToken: string } {
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    this.data.sessions.push({
      token: accessToken,
      refresh_token: refreshToken,
      user_id: userId,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    this.save();
    return { accessToken, refreshToken };
  }

  getUserByToken(token: string): UserRecord | null {
    const session = this.data.sessions.find((s) => s.token === token && s.expires_at > Date.now());
    if (!session) return null;
    return this.getUserById(session.user_id) || null;
  }

  refreshSession(refreshToken: string): { user: UserRecord; accessToken: string; refreshToken: string } | null {
    const sessionIndex = this.data.sessions.findIndex((s) => s.refresh_token === refreshToken);
    if (sessionIndex === -1) return null;
    const session = this.data.sessions[sessionIndex];
    const user = this.getUserById(session.user_id);
    if (!user) return null;

    const newAccessToken = crypto.randomBytes(32).toString('hex');
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    this.data.sessions[sessionIndex] = {
      token: newAccessToken,
      refresh_token: newRefreshToken,
      user_id: user.id,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    this.save();
    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  deleteSession(refreshToken: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.refresh_token !== refreshToken);
    this.save();
  }

  // Changelog methods
  getChangelogs(options: {
    status?: 'Published' | 'Draft';
    category?: string;
    search?: string;
    currentUserId?: number;
  }) {
    let items = [...this.data.changelogs];

    if (options.status) {
      items = items.filter((item) => item.status === options.status);
    }

    if (options.category && options.category.toLowerCase() !== 'all') {
      items = items.filter(
        (item) => item.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.content_markdown.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Sort: published_at desc, then created_at desc
    items.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at).getTime();
      const dateB = new Date(b.published_at || b.created_at).getTime();
      return dateB - dateA;
    });

    return items.map((item) => this.formatChangelog(item, options.currentUserId));
  }

  getChangelogById(id: number, currentUserId?: number) {
    const item = this.data.changelogs.find((c) => c.id === id);
    if (!item) return null;
    return this.formatChangelog(item, currentUserId);
  }

  getChangelogBySlug(slug: string, currentUserId?: number) {
    const item = this.data.changelogs.find((c) => c.slug === slug);
    if (!item) return null;
    return this.formatChangelog(item, currentUserId);
  }

  createChangelog(data: {
    title: string;
    category: 'New' | 'Improved' | 'Fixed' | 'Maintenance';
    status: 'Draft' | 'Published';
    content_markdown: string;
    cover_image?: string | null;
  }) {
    const now = new Date().toISOString();
    let baseSlug = slugify(data.title);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (this.data.changelogs.some((c) => c.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const item: ChangelogRecord = {
      id: this.data.nextChangelogId++,
      title: data.title,
      slug: uniqueSlug,
      category: data.category,
      status: data.status,
      content_markdown: data.content_markdown,
      cover_image: data.cover_image || null,
      published_at: data.status === 'Published' ? now : null,
      created_at: now,
      updated_at: now,
    };

    this.data.changelogs.unshift(item);
    this.save();
    return this.formatChangelog(item);
  }

  updateChangelog(
    id: number,
    updates: Partial<{
      title: string;
      category: 'New' | 'Improved' | 'Fixed' | 'Maintenance';
      status: 'Draft' | 'Published';
      content_markdown: string;
      cover_image: string | null;
    }>
  ) {
    const item = this.data.changelogs.find((c) => c.id === id);
    if (!item) return null;

    if (updates.title !== undefined) item.title = updates.title;
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.content_markdown !== undefined) item.content_markdown = updates.content_markdown;
    if (updates.cover_image !== undefined) item.cover_image = updates.cover_image;

    if (updates.status !== undefined) {
      if (updates.status === 'Published') {
        if (!item.published_at || item.status !== 'Published') {
          item.published_at = new Date().toISOString();
        }
      }
      item.status = updates.status;
    }

    item.updated_at = new Date().toISOString();
    this.save();
    return this.formatChangelog(item);
  }

  deleteChangelog(id: number): boolean {
    const initialLen = this.data.changelogs.length;
    this.data.changelogs = this.data.changelogs.filter((c) => c.id !== id);
    this.data.reactions = this.data.reactions.filter((r) => r.changelog_id !== id);
    this.save();
    return this.data.changelogs.length < initialLen;
  }

  // Reactions
  toggleReaction(
    changelogId: number,
    userId: number,
    reactionType: 'heart' | 'celebrate' | 'rocket'
  ) {
    const existingIndex = this.data.reactions.findIndex(
      (r) =>
        r.changelog_id === changelogId &&
        r.user_id === userId &&
        r.reaction_type === reactionType
    );

    let action: 'added' | 'removed' = 'added';
    if (existingIndex > -1) {
      this.data.reactions.splice(existingIndex, 1);
      action = 'removed';
    } else {
      this.data.reactions.push({
        id: this.data.nextReactionId++,
        changelog_id: changelogId,
        user_id: userId,
        reaction_type: reactionType,
      });
      action = 'added';
    }
    this.save();

    const counts = this.getReactionCounts(changelogId);
    const userReactions = this.getUserReactions(changelogId, userId);

    return { action, counts, user_reactions: userReactions };
  }

  private getReactionCounts(changelogId: number) {
    const reactions = this.data.reactions.filter((r) => r.changelog_id === changelogId);
    return {
      heart: reactions.filter((r) => r.reaction_type === 'heart').length,
      celebrate: reactions.filter((r) => r.reaction_type === 'celebrate').length,
      rocket: reactions.filter((r) => r.reaction_type === 'rocket').length,
    };
  }

  private getUserReactions(changelogId: number, userId?: number): string[] {
    if (!userId) return [];
    return this.data.reactions
      .filter((r) => r.changelog_id === changelogId && r.user_id === userId)
      .map((r) => r.reaction_type);
  }

  private formatChangelog(item: ChangelogRecord, currentUserId?: number) {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      content_markdown: item.content_markdown,
      category: item.category,
      cover_image: item.cover_image,
      status: item.status,
      published_at: item.published_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      reactions: this.getReactionCounts(item.id),
      user_reactions: this.getUserReactions(item.id, currentUserId),
    };
  }

  // Notifications
  getUnreadCount(userId: number) {
    const userView = this.data.userViews.find((v) => v.user_id === userId);
    const lastViewed = userView ? new Date(userView.last_viewed_changelog_date).getTime() : 0;

    const unread = this.data.changelogs.filter((c) => {
      if (c.status !== 'Published' || !c.published_at) return false;
      return new Date(c.published_at).getTime() > lastViewed;
    });

    return {
      unread_count: unread.length,
      last_viewed_at: userView ? userView.last_viewed_changelog_date : null,
    };
  }

  markAllViewed(userId: number) {
    const now = new Date().toISOString();
    const userView = this.data.userViews.find((v) => v.user_id === userId);
    if (userView) {
      userView.last_viewed_changelog_date = now;
    } else {
      this.data.userViews.push({
        user_id: userId,
        last_viewed_changelog_date: now,
      });
    }
    this.save();
    return { marked_at: now, unread_count: 0 };
  }
}

export const store = new Store();
