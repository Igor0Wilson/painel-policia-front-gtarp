import { initializeApp, getApps, getApp } from "firebase/app";
import * as firestore from "firebase/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const useLocalDb = process.env.USE_LOCAL_DB === "true";

let db: any;
let firebaseApp: any;
let isLocalActive = useLocalDb;

if (!useLocalDb) {
  try {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error(
        "Credenciais do Firebase ausentes nas variáveis de ambiente."
      );
    }

    firebaseApp =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = firestore.getFirestore(firebaseApp);
  } catch {
    isLocalActive = true;
    db = { type: "local" };
  }
} else {
  db = { type: "local" };
}

// -------------------------------------------------------------
// LOCAL DB IMPLEMENTATION (only used when USE_LOCAL_DB=true)
// -------------------------------------------------------------
const dbPath = process.env.VERCEL ? "/tmp/db.json" : path.resolve(process.cwd(), "db.json");

function readDb() {
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      users: {},
      announcements: {},
      reports: {},
      promotions: {},
      copom: {},
      tickets: {},
      absences: {},
      courses: {},
      config: {
        permissions: {
          coronel: [
            "dashboard", "comandos", "copom", "alinhamento", "ausencias",
            "exoneracoes", "relatorios", "tickets", "promocoes", "corregedoria",
            "calculadora", "informativos", "permissions", "users", "prisional", "cursos", "chat",
          ],
          "tenente-coronel": [
            "dashboard", "comandos", "copom", "alinhamento", "ausencias",
            "exoneracoes", "relatorios", "tickets", "promocoes", "corregedoria",
            "calculadora", "informativos", "permissions", "users", "prisional", "cursos", "chat",
          ],
          major: [
            "dashboard", "comandos", "copom", "alinhamento", "ausencias",
            "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          capitao: [
            "dashboard", "comandos", "copom", "alinhamento", "ausencias",
            "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "1-tenente": [
            "dashboard", "comandos", "copom", "alinhamento", "ausencias",
            "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "2-tenente": [
            "dashboard", "comandos", "copom", "alinhamento", "ausencias",
            "relatorios", "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "1-sargento": [
            "dashboard", "comandos", "copom", "ausencias", "relatorios",
            "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "2-sargento": [
            "dashboard", "comandos", "copom", "ausencias", "relatorios",
            "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "3-sargento": [
            "dashboard", "comandos", "copom", "ausencias", "relatorios",
            "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          cabo: [
            "dashboard", "comandos", "copom", "ausencias", "relatorios",
            "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "1-soldado": [
            "dashboard", "copom", "ausencias", "relatorios",
            "calculadora", "informativos", "prisional", "cursos", "corregedoria", "chat",
          ],
          "2-soldado": [
            "dashboard", "copom", "calculadora", "informativos", "prisional", "cursos", "chat",
          ],
        },
      },
    };
    try {
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), "utf8");
    } catch {
      // Silently fail if filesystem is read-only (e.g., Vercel)
    }
    return initialData;
  }
  try {
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Silently fail — will retry on next operation
  }
}

class LocalDocRef {
  constructor(public collectionName: string, public id: string) {}
}

class LocalCollectionRef {
  constructor(public collectionName: string) {}
}

class LocalQueryRef {
  constructor(
    public collectionRef: LocalCollectionRef,
    public constraints: any[]
  ) {}
}

// -------------------------------------------------------------
// WRAPPERS / EXPORTS
// -------------------------------------------------------------
export { db };

export function doc(dbInstance: any, collectionName: string, id?: string) {
  if (isLocalActive || (dbInstance && dbInstance.type === "local")) {
    if (dbInstance instanceof LocalCollectionRef) {
      return new LocalDocRef(dbInstance.collectionName, collectionName);
    }
    return new LocalDocRef(collectionName, id || "");
  }
  return firestore.doc(dbInstance, collectionName, id!);
}

export function collection(dbInstance: any, collectionName: string) {
  if (isLocalActive || (dbInstance && dbInstance.type === "local")) {
    return new LocalCollectionRef(collectionName);
  }
  return firestore.collection(dbInstance, collectionName);
}

export function query(collectionRef: any, ...constraints: any[]) {
  if (isLocalActive || collectionRef instanceof LocalCollectionRef) {
    return new LocalQueryRef(collectionRef, constraints);
  }
  return firestore.query(collectionRef, ...constraints);
}

export function where(field: string, op: any, value: any) {
  if (isLocalActive) {
    return { type: "where", field, op, value };
  }
  return firestore.where(field, op, value);
}

export function orderBy(field: string, direction: any = "asc") {
  if (isLocalActive) {
    return { type: "orderBy", field, direction };
  }
  return firestore.orderBy(field, direction);
}

export function limit(n: number) {
  if (isLocalActive) {
    return { type: "limit", limit: n };
  }
  return firestore.limit(n);
}

export async function getDoc(docRef: any) {
  if (isLocalActive || docRef instanceof LocalDocRef) {
    const dbData = readDb();
    const colKey = docRef.collectionName.replace(/\//g, "_");
    const collectionData = dbData[colKey] || {};
    const docData = collectionData[docRef.id];
    return {
      exists: () => docData !== undefined,
      data: () => docData,
      id: docRef.id,
    };
  }
  try {
    return await firestore.getDoc(docRef);
  } catch {
    // Any Firestore error — fall back to local DB
    isLocalActive = true;
    return getDoc(docRef);
  }
}

export async function setDoc(docRef: any, data: any) {
  if (isLocalActive || docRef instanceof LocalDocRef) {
    const dbData = readDb();
    const colKey = docRef.collectionName.replace(/\//g, "_");
    if (!dbData[colKey]) dbData[colKey] = {};
    dbData[colKey][docRef.id] = { ...data };
    writeDb(dbData);
    return;
  }
  try {
    return await firestore.setDoc(docRef, data);
  } catch {
    isLocalActive = true;
    return setDoc(docRef, data);
  }
}

export async function updateDoc(docRef: any, data: any) {
  if (isLocalActive || docRef instanceof LocalDocRef) {
    const dbData = readDb();
    const colKey = docRef.collectionName.replace(/\//g, "_");
    if (!dbData[colKey]) dbData[colKey] = {};
    const existing = dbData[colKey][docRef.id] || {};
    dbData[colKey][docRef.id] = { ...existing, ...data };
    writeDb(dbData);
    return;
  }
  try {
    return await firestore.updateDoc(docRef, data);
  } catch {
    isLocalActive = true;
    return updateDoc(docRef, data);
  }
}

export async function addDoc(collectionRef: any, data: any) {
  if (isLocalActive || collectionRef instanceof LocalCollectionRef) {
    const dbData = readDb();
    const colKey = collectionRef.collectionName.replace(/\//g, "_");
    if (!dbData[colKey]) dbData[colKey] = {};
    const generatedId = Math.random().toString(36).substring(2, 15);
    dbData[colKey][generatedId] = { ...data, id: generatedId };
    writeDb(dbData);
    return { id: generatedId };
  }
  try {
    return await firestore.addDoc(collectionRef, data);
  } catch {
    isLocalActive = true;
    return addDoc(collectionRef, data);
  }
}

export async function deleteDoc(docRef: any) {
  if (isLocalActive || docRef instanceof LocalDocRef) {
    const dbData = readDb();
    const colKey = docRef.collectionName.replace(/\//g, "_");
    if (dbData[colKey] && dbData[colKey][docRef.id]) {
      delete dbData[colKey][docRef.id];
      writeDb(dbData);
    }
    return;
  }
  try {
    return await firestore.deleteDoc(docRef);
  } catch {
    isLocalActive = true;
    return deleteDoc(docRef);
  }
}

export async function getDocs(queryOrCollection: any) {
  if (
    isLocalActive ||
    queryOrCollection instanceof LocalCollectionRef ||
    queryOrCollection instanceof LocalQueryRef
  ) {
    const dbData = readDb();
    let collectionName = "";
    let constraints: any[] = [];
    if (queryOrCollection instanceof LocalCollectionRef) {
      collectionName = queryOrCollection.collectionName;
    } else if (queryOrCollection instanceof LocalQueryRef) {
      collectionName = queryOrCollection.collectionRef.collectionName;
      constraints = queryOrCollection.constraints;
    }
    const colKey = collectionName.replace(/\//g, "_");
    const collectionData = dbData[colKey] || {};
    let docs = Object.keys(collectionData).map((id) => ({
      id,
      exists: () => true,
      data: () => collectionData[id],
    }));
    for (const c of constraints) {
      if (c.type === "where") {
        docs = docs.filter((d) => {
          const val = d.data()[c.field];
          if (c.op === "==") return val === c.value;
          if (c.op === "!=") return val !== c.value;
          if (c.op === ">") return val > c.value;
          if (c.op === "<") return val < c.value;
          if (c.op === "array-contains")
            return Array.isArray(val) && val.includes(c.value);
          return true;
        });
      }
    }
    const orderConstraint = constraints.find((c) => c.type === "orderBy");
    if (orderConstraint) {
      const field = orderConstraint.field;
      const desc = orderConstraint.direction === "desc";
      docs.sort((a, b) => {
        const valA = a.data()[field];
        const valB = b.data()[field];
        if (valA === undefined || valB === undefined) return 0;
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }
    const limitConstraint = constraints.find((c) => c.type === "limit");
    if (limitConstraint) {
      docs = docs.slice(0, limitConstraint.limit);
    }
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback),
    };
  }
  try {
    return await firestore.getDocs(queryOrCollection);
  } catch {
    isLocalActive = true;
    return getDocs(queryOrCollection);
  }
}
