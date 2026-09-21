# PulseLog — Changelog & Product Updates Platform

A modern, full-stack product changelog and release notes hub built with **React 19**, **Vite**, **Express**, **Tailwind CSS**, and **TypeScript**.

PulseLog provides a public release feed with live search, category filtering, emoji reactions, email subscriber simulation, and unread badges, paired with a full-featured **Admin Studio** featuring a real-time Markdown editor, live preview, cover image upload (multipart + base64 fallback), and publishing controls.

---

## 🚀 Quick Start for Local Computer

### 1. Prerequisites

Ensure you have installed on your local computer:
- **Node.js**: v18.0.0 or higher (v20+ or v22+ recommended)
- **npm** (comes with Node.js) or **bun** / **pnpm** / **yarn**

Verify with:
```bash
node -v
npm -v
```

---

### 2. Clone & Install Dependencies

1. Navigate to the project root directory:
   ```bash
   cd pulselog
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

---

### 3. Environment Variables (Optional)

Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | Port for the Express + Vite server | `3000` |
| `GEMINI_API_KEY` | Optional | Gemini API key for smart AI release summaries | — |
| `APP_URL` | Optional | Base URL for RSS and JSON syndication feeds | `http://localhost:3000` |

*(The application will run immediately out of the box even without any environment variables configured!)*

---

### 4. Run the Development Server

Start the full-stack dev server (Express backend + Vite client middleware via `tsx`):

```bash
npm run dev
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Default Accounts & Access

PulseLog comes pre-seeded with sample changelogs and an administrator account:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@pulselog.dev` | `AdminPass123!` | Create, edit, draft, publish, delete changelogs, upload cover images |
| **Public Visitor** | *(No login required)* | *(None)* | Read feed, search, filter categories, react with emojis, subscribe |

> 💡 **Quick 1-Click Login:** Click the **"Admin Demo"** button located in the top navigation bar to log in as admin instantly!

---

## 🛠️ Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the unified Express + Vite development server on `http://localhost:3000` |
| `npm run build` | Compiles client assets (`dist/`) and bundles `server.ts` into `dist/server.cjs` |
| `npm run start` | Runs the production CommonJS server (`node dist/server.cjs`) |
| `npm run lint` | Typechecks the entire TypeScript codebase (`tsc --noEmit`) |
| `npm run clean` | Cleans up the `dist/` directory and temporary artifacts |

---

## 🌟 Key Features

### 📢 Public Feed
- **Instant Search & Highlighting**: Filter releases in real-time by title, slug, or markdown content.
- **Category Filter Pills**: Quick filter by `All`, `New`, `Improved`, `Fixed`, or `Maintenance`.
- **Interactive Emoji Reactions**: Real-time reaction counters (❤️ Heart, 🎉 Celebrate, 🚀 Rocket) with optimistic updates.
- **Unread Notification Badge**: Keeps track of latest releases and marks them as read when reviewed.
- **Syndication Feeds**:
  - RSS 2.0 XML Feed: `http://localhost:3000/api/v1/rss.xml`
  - JSON Feed: `http://localhost:3000/api/v1/feed.json`
- **Dark Mode Support**: Seamless toggle between light and dark themes with persistent preference.

### ✍️ Admin Studio
- **Markdown Editor**: Write with syntax highlighting, bullet lists, blockquotes, and code snippets.
- **Split-Screen Live Preview**: Instant visual preview rendering as you type.
- **Cover Image Management**:
  - Drag-and-drop file upload (up to 5MB)
  - One-click preset banner artwork
  - External URL embedding
  - Direct clipboard pasting (<kbd>Ctrl</kbd>+<kbd>V</kbd>)
- **Draft & Publish Lifecycle**: Toggle between `Published` (instantly visible on public timeline) and `Draft` (admin preview only).
- **Edit & Permanent Delete**: Full CRUD lifecycle for product announcements.

---

## 📁 Project Architecture

```text
├── index.html               # Main HTML entry point
├── package.json             # Scripts & dependencies
├── server.ts                # Express backend server with Vite middleware
├── pulselog_data.json       # Local JSON persistence store
├── uploads/                 # Local storage directory for uploaded cover images
├── src/
│   ├── main.tsx             # React DOM entry point
│   ├── App.tsx              # Primary application orchestrator & timeline view
│   ├── types.ts             # Shared TypeScript definitions
│   ├── api/
│   │   └── client.ts        # Typed fetch client with Bearer token & refresh handling
│   ├── context/
│   │   ├── AuthContext.tsx  # User authentication, roles, & session persistence
│   │   └── ThemeContext.tsx # Light / Dark mode state management
│   ├── components/
│   │   ├── Header.tsx       # Navigation bar, search input, Admin Demo button
│   │   ├── ChangelogCard.tsx# Release display card with Markdown rendering & reactions
│   │   ├── AdminStudio.tsx  # Admin release editor, cover art uploader, & manager
│   │   ├── AuthModal.tsx    # Login & Signup modal dialog
│   │   ├── SubscribeModal.tsx# Newsletter & update subscriber modal
│   │   └── Toast.tsx        # Toast notification system
│   └── server/
│       └── store.ts         # Persistent data store (users, sessions, changelogs)
```

---

## ⚙️ Data Persistence

By default, local data is automatically persisted to `pulselog_data.json` at the root of the project. Any changelog you create or status you modify in the Admin Studio will remain intact across server restarts.

To reset the database back to clean seed data:
1. Stop the server (`Ctrl + C`)
2. Delete `pulselog_data.json`
3. Restart `npm run dev` (PulseLog will automatically re-seed fresh initial data)

---

## ❓ Troubleshooting

### Port 3000 is already in use
If port `3000` is occupied by another local service, you can run the server on a different port:
```bash
PORT=3001 npm run dev
```
*(On Windows PowerShell: `$env:PORT=3001; npm run dev`)*

### Image uploads fail or permission issues
PulseLog stores uploaded files locally in the `uploads/` directory. Ensure the process has write permissions to this directory. The server automatically creates the directory on startup if it doesn't exist.

---

## 📄 License
MIT License. Feel free to customize and use this project for your own products and apps!
