import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcrypt";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists for persistent storage
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "xianweilu.db"));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    content TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT UNIQUE,
    plan TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS saved_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    content TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  
  // Session configuration for iframe compatibility
  app.use(session({
    secret: process.env.SESSION_SECRET || "xianweilu-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,      // Required for SameSite=None
      sameSite: 'none',  // Required for cross-origin iframe
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  const PORT = process.env.PORT || 3000;

  // --- Auth Routes ---
  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
      const user = { id: info.lastInsertRowid, username };
      (req.session as any).user = user;
      res.json({ success: true, user });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "用户名已存在" });
      } else {
        res.status(500).json({ error: "注册失败" });
      }
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (user && await bcrypt.compare(password, user.password)) {
      const sessionUser = { id: user.id, username: user.username };
      (req.session as any).user = sessionUser;
      res.json({ success: true, user: sessionUser });
    } else {
      res.status(401).json({ error: "用户名或密码错误" });
    }
  });

  app.get("/api/me", (req, res) => {
    res.json((req.session as any).user || null);
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // --- Usage & Quota ---
  app.get("/api/usage", (req, res) => {
    const user = (req.session as any).user;
    if (!user) return res.json({ count: 0, limit: 3 });
    
    const row: any = db.prepare(`
      SELECT COUNT(*) as count 
      FROM usage_logs 
      WHERE user_id = ? AND date(created_at) = date('now')
    `).get(user.id);
    
    res.json({ count: row.count, limit: 3 });
  });

  app.post("/api/usage/log", (req, res) => {
    const user = (req.session as any).user;
    if (user) {
      db.prepare("INSERT INTO usage_logs (user_id, action) VALUES (?, ?)").run(user.id, "generate_recipe");
    }
    res.json({ success: true });
  });

  // --- Recipe Saving ---
  app.get("/api/saved-recipes", (req, res) => {
    const user = (req.session as any).user;
    if (!user) return res.status(401).json({ error: "请先登录" });
    
    const recipes = db.prepare("SELECT * FROM saved_recipes WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
    res.json(recipes);
  });

  app.post("/api/saved-recipes", (req, res) => {
    const user = (req.session as any).user;
    if (!user) return res.status(401).json({ error: "请先登录" });
    
    const { title, content, image_url } = req.body;
    db.prepare("INSERT INTO saved_recipes (user_id, title, content, image_url) VALUES (?, ?, ?, ?)").run(user.id, title, content, image_url);
    res.json({ success: true });
  });

  // --- Content Routes ---
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 20").all();
    res.json(posts);
  });

  app.post("/api/posts", (req, res) => {
    const user = (req.session as any).user;
    if (!user) return res.status(401).json({ error: "请先登录" });
    
    const { content, image_url } = req.body;
    const info = db.prepare("INSERT INTO posts (user_id, username, content, image_url) VALUES (?, ?, ?, ?)").run(user.id, user.username, content, image_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/subscription/:email", (req, res) => {
    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_email = ?").get(req.params.email);
    res.json(sub || { status: "none" });
  });

  app.post("/api/subscribe", (req, res) => {
    const { email, plan } = req.body;
    db.prepare("INSERT OR REPLACE INTO subscriptions (user_email, plan, status) VALUES (?, ?, ?)").run(email, plan, "active");
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
