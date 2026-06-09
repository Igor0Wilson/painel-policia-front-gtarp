import { Router, Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});
import { 
  db,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  limit,
  deleteDoc
} from "./firebase";

const router = Router();

// Auto-seed default Colonel user
async function seedDefaultUser() {
  try {
    const userRef = doc(db, "users", "1");
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);
      await setDoc(userRef, {
        id: "1",
        name: "Coronel Comando",
        password: hashedPassword,
        role: "coronel",
        status: "active",
        createdAt: new Date().toISOString()
      });
    }
  } catch {
    // Seed failure is non-fatal
  }
}

seedDefaultUser();

// Helper functions
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  // Fallback ephemeral secret — set JWT_SECRET env in production
  return crypto.randomBytes(32).toString('hex');
}

// Permissions Fallback
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  "coronel": ["dashboard", "comandos", "copom", "alinhamento", "ausencias", "exoneracoes", "relatorios", "tickets", "promocoes", "corregedoria", "calculadora", "informativos", "permissions", "users", "prisional", "cursos"],
  "tenente-coronel": ["dashboard", "comandos", "copom", "alinhamento", "ausencias", "exoneracoes", "relatorios", "tickets", "promocoes", "corregedoria", "calculadora", "informativos", "permissions", "users", "prisional", "cursos"],
  "major": ["dashboard", "comandos", "copom", "alinhamento", "ausencias", "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria"],
  "capitao": ["dashboard", "comandos", "copom", "alinhamento", "ausencias", "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria"],
  "tenente": ["dashboard", "comandos", "copom", "alinhamento", "ausencias", "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria"],
  "sargento": ["dashboard", "comandos", "copom", "ausencias", "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria"],
  "cabo": ["dashboard", "comandos", "copom", "ausencias", "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria"],
  "soldado-1": ["dashboard", "copom", "ausencias", "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria"],
  "soldado-2": ["dashboard", "copom", "calculadora", "informativos", "prisional", "cursos"]
};

async function getPermissionsMap(): Promise<Record<string, string[]>> {
  try {
    const docRef = doc(db, "config", "permissions");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Record<string, string[]>;
    }
  } catch (error) {
  }
  return DEFAULT_PERMISSIONS;
}

// Types for authentication request
export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: string;
    status: string;
    isInstructor?: boolean;
  };
}

// Helper to get cookies
function getCookie(cookieString: string | undefined, name: string): string | null {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

// Authentication Middleware
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | null = null;
  
  // 1. Try to read from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  
  // 2. Try to read from Cookie header
  if (!token) {
    token = getCookie(req.headers.cookie, "token");
  }

  if (!token) {
    return res.status(401).json({ error: "Acesso não autorizado. Sessão expirada ou token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    req.user = decoded;
    
    // Check user active status in firebase
    const userDocRef = doc(db, "users", decoded.id);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return res.status(401).json({ error: "Usuário não encontrado." });
    }
    const userData = userSnap.data();
    if (userData.status === "exonerated") {
      return res.status(403).json({ error: "Acesso Negado: Você foi EXONERADO da corporação." });
    }
    if (userData.status !== "active") {
      return res.status(403).json({ error: `Sua conta está com status: ${userData.status}. Aguarde aprovação de um oficial.` });
    }
    
    // Update req.user role in case of promotion
    if (req.user) {
      req.user.role = userData.role;
      req.user.isInstructor = userData.isInstructor || false;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessão expirada ou token inválido." });
  }
}

// Permissions Check Middleware
export function checkPermission(permissionKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const permissions = await getPermissionsMap();
    const userPermissions = permissions[req.user.role] || [];

    if (userPermissions.includes(permissionKey) || req.user.role === "coronel") {
      return next();
    }

    // Permitir que instrutores acessem rotas de usuários para a Gestão de Alunos
    if (permissionKey === "users" && req.user.isInstructor) {
      return next();
    }

    return res.status(403).json({ error: "Você não tem permissão para acessar esta área." });
  };
}

// --- Auth Routes ---

// Register
router.post("/auth/register", async (req: Request, res: Response) => {
  const { id, name, password, role, ra, responsible } = req.body;

  if (!id || !name || !password || !role) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const userRef = doc(db, "users", id);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return res.status(400).json({ error: "Membro já cadastrado com este passaporte/registro." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Auto-approve the first Colonel registered to allow setup, others start as pending
    const usersCollection = collection(db, "users");
    const usersQuery = await getDocs(usersCollection);
    const isFirstUser = usersQuery.empty;

    const initialStatus = (isFirstUser && role === "coronel") ? "active" : "pending";

    const userData = {
      id,
      name,
      password: hashedPassword,
      role,
      ra: ra || "",
      responsible: responsible || "",
      status: initialStatus,
      isInstructor: false,
      courseTags: [],
      createdAt: new Date().toISOString()
    };

    await setDoc(userRef, userData);

    return res.json({ 
      success: true, 
      message: initialStatus === "active" 
        ? "Primeiro Coronel cadastrado e ativado com sucesso!" 
        : "Cadastro realizado! Aguarde aprovação de um oficial." 
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Login
router.post("/auth/login", async (req: Request, res: Response) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: "Passaporte e senha são obrigatórios." });
  }

  try {
    const userRef = doc(db, "users", id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(400).json({ error: "Passaporte ou senha incorretos." });
    }

    const user = userSnap.data();
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Passaporte ou senha incorretos." });
    }

    if (user.status === "exonerated") {
      return res.status(403).json({ error: "Acesso Negado: Você foi EXONERADO da corporação." });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: `Sua conta ainda não está ativa. Status: ${user.status}` });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, status: user.status },
      getJwtSecret(),
      { expiresIn: "8h" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
        isInstructor: user.isInstructor || false,
        courseTags: user.courseTags || [],
        avatarUrl: user.avatarUrl || null,
        coverUrl: user.coverUrl || null
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Logout
router.post("/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("token");
  return res.json({ success: true, message: "Sessão encerrada com sucesso." });
});

// Get Current User Profile
router.get("/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Não autenticado." });
  
  try {
    const userRef = doc(db, "users", req.user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const { password, ...safeUser } = userSnap.data();
    return res.json(safeUser);
  } catch (error) {
    return res.status(500).json({ error: "Erro interno." });
  }
});

// --- Dynamic Permissions Config ---
router.get("/permissions", authMiddleware, async (req: AuthRequest, res: Response) => {
  const permissions = await getPermissionsMap();
  return res.json(permissions);
});

// --- Upload Genérico (Cloudinary) ---
router.post("/upload", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { base64, oldUrl } = req.body;
    if (!base64) return res.status(400).json({ error: "Imagem base64 é obrigatória." });
    
    // Upload nova imagem
    const uploadResponse = await cloudinary.uploader.upload(base64, {
      folder: "painel-policia",
      resource_type: "image"
    });

    // Se houver uma imagem antiga para excluir
    if (oldUrl && oldUrl.includes("cloudinary.com")) {
      const parts = oldUrl.split("/");
      const filename = parts[parts.length - 1];
      const publicId = filename.split(".")[0];
      const fullPublicId = `painel-policia/${publicId}`;
      try {
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (e) {
      }
    }

    return res.json({ url: uploadResponse.secure_url });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno no upload." });
  }
});

router.post("/permissions/update", authMiddleware, checkPermission("permissions"), async (req: AuthRequest, res: Response) => {
  const { newPermissions } = req.body;
  if (!newPermissions) {
    return res.status(400).json({ error: "Permissões inválidas." });
  }

  try {
    await setDoc(doc(db, "config", "permissions"), newPermissions);
    return res.json({ success: true, message: "Permissões atualizadas com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao salvar permissões no banco de dados." });
  }
});

// --- Exonerações ---
router.get("/exoneracoes", authMiddleware, checkPermission("exoneracoes"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "exonerations"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const exonerations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(exonerations);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar exonerações." });
  }
});

router.post("/exoneracoes", authMiddleware, checkPermission("exoneracoes"), async (req: AuthRequest, res: Response) => {
  const { targetUserId, reason } = req.body;
  if (!targetUserId || !reason) {
    return res.status(400).json({ error: "Usuário e motivo são obrigatórios." });
  }

  try {
    const userRef = doc(db, "users", targetUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Membro não encontrado." });

    const targetUser = userSnap.data();

    if (targetUser.role === 'coronel') {
      return res.status(403).json({ error: "Não é possível exonerar um Coronel Comando." });
    }

    // Update status to exonerated
    await updateDoc(userRef, { status: "exonerated" });

    // Remove from COPOM if active
    const copomDocRef = doc(db, "copom", targetUserId);
    const copomSnap = await getDoc(copomDocRef);
    if (copomSnap.exists()) {
      await deleteDoc(copomDocRef);
    }

    // Record the exoneration
    await addDoc(collection(db, "exonerations"), {
      userId: targetUserId,
      userName: targetUser.name,
      userRole: targetUser.role,
      reason,
      authorId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      date: new Date().toISOString()
    });

    return res.json({ success: true, message: "Membro exonerado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao processar exoneração." });
  }
});

// --- Users Management ---
router.get("/users/all", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = querySnapshot.docs.map(doc => {
      const { password, ...safeUser } = doc.data();
      return safeUser;
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar usuários." });
  }
});

router.post("/users/approve", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "ID do usuário é obrigatório." });

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { status: "active" });
    return res.json({ success: true, message: "Cadastro aprovado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao aprovar usuário." });
  }
});

router.post("/users/promote", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { userId, newRole } = req.body;
  if (!userId || !newRole) return res.status(400).json({ error: "ID e novo cargo são obrigatórios." });

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Usuário não encontrado." });

    const userData = userSnap.data();
    const oldRole = userData.role;

    // Update role
    await updateDoc(userRef, { role: newRole });

    // Save to promotion log
    await addDoc(collection(db, "promotions"), {
      userId,
      userName: userData.name,
      oldRole,
      newRole,
      promotedBy: req.user!.name,
      date: new Date().toISOString()
    });

    return res.json({ success: true, message: `Membro promovido para ${newRole}!` });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao promover usuário." });
  }
});

router.post("/users/toggle-instructor", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { userId, isInstructor } = req.body;
  if (!userId) return res.status(400).json({ error: "ID do usuário é obrigatório." });

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { isInstructor });
    return res.json({ success: true, message: "Flag de instrutor atualizada!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar instrutor." });
  }
});

router.post("/users/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, password, avatarUrl, coverUrl } = req.body;
    const userId = req.user!.id;
    
    const userRef = doc(db, "users", userId);
    const updates: any = {};
    if (name) updates.name = name;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }
    
    await updateDoc(userRef, updates);
    return res.json({ success: true, message: "Perfil atualizado!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
});

router.get("/promotions/logs", authMiddleware, checkPermission("dashboard"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "promotions"), orderBy("date", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => doc.data());
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar logs de promoção." });
  }
});

// --- COPOM (Active operators matrix) ---
router.get("/copom/active", authMiddleware, checkPermission("copom"), async (req: AuthRequest, res: Response) => {
  try {
    const querySnapshot = await getDocs(collection(db, "copom"));
    const active = querySnapshot.docs.map(doc => doc.data());
    return res.json(active);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao carregar COPOM." });
  }
});

router.post("/copom/status", authMiddleware, checkPermission("copom"), async (req: AuthRequest, res: Response) => {
  const { status, vehicle, matricula } = req.body;
  if (!status) return res.status(400).json({ error: "Status é obrigatório." });

  try {
    const copomDocRef = doc(db, "copom", req.user!.id);
    await setDoc(copomDocRef, {
      userId: req.user!.id,
      name: req.user!.name,
      role: req.user!.role,
      matricula: matricula || "N/A",
      status,
      vehicle: vehicle || "QAP (A pé)",
      updatedAt: new Date().toISOString()
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar COPOM." });
  }
});

router.delete("/copom/checkout", authMiddleware, checkPermission("copom"), async (req: AuthRequest, res: Response) => {
  try {
    const copomDocRef = doc(db, "copom", req.user!.id);
    // Remove document if it exists using imported deleteDoc
    await deleteDoc(copomDocRef);
    return res.json({ success: true, message: "Check-out realizado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao fazer checkout do COPOM." });
  }
});

// --- Ausências ---
router.get("/absences", authMiddleware, checkPermission("ausencias"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "absences"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const absences = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(absences);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar ausências." });
  }
});

router.post("/absences", authMiddleware, checkPermission("ausencias"), async (req: AuthRequest, res: Response) => {
  const { date, reason } = req.body;
  if (!date || !reason) return res.status(400).json({ error: "Data e motivo são obrigatórios." });

  try {
    await addDoc(collection(db, "absences"), {
      userId: req.user!.id,
      name: req.user!.name,
      role: req.user!.role,
      date,
      reason,
      status: "pending",
      approvedBy: "",
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Solicitação enviada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao solicitar ausência." });
  }
});

router.put("/absences/:id", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // approved or rejected

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  try {
    const docRef = doc(db, "absences", id);
    await updateDoc(docRef, {
      status,
      approvedBy: req.user!.name
    });
    return res.json({ success: true, message: "Ausência atualizada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar ausência." });
  }
});

router.delete("/absences/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const docRef = doc(db, "absences", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Ausência não encontrada." });
    }

    if (docSnap.data().userId !== req.user!.id) {
      return res.status(403).json({ error: "Você só pode cancelar suas próprias solicitações." });
    }

    await deleteDoc(docRef);
    return res.json({ success: true, message: "Solicitação cancelada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar solicitação." });
  }
});

// --- Relatórios e Ocorrências (PTR) ---
router.get("/reports", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar relatórios." });
  }
});

router.post("/reports", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { barcaName, qruCount, approachesCount, arrestsCount, finesCount, arrestDetails, comments } = req.body;
  
  if (!barcaName) {
    return res.status(400).json({ error: "O nome/designação da barca é obrigatório." });
  }

  try {
    await addDoc(collection(db, "reports"), {
      userId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      barcaName,
      qruCount: Number(qruCount) || 0,
      approachesCount: Number(approachesCount) || 0,
      arrestsCount: Number(arrestsCount) || 0,
      finesCount: Number(finesCount) || 0,
      arrestDetails: arrestDetails || [],
      comments: comments || "SEM ALTERAÇÕES",
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Relatório de patrulha enviado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao submeter relatório." });
  }
});

// --- Advertências ---
router.get("/warnings", authMiddleware, checkPermission("corregedoria"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "warnings"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const warnings = querySnapshot.docs.map(doc => doc.data());
    return res.json(warnings);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar advertências." });
  }
});

router.post("/warnings", authMiddleware, checkPermission("corregedoria"), async (req: AuthRequest, res: Response) => {
  const { targetUserId, reason, severity } = req.body;
  if (!targetUserId || !reason || !severity) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const userRef = doc(db, "users", targetUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Membro infrator não encontrado." });

    const targetUser = userSnap.data();

    await addDoc(collection(db, "warnings"), {
      userId: targetUserId,
      userName: targetUser.name,
      reason,
      severity,
      issuedBy: req.user!.name,
      date: new Date().toISOString()
    });

    return res.json({ success: true, message: "Advertência aplicada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao aplicar advertência." });
  }
});

// --- Avisos (Announcements) ---
router.get("/announcements", authMiddleware, checkPermission("dashboard"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "announcements"), orderBy("date", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    const announcements = querySnapshot.docs.map(doc => doc.data());
    return res.json(announcements);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar avisos." });
  }
});

router.post("/announcements", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Título e conteúdo são obrigatórios." });

  try {
    await addDoc(collection(db, "announcements"), {
      title,
      content,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      date: new Date().toISOString()
    });
    return res.json({ success: true, message: "Aviso publicado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao publicar aviso." });
  }
});

// --- Subdivisões ---
router.get("/subdivisoes", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const querySnapshot = await getDocs(collection(db, "subdivisoes"));
    const subdivisoes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(subdivisoes);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar subdivisões." });
  }
});

router.post("/subdivisoes", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, comandoId, comandoName } = req.body;
  if (req.user?.role !== "coronel" && req.user?.role !== "tenente-coronel") {
    return res.status(403).json({ error: "Apenas Coronel e Tenente-Coronel podem criar subdivisões." });
  }
  
  if (!name || !comandoId || !comandoName) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  try {
    const newSubdivisao = {
      name,
      comandoId,
      comandoName,
      cargos: [],
      operators: [],
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, "subdivisoes"), newSubdivisao);
    return res.json({ id: docRef.id, ...newSubdivisao });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar subdivisão." });
  }
});

router.put("/subdivisoes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const user = req.user!;

  try {
    const docRef = doc(db, "subdivisoes", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Subdivisão não encontrada." });
    
    const data = snap.data();
    const isHighRank = user.role === "coronel" || user.role === "tenente-coronel";
    const isOwner = data.comandoId === user.id;

    if (!isHighRank && !isOwner) {
      return res.status(403).json({ error: "Apenas o comando desta subdivisão ou a alta cúpula podem modificá-la." });
    }

    await updateDoc(docRef, updates);
    return res.json({ success: true, message: "Subdivisão atualizada!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar subdivisão." });
  }
});

router.delete("/subdivisoes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "coronel" && req.user?.role !== "tenente-coronel") {
    return res.status(403).json({ error: "Apenas Coronel e Tenente-Coronel podem deletar subdivisões." });
  }
  try {
    const docRef = doc(db, "subdivisoes", req.params.id);
    await deleteDoc(docRef);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar subdivisão." });
  }
});

// --- Tickets da Cidade ---
router.get("/tickets", authMiddleware, checkPermission("tickets"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar tickets." });
  }
});

router.post("/tickets", authMiddleware, checkPermission("tickets"), async (req: AuthRequest, res: Response) => {
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).json({ error: "Título e descrição são obrigatórios." });

  try {
    await addDoc(collection(db, "tickets"), {
      title,
      description,
      reporterName: req.user!.name,
      status: "open",
      assignedTo: "",
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Ticket criado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar ticket." });
  }
});

router.put("/tickets/:id", authMiddleware, checkPermission("tickets"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, assignedTo } = req.body;

  try {
    const docRef = doc(db, "tickets", id);
    await updateDoc(docRef, { status, assignedTo });
    return res.json({ success: true, message: "Ticket atualizado!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar ticket." });
  }
});

// --- Módulo Prisional ---
router.get("/prisional", authMiddleware, checkPermission("prisional"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "prison_records"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar registros prisionais." });
  }
});

router.post("/prisional", authMiddleware, checkPermission("prisional"), async (req: AuthRequest, res: Response) => {
  const { prisonerName, passport, crimes, penalty, fine, bail, rawText, imageUrl, evidenceUrl, rgUrl, quimicoUrl, residualUrl, participants, ptrInfo } = req.body;

  if (!prisonerName || !passport) {
    return res.status(400).json({ error: "Nome do preso e Passaporte são obrigatórios." });
  }

  try {
    await addDoc(collection(db, "prison_records"), {
      prisonerName,
      passport,
      crimes: crimes || "Nenhum informado",
      penalty: penalty || "N/A",
      fine: Number(fine) || 0,
      bail: bail || "Não informada",
      rawText: rawText || "",
      imageUrl: imageUrl || "",
      evidenceUrl: evidenceUrl || "",
      rgUrl: rgUrl || "",
      quimicoUrl: quimicoUrl || "",
      residualUrl: residualUrl || "",
      participants: Array.isArray(participants) ? participants : [],
      ptrInfo: ptrInfo || null,
      createdById: req.user!.id,
      createdByName: req.user!.name,
      createdByRole: req.user!.role,
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Ficha prisional registrada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao salvar ficha prisional." });
  }
});

// --- Módulo de Cursos ---
router.get("/courses", authMiddleware, checkPermission("cursos"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const courses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(courses);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar cursos." });
  }
});

router.post("/courses", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { title, description, videoUrl, materialsUrl } = req.body;

  const userRef = doc(db, "users", req.user!.id);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;
  
  const isCoronel = req.user!.role === 'coronel';
  const isInstructor = userData?.isInstructor === true;
  
  if (!isCoronel || !isInstructor) {
    return res.status(403).json({ error: "Apenas Coronel com permissão de Instrutor pode publicar cursos." });
  }

  if (!title || !description) {
    return res.status(400).json({ error: "Título e descrição do curso são obrigatórios." });
  }

  try {
    await addDoc(collection(db, "courses"), {
      title,
      description,
      videoUrl: videoUrl || "",
      materialsUrl: materialsUrl || "",
      createdById: req.user!.id,
      createdByName: req.user!.name,
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Curso publicado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar curso." });
  }
});

router.post("/courses/:id/complete", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const docRef = doc(db, "courses", req.params.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "Curso não encontrado." });

    const course = docSnap.data();
    
    const userRef = doc(db, "users", req.user!.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Usuário não encontrado." });
    
    const userData = userSnap.data();
    const tags = userData.courseTags || [];
    
    if (!tags.includes(course.title)) {
      await updateDoc(userRef, { courseTags: [...tags, course.title] });
    }
    
    return res.json({ success: true, message: "Curso concluído!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao concluir curso." });
  }
});

// --- Corregedoria: Orientações ---
router.get("/corregedoria/orientacoes", authMiddleware, checkPermission("corregedoria"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "orientacoes"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const orientacoes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(orientacoes);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar orientações." });
  }
});

router.post("/corregedoria/orientacoes", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Título e conteúdo são obrigatórios." });
  }

  try {
    await addDoc(collection(db, "orientacoes"), {
      title,
      content,
      authorId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Orientação publicada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar orientação." });
  }
});

// --- Gestão de VTRs Ativas (PTR) ---

router.get("/ptrs/active", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "active_ptrs"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const ptrs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(ptrs);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar VTRs ativas." });
  }
});

router.post("/ptrs/create", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { chiefId, initialMembers, viaturaId, viaturaName } = req.body;
  if (!chiefId || !initialMembers || initialMembers.length === 0) {
    return res.status(400).json({ error: "Chefe e membros iniciais são obrigatórios." });
  }

  try {
    const q = query(collection(db, "active_ptrs"));
    const activeDocs = await getDocs(q);
    
    const usedNumbers = new Set();
    activeDocs.forEach(d => usedNumbers.add(d.data().vtrNumber));
    
    let vtrNum = 1;
    while(usedNumbers.has(`VTR-${vtrNum.toString().padStart(2, '0')}`)) {
      vtrNum++;
    }
    const vtrNumber = `VTR-${vtrNum.toString().padStart(2, '0')}`;

    const newPtr = {
      vtrNumber,
      status: "preparation",
      chiefId,
      viaturaId: viaturaId || null,
      viaturaName: viaturaName || null,
      members: initialMembers.map((m: any) => ({
        userId: m.id,
        name: m.name,
        role: m.role,
        joinTime: null,
        totalTimeMs: 0
      })),
      pastMembers: [],
      requests: [],
      startedAt: null,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "active_ptrs"), newPtr);
    return res.json({ success: true, ptr: { id: docRef.id, ...newPtr } });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar VTR." });
  }
});

router.post("/ptrs/:id/start", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });

    const ptr = docSnap.data();
    if (ptr.chiefId !== req.user!.id) {
      return res.status(403).json({ error: "Apenas o chefe da VTR pode iniciá-la." });
    }

    const now = new Date().toISOString();
    
    const updatedMembers = ptr.members.map((m: any) => ({
      ...m,
      joinTime: now
    }));

    await updateDoc(docRef, {
      status: "active",
      startedAt: now,
      members: updatedMembers
    });

    return res.json({ success: true, message: "Patrulha iniciada!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao iniciar VTR." });
  }
});

router.post("/ptrs/:id/finish", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { qruCount, approachesCount, arrestsCount, finesCount, arrestDetails, comments } = req.body;

  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });

    const ptr = docSnap.data();
    if (ptr.chiefId !== req.user!.id) {
      return res.status(403).json({ error: "Apenas o chefe pode encerrar a VTR." });
    }

    const now = new Date().getTime();

    const finalMembers = ptr.members.map((m: any) => {
      let extraMs = 0;
      if (ptr.status === "active" && m.joinTime) {
        extraMs = now - new Date(m.joinTime).getTime();
      }
      return {
        userId: m.userId,
        name: m.name,
        role: m.role,
        totalTimeMs: m.totalTimeMs + extraMs
      };
    });

    const allMembersData = [...(ptr.pastMembers || []), ...finalMembers];
    const barcaNamesStr = allMembersData.map((m: any) => `${m.name} #${m.userId}`).join(', ');

    await addDoc(collection(db, "reports"), {
      userId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      barcaName: barcaNamesStr,
      vtrNumber: ptr.vtrNumber,
      membersData: allMembersData,
      qruCount: Number(qruCount) || 0,
      approachesCount: Number(approachesCount) || 0,
      arrestsCount: Number(arrestsCount) || 0,
      finesCount: Number(finesCount) || 0,
      arrestDetails: arrestDetails || [],
      comments: comments || "SEM ALTERAÇÕES",
      createdAt: new Date().toISOString()
    });

    await deleteDoc(docRef);

    return res.json({ success: true, message: "Relatório finalizado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao finalizar VTR." });
  }
});

router.post("/ptrs/:id/requests", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { type } = req.body; 
  
  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });

    const ptr = docSnap.data();
    
    if (ptr.status === "preparation" && type === "join") {
      if (ptr.members.length >= 6) return res.status(400).json({ error: "VTR cheia." });
      if (ptr.members.some((m: any) => m.userId === req.user!.id)) return res.status(400).json({ error: "Você já está na VTR." });
      
      const newMembers = [...ptr.members, { userId: req.user!.id, name: req.user!.name, role: req.user!.role, joinTime: null, totalTimeMs: 0 }];
      await updateDoc(docRef, { members: newMembers });
      return res.json({ success: true, message: "Entrou na VTR com sucesso!" });
    }

    if (ptr.status === "preparation" && type === "leave") {
      if (ptr.chiefId === req.user!.id) return res.status(400).json({ error: "Chefe não pode sair sem transferir liderança." });
      
      const newMembers = ptr.members.filter((m: any) => m.userId !== req.user!.id);
      await updateDoc(docRef, { members: newMembers });
      return res.json({ success: true, message: "Saiu da VTR com sucesso!" });
    }

    const existingReq = (ptr.requests || []).find((r: any) => r.userId === req.user!.id && r.type === type && r.status === "pending");
    if (existingReq) return res.status(400).json({ error: "Você já possui uma solicitação pendente." });

    if (type === "leave" && ptr.chiefId === req.user!.id) {
       return res.status(400).json({ error: "O chefe deve transferir a liderança antes de sair." });
    }

    const newRequest = {
      userId: req.user!.id,
      name: req.user!.name,
      role: req.user!.role,
      type,
      status: "pending"
    };

    await updateDoc(docRef, { requests: [...(ptr.requests || []), newRequest] });
    return res.json({ success: true, message: `Solicitação de ${type === 'join' ? 'entrada' : 'saída'} enviada!` });

  } catch (error) {
    return res.status(500).json({ error: "Erro ao processar solicitação." });
  }
});

router.post("/ptrs/:id/requests/:reqUserId", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id, reqUserId } = req.params;
  const { action, type } = req.body; 

  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });

    const ptr = docSnap.data();
    if (ptr.chiefId !== req.user!.id) return res.status(403).json({ error: "Apenas o chefe pode gerenciar." });

    const reqData = (ptr.requests || []).find((r: any) => r.userId === reqUserId && r.type === type && r.status === "pending");
    if(!reqData) return res.status(404).json({ error: "Solicitação não encontrada." });

    const updatedRequests = ptr.requests.filter((r: any) => r !== reqData);
    let updatedMembers = [...ptr.members];
    let updatedPastMembers = ptr.pastMembers || [];

    if (action === "approve") {
      const now = new Date();
      if (type === "join") {
        if (updatedMembers.length >= 6) return res.status(400).json({ error: "VTR cheia." });
        if(!updatedMembers.some((m:any) => m.userId === reqUserId)) {
          updatedMembers.push({
            userId: reqData.userId,
            name: reqData.name,
            role: reqData.role,
            joinTime: ptr.status === "active" ? now.toISOString() : null,
            totalTimeMs: 0
          });
        }
      } else if (type === "leave") {
        const mIdx = updatedMembers.findIndex((m: any) => m.userId === reqUserId);
        if (mIdx !== -1) {
           const member = updatedMembers[mIdx];
           let extraMs = 0;
           if (ptr.status === "active" && member.joinTime) {
             extraMs = now.getTime() - new Date(member.joinTime).getTime();
           }
           updatedPastMembers.push({
             ...member,
             totalTimeMs: member.totalTimeMs + extraMs,
             joinTime: null
           });
           updatedMembers.splice(mIdx, 1);
        }
      }
    }

    await updateDoc(docRef, { requests: updatedRequests, members: updatedMembers, pastMembers: updatedPastMembers });
    return res.json({ success: true, message: `Solicitação ${action === 'approve' ? 'aprovada' : 'recusada'}.` });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno." });
  }
});

router.post("/ptrs/:id/transfer-chief", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newChiefId } = req.body;
  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });
    
    const ptr = docSnap.data();
    if (ptr.chiefId !== req.user!.id) return res.status(403).json({ error: "Apenas o chefe pode transferir." });

    if (!ptr.members.some((m: any) => m.userId === newChiefId)) {
      return res.status(400).json({ error: "O novo chefe deve ser um membro da VTR." });
    }

    await updateDoc(docRef, { chiefId: newChiefId });
    return res.json({ success: true, message: "Liderança transferida!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno." });
  }
});

// --- Novas Rotas PTR (Adicionar/Remover Membro diretamente) ---
router.post("/ptrs/:id/add-member", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { targetUserId } = req.body;
  
  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });

    const ptr = docSnap.data();
    if (ptr.chiefId !== req.user!.id) return res.status(403).json({ error: "Apenas o chefe pode adicionar." });
    
    if (ptr.members.length >= 6) return res.status(400).json({ error: "VTR cheia." });
    if (ptr.members.some((m: any) => m.userId === targetUserId)) return res.status(400).json({ error: "Usuário já está na VTR." });

    const userRef = doc(db, "users", targetUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Usuário não encontrado." });
    const targetUser = userSnap.data();

    const newMember = {
      userId: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
      joinTime: ptr.status === "active" ? new Date().toISOString() : null,
      totalTimeMs: 0
    };

    // Desliga o status de "Aguardando PTR" do usuário
    await updateDoc(userRef, { isWaitingPtr: false });

    await updateDoc(docRef, { members: [...ptr.members, newMember] });
    return res.json({ success: true, message: "Oficial adicionado à VTR!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao adicionar oficial." });
  }
});

router.post("/ptrs/:id/remove-member", authMiddleware, checkPermission("relatorios"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { targetUserId } = req.body;

  try {
    const docRef = doc(db, "active_ptrs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ error: "VTR não encontrada." });

    const ptr = docSnap.data();
    if (ptr.chiefId !== req.user!.id) return res.status(403).json({ error: "Apenas o chefe pode remover." });
    if (targetUserId === req.user!.id) return res.status(400).json({ error: "O chefe não pode remover a si mesmo." });

    let updatedMembers = [...ptr.members];
    let updatedPastMembers = ptr.pastMembers || [];

    const mIdx = updatedMembers.findIndex((m: any) => m.userId === targetUserId);
    if (mIdx === -1) return res.status(404).json({ error: "Usuário não está na VTR." });

    const member = updatedMembers[mIdx];
    let extraMs = 0;
    if (ptr.status === "active" && member.joinTime) {
      extraMs = new Date().getTime() - new Date(member.joinTime).getTime();
    }
    
    updatedPastMembers.push({
      ...member,
      totalTimeMs: member.totalTimeMs + extraMs,
      joinTime: null
    });
    
    updatedMembers.splice(mIdx, 1);

    await updateDoc(docRef, { members: updatedMembers, pastMembers: updatedPastMembers });
    return res.json({ success: true, message: "Oficial removido da VTR!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao remover oficial." });
  }
});

// --- Rota de Usuário "Aguardando PTR" ---
router.post("/users/waiting-ptr", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { isWaiting } = req.body;
  try {
    const userRef = doc(db, "users", req.user!.id);
    await updateDoc(userRef, { isWaitingPtr: isWaiting });
    return res.json({ success: true, isWaitingPtr: isWaiting });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar status." });
  }
});

// --- Rotas de Viaturas (Informativos e Seleção) ---
router.get("/viaturas", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "viaturas"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const viaturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(viaturas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar viaturas." });
  }
});

router.post("/viaturas", authMiddleware, checkPermission("informativos"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, minRole, description, imageUrl } = req.body;
    if (!name || !minRole) return res.status(400).json({ error: "Nome e patente mínima são obrigatórios." });

    const viaturaData = {
      name,
      minRole,
      description: description || "",
      imageUrl: imageUrl || "",
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "viaturas"), viaturaData);
    res.json({ id: docRef.id, ...viaturaData });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar viatura." });
  }
});

router.delete("/viaturas/:id", authMiddleware, checkPermission("informativos"), async (req: AuthRequest, res: Response) => {
  try {
    await deleteDoc(doc(db, "viaturas", req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover viatura." });
  }
});

// --- Rotas de Informativos Dinâmicos (Categorias e Itens) ---
router.get("/informativos", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "informativos"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar informativos." });
  }
});

router.post("/informativos", authMiddleware, checkPermission("informativos"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, iconName } = req.body;
    if (!title) return res.status(400).json({ error: "Título obrigatório." });

    const catData = {
      title,
      iconName: iconName || "BookOpen",
      items: [],
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, "informativos"), catData);
    res.json({ id: docRef.id, ...catData });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar categoria." });
  }
});

router.post("/informativos/:id/items", authMiddleware, checkPermission("informativos"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, metadata } = req.body;
    
    const docRef = doc(db, "informativos", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Categoria não encontrada." });

    const cat = snap.data();
    const newItem = {
      id: crypto.randomBytes(8).toString('hex'),
      title,
      description,
      imageUrl: imageUrl || "",
      metadata: metadata || {}
    };

    const newItems = [...(cat.items || []), newItem];
    await updateDoc(docRef, { items: newItems });
    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar item ao informativo." });
  }
});

router.delete("/informativos/:id", authMiddleware, checkPermission("informativos"), async (req: AuthRequest, res: Response) => {
  try {
    await deleteDoc(doc(db, "informativos", req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover categoria." });
  }
});

router.delete("/informativos/:catId/items/:itemId", authMiddleware, checkPermission("informativos"), async (req: AuthRequest, res: Response) => {
  try {
    const { catId, itemId } = req.params;
    const docRef = doc(db, "informativos", catId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Categoria não encontrada." });
    
    const cat = snap.data();
    const newItems = cat.items.filter((i: any) => i.id !== itemId);
    await updateDoc(docRef, { items: newItems });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover item." });
  }
});

// --- Servidor de Imagens Antigas do Módulo Prisional ---

const sendPrisonRecordImage = async (req: Request, res: Response, fieldName: string, errorMsg: string) => {
  try {
    const docRef = doc(db, "prison_records", req.params.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).send("Ficha prisional não encontrada.");
    }
    const data = docSnap.data();
    const base64 = data[fieldName];
    if (!base64) {
      return res.status(404).send(errorMsg);
    }
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send("Formato de imagem armazenado inválido.");
    }
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(buffer);
  } catch {
    return res.status(500).send("Erro interno ao carregar imagem.");
  }
};

router.get("/prisional/:id/image/preso", async (req: Request, res: Response) => {
  return sendPrisonRecordImage(req, res, "imageUrl", "Nenhuma foto cadastrada para este preso.");
});

router.get("/prisional/:id/image/provas", async (req: Request, res: Response) => {
  return sendPrisonRecordImage(req, res, "evidenceUrl", "Nenhuma foto de provas cadastrada para este registro.");
});

router.get("/prisional/:id/image/rg", async (req: Request, res: Response) => {
  return sendPrisonRecordImage(req, res, "rgUrl", "Nenhuma foto de RG cadastrada para este registro.");
});

router.get("/prisional/:id/image/quimico", async (req: Request, res: Response) => {
  return sendPrisonRecordImage(req, res, "quimicoUrl", "Nenhum teste químico cadastrado para este registro.");
});

router.get("/prisional/:id/image/residual", async (req: Request, res: Response) => {
  return sendPrisonRecordImage(req, res, "residualUrl", "Nenhum teste residual cadastrado para este registro.");
});

// --- Proxy da Calculadora Burp ---
router.get("/proxy/calculadora", async (req: Request, res: Response) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://burp.com.br/calculadora/", {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Servidor retornou status ${response.status}`);
    }

    let html = await response.text();

    // Rewrite relative paths in HTML to absolute paths pointing to burp.com.br/calculadora/
    html = html.replace(/href="assets\//g, 'href="https://burp.com.br/calculadora/assets/');
    html = html.replace(/src="assets\//g, 'src="https://burp.com.br/calculadora/assets/');
    html = html.replace(/src="logo.png"/g, 'src="https://burp.com.br/calculadora/logo.png"');
    html = html.replace(/src="logo.jpg"/g, 'src="https://burp.com.br/calculadora/logo.jpg"');
    html = html.replace(/url\('assets\//g, "url('https://burp.com.br/calculadora/assets/");

    // Inject our communication script before </body>
    const scriptToInject = `
      <script>
        window.addEventListener('message', (event) => {
          if (event.data === 'get_calculator_data') {
            try {
              const nome = document.getElementById('preso_nome')?.value || '';
              const passaporte = document.getElementById('preso_passaporte')?.value || '';
              const responsavel = document.getElementById('responsavel_prisao')?.value || '';
              const relatorio = document.getElementById('relatorio-texto')?.value || '';
              
              const penaText = document.getElementById('pena_total')?.textContent || '0';
              const multaText = document.getElementById('multa_total')?.textContent || '0';
              const fiancaText = document.getElementById('fianca_total')?.textContent || 'Não';

              const crimesList = Array.from(state.selectedCrimes).map(id => {
                const item = document.querySelector(\`[data-crime-id="\${id}"]\`);
                return item ? item.querySelector('.crime-name').textContent : '';
              }).filter(Boolean).join(', ');

              // Convert files to base64 DataURLs:
              const filesData = {};
              const promises = Object.entries(state.files).map(([key, file]) => {
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    filesData[key] = e.target.result;
                    resolve();
                  };
                  reader.readAsDataURL(file);
                });
              });

              Promise.all(promises).then(() => {
                window.parent.postMessage({
                  type: 'calculator_data_response',
                  data: {
                    prisonerName: nome,
                    passport: passaporte,
                    crimes: crimesList,
                    penalty: penaText,
                    fine: multaText,
                    bail: fiancaText,
                    relatorio: relatorio,
                    files: filesData
                  }
                }, '*');
              });
            } catch (e) {
              window.parent.postMessage({ type: 'calculator_data_error', error: e.message }, '*');
            }
          }
        });

        // Sobrescrever a função original de cópia para copiar a ficha completa com fotos
        window.copyToClipboard = async function() {
          const btnCopy = document.querySelector('.btn-copy');
          const originalHTML = btnCopy ? btnCopy.innerHTML : '';
          
          try {
            if (btnCopy) {
              btnCopy.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Copiando...';
              btnCopy.disabled = true;
            }

            const nome = document.getElementById('preso_nome')?.value || '';
            const passaporte = document.getElementById('preso_passaporte')?.value || '';
            const advPassaporte = document.getElementById('adv_passaporte')?.value || '';
            const responsavel = document.getElementById('responsavel_prisao')?.value || '';
            const relatorio = document.getElementById('relatorio-texto')?.value || '';
            
            const penaText = document.getElementById('pena_total')?.textContent || '0 meses';
            const multaText = document.getElementById('multa_total')?.textContent || 'R$ 0';
            const fiancaText = document.getElementById('fianca_total')?.textContent || 'R$ 0';

            const crimesList = Array.from(state.selectedCrimes).map(id => {
              const item = document.querySelector(\`[data-crime-id="\${id}"]\`);
              const name = item ? item.querySelector('.crime-name').textContent : '';
              const crime = crimeMap[id];
              return \`- \${crime ? crime.article : ''} - \${name}\`;
            });
            if (state.acaoMaior) {
              crimesList.push(\`- Ação Maior: \${state.acaoMaior.name}\`);
            }

            // Converter arquivos carregados para base64 e subir para criar URLs temporários
            const fileUrls = {};
            const fileKeysMapped = {
              'preso': 'Foto do Preso',
              'rg': 'Foto do RG',
              'apreensao': 'Foto da Apreensão',
              'quimico': 'Teste Químico',
              'residual': 'Teste Residual'
            };

            for (const [key, file] of Object.entries(state.files)) {
              if (!file) continue;
              try {
                const base64 = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });

                const res = await fetch('/api/upload', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + document.cookie.split('token=')[1]?.split(';')[0]
                  },
                  body: JSON.stringify({ base64 })
                });
                if (res.ok) {
                  const data = await res.json();
                  fileUrls[key] = data.url;
                }
              } catch (e) {
              }
            }

            // Formatar texto de cópia
            let text = \`⚖️ **FICHA PRISIONAL - PMCC** ⚖️\\n\\n\`;
            text += \`👤 **Nome do Preso:** \${nome || 'N/A'}\\n\`;
            text += \`🆔 **Passaporte:** \${passaporte || 'N/A'}\\n\`;
            text += \`👨\u200D⚖️ **Advogado:** \${advPassaporte || 'N/A'}\\n\`;
            text += \`👮 **Responsável:** \${responsavel || 'N/A'}\\n\\n\`;
            
            text += \`⏳ **Pena Total:** \${penaText}\\n\`;
            text += \`💸 **Multa:** \${multaText}\\n\`;
            text += \`💰 **Fiança:** \${fiancaText}\\n\\n\`;

            text += \`📜 **Crimes Cometidos:**\\n\`;
            text += crimesList.length > 0 ? crimesList.join('\\n') : '- Nenhum crime selecionado';
            text += \`\\n\\n\`;

            if (relatorio) {
              text += \`📝 **Relatório:**\\n\${relatorio}\\n\\n\`;
            }

            const uploadedKeys = Object.keys(fileUrls);
            if (uploadedKeys.length > 0) {
              text += \`🖼️ **Evidências Visuais (Fotos):**\\n\`;
              for (const [key, url] of Object.entries(fileUrls)) {
                const label = fileKeysMapped[key] || key;
                text += \`- \${label}: \${url}\\n\`;
              }
            }

            await navigator.clipboard.writeText(text);
            showToast('Ficha completa copiada!', 'success');
          } catch (err) {
            showToast('Erro ao copiar: ' + err.message, 'error');
          } finally {
            if (btnCopy) {
              btnCopy.innerHTML = originalHTML;
              btnCopy.disabled = false;
            }
          }
        };
      </script>
    `;

    html = html.replace("</body>", scriptToInject + "</body>");

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            background-color: #09090b; 
            color: #f4f4f5; 
            font-family: sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
            text-align: center;
          }
          .container {
            background: rgba(244, 63, 94, 0.1);
            border: 1px solid rgba(244, 63, 94, 0.2);
            padding: 2rem;
            border-radius: 1rem;
            max-width: 400px;
          }
          h2 { color: #f43f5e; margin-top: 0; }
          p { color: #a1a1aa; font-size: 0.9rem; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Calculadora Indisponível</h2>
          <p>Não foi possível conectar ao servidor da calculadora (burp.com.br).</p>
          <p>O servidor original pode estar offline ou bloqueando conexões no momento. Tente novamente mais tarde.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// ------------------------------------------------------------------
// SOCIAL NETWORK (FEED / POSTS) MODULE
// ------------------------------------------------------------------

router.get("/posts", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postsRef = collection(db, "posts");
    const snapshot = await getDocs(query(postsRef, orderBy("createdAt", "desc")));
    
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = new Map();
    usersSnap.forEach(u => {
      const d = u.data();
      usersMap.set(u.id, {
        avatarUrl: d.avatarUrl || null,
        coverUrl: d.coverUrl || null
      });
    });
    
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      const authorInfo = usersMap.get(data.authorId) || {};
      return { 
        id: doc.id, 
        ...data,
        authorAvatarUrl: authorInfo.avatarUrl,
        authorCoverUrl: authorInfo.coverUrl,
        comments: (data.comments || []).map((c: any) => {
          const commentAuthorInfo = usersMap.get(c.authorId) || {};
          return {
            ...c,
            authorAvatarUrl: commentAuthorInfo.avatarUrl,
            authorCoverUrl: commentAuthorInfo.coverUrl
          };
        })
      };
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao buscar posts" });
  }
});

router.get("/posts/public/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postRef = doc(db, "posts", id);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return res.status(404).json({ error: "Clipe não encontrado" });
    }

    const data = postSnap.data();
    
    // Fetch author info to get avatar and cover
    const authorRef = doc(db, "users", data.authorId);
    const authorSnap = await getDoc(authorRef);
    let authorInfo = { avatarUrl: null, coverUrl: null };
    
    if (authorSnap.exists()) {
      const ad = authorSnap.data();
      authorInfo = { avatarUrl: ad.avatarUrl || null, coverUrl: ad.coverUrl || null };
    }

    const publicPost = {
      id: postSnap.id,
      videoUrl: data.videoUrl,
      description: data.description,
      authorName: data.authorName,
      authorRole: data.authorRole,
      authorAvatarUrl: authorInfo.avatarUrl,
      authorCoverUrl: authorInfo.coverUrl,
      createdAt: data.createdAt,
      likesCount: (data.likes || []).length,
      commentsCount: (data.comments || []).length,
      comments: data.comments || []
    };

    res.json(publicPost);
  } catch (error) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/posts", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { videoUrl, description } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: "O link do vídeo é obrigatório" });
    }

    const postData = {
      videoUrl,
      description: description || "",
      authorId: req.user?.id,
      authorName: req.user?.name,
      authorRole: req.user?.role,
      likes: [], // Array of user IDs who liked
      comments: [],
      createdAt: new Date().toISOString()
    };

    const postsRef = collection(db, "posts");
    const docRef = await addDoc(postsRef, postData);
    
    res.json({ id: docRef.id, ...postData });
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao criar post" });
  }
});

router.post("/posts/:id/like", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const postRef = doc(db, "posts", id);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    const post = postSnap.data();
    let likes = post.likes || [];
    
    if (likes.includes(userId)) {
      likes = likes.filter((uid: string) => uid !== userId);
    } else {
      likes.push(userId);
    }

    await updateDoc(postRef, { likes });
    res.json({ likes });
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao dar like" });
  }
});

router.post("/posts/:id/comments", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Comentário não pode ser vazio" });
    }

    const postRef = doc(db, "posts", id);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    const post = postSnap.data();
    const comments = post.comments || [];
    
    const newComment = {
      id: crypto.randomBytes(8).toString('hex'),
      text,
      authorId: req.user?.id,
      authorName: req.user?.name,
      authorRole: req.user?.role,
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);
    await updateDoc(postRef, { comments });
    
    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao adicionar comentário" });
  }
});

// --- Módulo de Chat ---
router.get("/chat", authMiddleware, checkPermission("chat"), async (req: AuthRequest, res: Response) => {
  try {
    const q = query(collection(db, "chat_messages"), orderBy("createdAt", "desc"), limit(100));
    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
    
    const userRef = doc(db, "users", req.user!.id);
    const userSnap = await getDoc(userRef);
    const mutedUntil = userSnap.exists() ? (userSnap.data().mutedUntil || 0) : 0;

    return res.json({ messages, mutedUntil });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao carregar chat." });
  }
});

router.post("/chat", authMiddleware, checkPermission("chat"), async (req: AuthRequest, res: Response) => {
  const { text, imageUrl } = req.body;
  if ((!text || !text.trim()) && !imageUrl) return res.status(400).json({ error: "Mensagem vazia." });

  try {
    const userRef = doc(db, "users", req.user!.id);
    const userSnap = await getDoc(userRef);
    const mutedUntil = userSnap.exists() ? (userSnap.data().mutedUntil || 0) : 0;
    
    if (Date.now() < mutedUntil) {
      return res.status(403).json({ error: "Você está silenciado." });
    }

    const newMessage: any = {
      userId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      authorAvatarUrl: userSnap.exists() ? (userSnap.data().avatarUrl || null) : null,
      createdAt: new Date().toISOString()
    };

    if (text && text.trim()) newMessage.text = text.trim();
    if (imageUrl) newMessage.imageUrl = imageUrl;

    const docRef = await addDoc(collection(db, "chat_messages"), newMessage);
    return res.json({ id: docRef.id, ...newMessage });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao enviar mensagem." });
  }
});

router.delete("/chat/:id", authMiddleware, checkPermission("chat"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const docRef = doc(db, "chat_messages", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Mensagem não encontrada." });
    }

    const isOwner = docSnap.data().userId === req.user!.id;
    const isOfficer = req.user!.role === 'coronel' || req.user!.role === 'tenente-coronel';

    if (!isOwner && !isOfficer) {
      return res.status(403).json({ error: "Você não tem permissão para apagar esta mensagem." });
    }

    await deleteDoc(docRef);
    return res.json({ success: true, message: "Mensagem excluída." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir mensagem." });
  }
});

router.post("/chat/mute", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { targetUserId, durationMs } = req.body;
  
  if (!targetUserId || !durationMs) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  try {
    const targetUserRef = doc(db, "users", targetUserId);
    const targetSnap = await getDoc(targetUserRef);
    if (!targetSnap.exists()) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const mutedUntil = Date.now() + Number(durationMs);
    await updateDoc(targetUserRef, { mutedUntil });

    return res.json({ success: true, message: "Usuário silenciado com sucesso.", mutedUntil });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao silenciar usuário." });
  }
});

export default router;
