import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("xianweilu.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    content TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT UNIQUE,
    plan TEXT,
    status TEXT
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  // API Routes
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 20").all();
    res.json(posts);
  });

  app.post("/api/posts", (req, res) => {
    const { username, content, image_url } = req.body;
    const info = db.prepare("INSERT INTO posts (username, content, image_url) VALUES (?, ?, ?)").run(username, content, image_url);
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
