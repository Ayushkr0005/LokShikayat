import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "enterprise-secret-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(helmet({
    contentSecurityPolicy: false, // Disable for Vite dev
  }));
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  // --- API Routes ---

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Multi-tenancy Isolation Middleware
  const tenantIsolation = (req: any, res: any, next: any) => {
    const orgId = req.headers["x-organization-id"];
    if (!orgId && !req.path.startsWith("/api/auth")) {
      return res.status(403).json({ error: "Organization ID missing" });
    }
    req.organizationId = orgId;
    next();
  };

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    // In a real app, verify against DB
    const token = jwt.sign({ email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  });

  // Billing Routes (Skeleton)
  app.get("/api/billing/usage", tenantIsolation, (req: any, res) => {
    res.json({
      organizationId: req.organizationId,
      usage: {
        tokens: 45000,
        limit: 100000,
        cost: 12.50
      }
    });
  });

  // SSO Configuration (Skeleton)
  app.get("/api/admin/sso-config", tenantIsolation, (req: any, res) => {
    res.json({
      enabled: true,
      provider: "Okta",
      metadataUrl: "https://okta.com/app/exk..."
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Lok Shikayat Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
