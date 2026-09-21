import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { store, UserRecord } from './src/server/store';

// Extend Express Request for authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Static uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Multer configuration for image uploads
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      const cleanName = path.basename(file.originalname, ext).replace(/[^\w-]/g, '_');
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // Auth helper middleware
  const extractUser = (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.access_token;
    if (token) {
      const user = store.getUserByToken(token);
      if (user) {
        req.user = user;
      }
    }
    next();
  };

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Please log in.', code: 'UNAUTHORIZED' },
      });
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required.', code: 'FORBIDDEN' },
      });
    }
    next();
  };

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  // Health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'pulselog-api' });
  });

  // -------------------------
  // Auth Routes
  // -------------------------

  app.post('/api/v1/auth/signup', (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and password are required', code: 'VALIDATION_ERROR' },
      });
    }

    const existing = store.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists.', code: 'USER_EXISTS' },
      });
    }

    const user = store.createUser(name, email, password);
    const { accessToken, refreshToken } = store.createSession(user.id);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          email_verified: user.email_verified,
          created_at: user.created_at,
        },
        dev_verification_token: user.verification_token,
        dev_verification_link: `/verify-email?token=${user.verification_token}`,
      },
    });
  });

  app.post('/api/v1/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' },
      });
    }

    const user = store.getUserByEmail(email);
    if (!user || !store.verifyPassword(user, password)) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' },
      });
    }

    const { accessToken, refreshToken } = store.createSession(user.id);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
    });
  });

  app.post('/api/v1/auth/refresh', (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token missing', code: 'UNAUTHORIZED' },
      });
    }

    const refreshed = store.refreshSession(refreshToken);
    if (!refreshed) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      return res.status(401).json({
        success: false,
        error: { message: 'Session expired. Please log in again.', code: 'UNAUTHORIZED' },
      });
    }

    res.cookie('access_token', refreshed.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshed.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        user: {
          id: refreshed.user.id,
          email: refreshed.user.email,
          name: refreshed.user.name,
          role: refreshed.user.role,
          email_verified: refreshed.user.email_verified,
          created_at: refreshed.user.created_at,
        },
      },
    });
  });

  app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      store.deleteSession(refreshToken);
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/api/v1/auth/me', extractUser, (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          email_verified: req.user.email_verified,
          created_at: req.user.created_at,
        },
      },
    });
  });

  app.get('/api/v1/auth/verify-email', (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Verification token required', code: 'INVALID_TOKEN' },
      });
    }

    const user = store.verifyUserEmail(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired verification token', code: 'INVALID_TOKEN' },
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          email_verified: user.email_verified,
          created_at: user.created_at,
        },
      },
    });
  });

  app.post('/api/v1/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body;
    const result = store.setUserResetToken(email);
    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been dispatched.',
      data: result
        ? {
            dev_reset_token: result.token,
            dev_reset_link: `/reset-password?token=${result.token}`,
          }
        : {},
    });
  });

  app.post('/api/v1/auth/reset-password', (req: Request, res: Response) => {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token and new password required', code: 'VALIDATION_ERROR' },
      });
    }

    const user = store.resetPasswordWithToken(token, new_password);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired reset token', code: 'INVALID_TOKEN' },
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You may now log in.',
    });
  });

  // -------------------------
  // Public Changelog Routes
  // -------------------------

  app.get('/api/v1/changelog', extractUser, (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const items = store.getChangelogs({
      status: 'Published',
      category,
      search,
      currentUserId: req.user?.id,
    });

    res.json({
      success: true,
      data: items,
    });
  });

  app.get('/api/v1/changelog/by-slug/:slug', extractUser, (req: Request, res: Response) => {
    const item = store.getChangelogBySlug(req.params.slug, req.user?.id);
    if (!item || item.status !== 'Published') {
      return res.status(404).json({
        success: false,
        error: { message: 'Changelog not found', code: 'NOT_FOUND' },
      });
    }
    res.json({
      success: true,
      data: item,
    });
  });

  // JSON Feed 1.1 Route
  app.get('/api/v1/changelog/feed', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const published = store.getChangelogs({ status: 'Published' });

    const feedItems = published.map((item) => {
      const pubDate = item.published_at ? new Date(item.published_at).toISOString() : new Date(item.created_at).toISOString();
      return {
        id: String(item.id),
        url: `${baseUrl}/#changelog-${item.slug}`,
        title: item.title,
        content_html: item.content_markdown
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\n/gim, '<br/>'),
        content_text: item.content_markdown.slice(0, 300) + (item.content_markdown.length > 300 ? '...' : ''),
        date_published: pubDate,
        tags: [item.category],
        _pulselog_markdown: item.content_markdown,
      };
    });

    res.json({
      version: 'https://jsonfeed.org/version/1.1',
      title: 'PulseLog — Changelog & Product Updates Hub',
      home_page_url: baseUrl,
      feed_url: `${baseUrl}/api/v1/changelog/feed`,
      description: 'The latest product announcements, improvements, and fixes.',
      items: feedItems,
    });
  });

  // Reactions
  app.post(
    '/api/v1/changelog/:id/reaction',
    extractUser,
    requireAuth,
    (req: Request, res: Response) => {
      const changelogId = parseInt(req.params.id, 10);
      const { reaction_type } = req.body;
      if (!['heart', 'celebrate', 'rocket'].includes(reaction_type)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid reaction type', code: 'INVALID_REACTION' },
        });
      }

      const changelog = store.getChangelogById(changelogId);
      if (!changelog) {
        return res.status(404).json({
          success: false,
          error: { message: 'Changelog not found', code: 'NOT_FOUND' },
        });
      }

      const result = store.toggleReaction(changelogId, req.user!.id, reaction_type);
      res.json({
        success: true,
        data: result,
      });
    }
  );

  // -------------------------
  // Notifications Routes
  // -------------------------

  app.get(
    '/api/v1/notifications/unread-count',
    extractUser,
    requireAuth,
    (req: Request, res: Response) => {
      const data = store.getUnreadCount(req.user!.id);
      res.json({
        success: true,
        data,
      });
    }
  );

  app.post(
    '/api/v1/notifications/mark-viewed',
    extractUser,
    requireAuth,
    (req: Request, res: Response) => {
      const data = store.markAllViewed(req.user!.id);
      res.json({
        success: true,
        data,
      });
    }
  );

  // -------------------------
  // Admin Routes
  // -------------------------

  app.get(
    '/api/v1/admin/changelogs',
    extractUser,
    requireAdmin,
    (_req: Request, res: Response) => {
      const items = store.getChangelogs({});
      res.json({
        success: true,
        data: items,
      });
    }
  );

  app.post(
    '/api/v1/admin/changelogs',
    extractUser,
    requireAdmin,
    (req: Request, res: Response) => {
      const { title, category, status, content_markdown, cover_image } = req.body;
      if (!title || !category || !status || !content_markdown) {
        return res.status(400).json({
          success: false,
          error: { message: 'Title, category, status, and content_markdown are required', code: 'VALIDATION_ERROR' },
        });
      }

      const item = store.createChangelog({
        title,
        category,
        status,
        content_markdown,
        cover_image,
      });

      res.status(201).json({
        success: true,
        message: 'Changelog created successfully',
        data: item,
      });
    }
  );

  app.get(
    '/api/v1/admin/changelogs/:id',
    extractUser,
    requireAdmin,
    (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const item = store.getChangelogById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: { message: 'Changelog not found', code: 'NOT_FOUND' },
        });
      }
      res.json({
        success: true,
        data: item,
      });
    }
  );

  app.put(
    '/api/v1/admin/changelogs/:id',
    extractUser,
    requireAdmin,
    (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const item = store.updateChangelog(id, req.body);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: { message: 'Changelog not found', code: 'NOT_FOUND' },
        });
      }
      res.json({
        success: true,
        message: 'Changelog updated successfully',
        data: item,
      });
    }
  );

  app.delete(
    '/api/v1/admin/changelogs/:id',
    extractUser,
    requireAdmin,
    (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const deleted = store.deleteChangelog(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { message: 'Changelog not found', code: 'NOT_FOUND' },
        });
      }
      res.json({
        success: true,
        message: 'Changelog deleted successfully',
      });
    }
  );

  // Admin image upload (supports multipart/form-data AND base64 JSON payload)
  app.post(
    '/api/v1/admin/upload',
    extractUser,
    requireAdmin,
    (req: Request, res: Response, next: NextFunction) => {
      // Check if uploaded as JSON base64 data_url
      if (req.is('application/json') || (req.body && (req.body.data_url || req.body.image_base64))) {
        try {
          const dataUrl = req.body.data_url || req.body.image_base64;
          if (!dataUrl || typeof dataUrl !== 'string') {
            return res.status(400).json({
              success: false,
              error: { message: 'Invalid image data payload', code: 'INVALID_DATA' },
            });
          }

          // Extract mime and base64
          const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          let ext = '.png';
          let base64Data = dataUrl;

          if (matches && matches.length === 3) {
            ext = `.${matches[1] === 'jpeg' ? 'jpg' : matches[1]}`;
            base64Data = matches[2];
          }

          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({
              success: false,
              error: { message: 'Image exceeds 5MB limit', code: 'FILE_TOO_LARGE' },
            });
          }

          const filename = `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, buffer);

          const fileUrl = `/uploads/${filename}`;
          return res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
              url: fileUrl,
              filename,
            },
          });
        } catch (err: any) {
          return res.status(500).json({
            success: false,
            error: { message: err.message || 'Failed to save base64 image', code: 'SERVER_ERROR' },
          });
        }
      }

      // Handle standard multipart form upload with graceful error catching
      upload.single('file')(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({
            success: false,
            error: { message: err.message || 'Multer file upload error', code: 'UPLOAD_ERROR' },
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: { message: 'No file uploaded or file field missing', code: 'MISSING_FILE' },
          });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        return res.json({
          success: true,
          message: 'Image uploaded successfully',
          data: {
            url: fileUrl,
            filename: req.file.filename,
          },
        });
      });
    }
  );

  // -------------------------------------------------------------
  // Vite Integration (Dev) & Static Serving (Prod)
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseLog server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
