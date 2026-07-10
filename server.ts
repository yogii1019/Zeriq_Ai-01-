import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Controllers
import { UserController } from "./src/backend/controllers/UserController";
import { CourseController } from "./src/backend/controllers/CourseController";
import { NoteController } from "./src/backend/controllers/NoteController";
import { ChatController } from "./src/backend/controllers/ChatController";
import { ProgressController } from "./src/backend/controllers/ProgressController";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payloads and URL encoding
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Debug logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // REST API controllers
  const userCtrl = new UserController();
  const courseCtrl = new CourseController();
  const noteCtrl = new NoteController();
  const chatCtrl = new ChatController();
  const progressCtrl = new ProgressController();

  // Mount API Routers
  app.use("/api/users", userCtrl.router);
  app.use("/api/courses", courseCtrl.router);
  app.use("/api/notes", noteCtrl.router);
  app.use("/api/chat", chatCtrl.router);
  app.use("/api/progress", progressCtrl.router);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Handle Frontend Serving with Vite Middleware (Dev) or Static Files (Prod)
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with compiled static serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ZeriqAI Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup failure:", err);
});
