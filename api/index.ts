import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Vercel SSR)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      // In production allow any vercel.app subdomain for the project
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      return callback(null, true); // permissive — tighten per domain after first deploy
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api", router);

// Global error handler — garante que erros nunca retornem HTML (que causaria o "not valid JSON")
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Erro interno do servidor.",
  });
});

// Local development server
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT);
}

export default app;
module.exports = app;
