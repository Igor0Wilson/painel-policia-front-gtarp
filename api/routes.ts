import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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
      console.log("[Firebase] Usuário Coronel semeado automaticamente: ID: 1 / Senha: admin123");
    }
  } catch (error) {
    console.error("Erro ao semear usuário Coronel padrão:", error);
  }
}

seedDefaultUser();

// Helper functions
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  // TODO(security): Set a persistent secret on production environment
  console.warn("WARNING: Generating ephemeral JWT secret. Instance-isolated!");
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
    console.error("Erro ao carregar permissões do Firebase, usando padrões:", error);
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
    if (req.user) req.user.role = userData.role;
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
    console.error("Register error:", error);
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
        status: user.status
      }
    });
  } catch (error) {
    console.error("Login error:", error);
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

router.post("/permissions/update", authMiddleware, checkPermission("permissions"), async (req: AuthRequest, res: Response) => {
  const { newPermissions } = req.body;
  if (!newPermissions) {
    return res.status(400).json({ error: "Permissões inválidas." });
  }

  try {
    await setDoc(doc(db, "config", "permissions"), newPermissions);
    return res.json({ success: true, message: "Permissões atualizadas com sucesso!" });
  } catch (error) {
    console.error("Error updating permissions:", error);
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
    console.error("Exoneration Error:", error);
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

// --- Comandos e Operadores ---
router.get("/tactical-units", authMiddleware, checkPermission("comandos"), async (req: AuthRequest, res: Response) => {
  try {
    const querySnapshot = await getDocs(collection(db, "tactical_units"));
    const units = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Seed initial units if empty
    if (units.length === 0) {
      const initialUnits = [
        { name: "COMANDO CORVO", subCommand: "Adam Clay #13763", operators: ["Texas #4474", "Henrique Lima #12327"] },
        { name: "RUP-ROMEU", subCommand: "N/A", operators: ["Henrique Lima #12327"] },
        { name: "COMANDO DE GPMOR/ROCAM", subCommand: "N/A", operators: ["Henrique Lima #12327"] },
        { name: "COMANDO DE NEGOCIAÇÃO", subCommand: "Adam C #6189", operators: ["Henrique Lima #12327"] }
      ];

      for (const unit of initialUnits) {
        await addDoc(collection(db, "tactical_units"), unit);
      }
      return res.json(initialUnits);
    }
    return res.json(units);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar comandos táticos." });
  }
});

router.put("/tactical-units/:id", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { subCommand, operators } = req.body;

  try {
    const docRef = doc(db, "tactical_units", id);
    await updateDoc(docRef, { subCommand, operators });
    return res.json({ success: true, message: "Unidade tática atualizada!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar unidade tática." });
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
    console.error("Erro ao buscar registros prisionais:", error);
    return res.status(500).json({ error: "Erro ao buscar registros prisionais." });
  }
});

router.post("/prisional", authMiddleware, checkPermission("prisional"), async (req: AuthRequest, res: Response) => {
  const { prisonerName, passport, crimes, penalty, fine, bail, rawText, imageUrl, evidenceUrl, rgUrl, quimicoUrl, residualUrl } = req.body;

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
      createdById: req.user!.id,
      createdByName: req.user!.name,
      createdByRole: req.user!.role,
      createdAt: new Date().toISOString()
    });
    return res.json({ success: true, message: "Ficha prisional registrada com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar ficha prisional:", error);
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
    console.error("Erro ao buscar cursos:", error);
    return res.status(500).json({ error: "Erro ao buscar cursos." });
  }
});

router.post("/courses", authMiddleware, checkPermission("users"), async (req: AuthRequest, res: Response) => {
  const { title, description, videoUrl, materialsUrl } = req.body;

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
    console.error("Erro ao criar curso:", error);
    return res.status(500).json({ error: "Erro ao criar curso." });
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
    console.error("Erro ao buscar orientações:", error);
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
    console.error("Erro ao criar orientação:", error);
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
    console.error("Create PTR error:", error);
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

// --- Armazenamento Temporário de Imagens e Rotas do Módulo Prisional ---
const tempImages = new Map<string, string>();

router.post("/prisional/temp-image", async (req: Request, res: Response) => {
  try {
    const { base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "Nenhuma imagem fornecida." });
    }

    // Validar formato base64 de imagem
    if (!base64.startsWith("data:image/")) {
      return res.status(400).json({ error: "Formato de arquivo inválido. Deve ser uma imagem base64." });
    }

    // Validar tamanho (máximo 5MB)
    const sizeInBytes = Buffer.from(base64.split(",")[1] || "", "base64").length;
    if (sizeInBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "A imagem excede o limite de 5MB." });
    }

    const id = crypto.randomUUID();
    tempImages.set(id, base64);

    // Deletar da memória após 1 hora para evitar vazamento
    setTimeout(() => {
      tempImages.delete(id);
    }, 60 * 60 * 1000);

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const url = `${protocol}://${host}/api/prisional/temp-image/${id}`;

    return res.json({ success: true, url });
  } catch (error) {
    console.error("Erro ao processar imagem temporária:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

router.get("/prisional/temp-image/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).send("ID inválido.");
  }

  const base64 = tempImages.get(id);
  if (!base64) {
    return res.status(404).send("Imagem expirada ou não encontrada.");
  }

  try {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send("Formato de imagem inválido.");
    }
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(buffer);
  } catch (error) {
    console.error("Erro ao renderizar imagem temporária:", error);
    return res.status(500).send("Erro interno.");
  }
});

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
  } catch (error) {
    console.error(`Erro ao recuperar imagem (${fieldName}):`, error);
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
    const response = await fetch("https://burp.com.br/calculadora/");
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

                const res = await fetch('/api/prisional/temp-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ base64 })
                });
                if (res.ok) {
                  const data = await res.json();
                  fileUrls[key] = data.url;
                }
              } catch (e) {
                console.error("Erro ao subir imagem para link temporário:", e);
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
            console.error("Erro ao copiar ficha:", err);
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
    console.error("Erro no proxy da calculadora:", error);
    res.status(500).send("Erro ao carregar a calculadora.");
  }
});

// ------------------------------------------------------------------
// SOCIAL NETWORK (FEED / POSTS) MODULE
// ------------------------------------------------------------------

router.get("/posts", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postsRef = collection(db, "posts");
    const snapshot = await getDocs(query(postsRef, orderBy("createdAt", "desc")));
    
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(posts);
  } catch (error) {
    console.error("Erro ao buscar posts:", error);
    res.status(500).json({ error: "Erro interno ao buscar posts" });
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
    console.error("Erro ao criar post:", error);
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
    console.error("Erro ao dar like:", error);
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
    console.error("Erro ao comentar:", error);
    res.status(500).json({ error: "Erro interno ao adicionar comentário" });
  }
});

export default router;
