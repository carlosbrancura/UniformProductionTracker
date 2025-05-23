import { 
  User, InsertUser, 
  Product, InsertProduct,
  Workshop, InsertWorkshop,
  Batch, InsertBatch,
  BatchHistory, InsertBatchHistory,
  users, products, workshops, batches, batchHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Workshops
  getWorkshop(id: number): Promise<Workshop | undefined>;
  getAllWorkshops(): Promise<Workshop[]>;
  createWorkshop(workshop: InsertWorkshop): Promise<Workshop>;
  updateWorkshop(id: number, workshop: Partial<InsertWorkshop>): Promise<Workshop | undefined>;
  deleteWorkshop(id: number): Promise<boolean>;

  // Batches
  getBatch(id: number): Promise<Batch | undefined>;
  getBatchByCode(code: string): Promise<Batch | undefined>;
  getAllBatches(): Promise<Batch[]>;
  createBatch(batch: InsertBatch): Promise<Batch>;
  updateBatch(id: number, batch: Partial<Batch>): Promise<Batch | undefined>;
  deleteBatch(id: number): Promise<boolean>;

  // Batch History
  getBatchHistory(batchId: number): Promise<BatchHistory[]>;
  addBatchHistory(history: InsertBatchHistory): Promise<BatchHistory>;
}

export class DatabaseStorage implements IStorage {
  private batchCodeCounter: number = 52; // Starting from 052 based on seed data

  constructor() {
    this.seedData();
  }

  private async seedData() {
    try {
      // Check if data already exists
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) return;

      // Seed users
      await db.insert(users).values([
        {
          username: "admin",
          password: "admin123",
          role: "admin",
          permissions: "view,register,edit"
        },
        {
          username: "supervisor",
          password: "super123", 
          role: "production_supervisor",
          permissions: "view,edit"
        }
      ]);

      // Seed products
      await db.insert(products).values([
        {
          name: "Camisa Social Masculina",
          code: "CAMISA-001",
          description: "Camisa social masculina em tecido misto, gola italiana, manga longa com punho duplo.",
          fabricType: "Algodão/Poliéster (60/40)",
          fabricMetersPerPiece: "1.8m",
          notions: [
            { name: "Botões", quantity: "8 unidades" },
            { name: "Entretela de gola", quantity: "0.1m" },
            { name: "Linha de costura", quantity: "1 cone" }
          ],
          notes: "Atenção especial para alinhamento das listras"
        },
        {
          name: "Calça Social Feminina", 
          code: "CALCA-002",
          description: "Calça social feminina alfaiataria, cintura alta, corte reto, com forro parcial.",
          fabricType: "Lã/Poliéster (70/30)",
          fabricMetersPerPiece: "1.2m",
          notions: [
            { name: "Zíper invisível", quantity: "1 unidade" },
            { name: "Forro viscose", quantity: "0.6m" },
            { name: "Linha de costura", quantity: "1 cone" }
          ],
          notes: null
        }
      ]);

      // Seed workshops
      await db.insert(workshops).values([
        {
          name: "Oficina de Costura Silva",
          manager: "Maria Silva",
          phone: "(11) 99999-1234",
          address: "Rua das Flores, 123 - Vila Industrial",
          serviceType: "Costura, Acabamento",
          capacity: "50 peças/dia",
          color: "#3B82F6"
        },
        {
          name: "Atelier Bordados Premium",
          manager: "Ana Costa", 
          phone: "(11) 98888-5678",
          address: "Av. Central, 456 - Centro",
          serviceType: "Bordado, Aplicações",
          capacity: "30 peças/dia",
          color: "#F59E0B"
        }
      ]);

      // Seed batches
      await db.insert(batches).values([
        {
          code: "051",
          productId: 1,
          quantity: 100,
          cutDate: new Date("2024-12-23"),
          status: "external_workshop",
          workshopId: 1,
          sentToProductionDate: new Date("2024-12-23T14:30:00"),
          expectedReturnDate: new Date("2024-12-25"),
          actualReturnDate: null,
          conferenceResult: null,
          observations: "Tecido cortado conforme especificação. Atenção especial para o alinhamento das listras.",
          imageUrl: null
        },
        {
          code: "025",
          productId: 2,
          quantity: 75,
          cutDate: new Date("2024-12-25"),
          status: "external_workshop", 
          workshopId: 2,
          sentToProductionDate: new Date("2024-12-25T09:00:00"),
          expectedReturnDate: new Date("2024-12-26"),
          actualReturnDate: null,
          conferenceResult: null,
          observations: "Lote para produção urgente",
          imageUrl: null
        },
        {
          code: "040",
          productId: 1,
          quantity: 50,
          cutDate: new Date("2024-12-25"),
          status: "internal_production",
          workshopId: null,
          sentToProductionDate: new Date("2024-12-25T08:00:00"),
          expectedReturnDate: new Date("2024-12-28"),
          actualReturnDate: null,
          conferenceResult: null,
          observations: "Produção interna - linha de produção 2",
          imageUrl: null
        }
      ]);
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(productData).where(eq(products.id, id)).returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
  }

  // Workshop methods
  async getWorkshop(id: number): Promise<Workshop | undefined> {
    const [workshop] = await db.select().from(workshops).where(eq(workshops.id, id));
    return workshop || undefined;
  }

  async getAllWorkshops(): Promise<Workshop[]> {
    return await db.select().from(workshops);
  }

  async createWorkshop(insertWorkshop: InsertWorkshop): Promise<Workshop> {
    const [workshop] = await db.insert(workshops).values(insertWorkshop).returning();
    return workshop;
  }

  async updateWorkshop(id: number, workshopData: Partial<InsertWorkshop>): Promise<Workshop | undefined> {
    const [workshop] = await db.update(workshops).set(workshopData).where(eq(workshops.id, id)).returning();
    return workshop || undefined;
  }

  async deleteWorkshop(id: number): Promise<boolean> {
    const result = await db.delete(workshops).where(eq(workshops.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Batch methods
  async getBatch(id: number): Promise<Batch | undefined> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, id));
    return batch || undefined;
  }

  async getBatchByCode(code: string): Promise<Batch | undefined> {
    const [batch] = await db.select().from(batches).where(eq(batches.code, code));
    return batch || undefined;
  }

  async getAllBatches(): Promise<Batch[]> {
    return await db.select().from(batches);
  }

  async createBatch(insertBatch: InsertBatch): Promise<Batch> {
    const code = this.batchCodeCounter.toString().padStart(3, '0');
    this.batchCodeCounter++;
    const [batch] = await db.insert(batches).values({ ...insertBatch, code }).returning();
    return batch;
  }

  async updateBatch(id: number, batchData: Partial<Batch>): Promise<Batch | undefined> {
    const [batch] = await db.update(batches).set(batchData).where(eq(batches.id, id)).returning();
    return batch || undefined;
  }

  async deleteBatch(id: number): Promise<boolean> {
    const result = await db.delete(batches).where(eq(batches.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Batch History methods
  async getBatchHistory(batchId: number): Promise<BatchHistory[]> {
    return await db.select().from(batchHistory).where(eq(batchHistory.batchId, batchId)).orderBy(desc(batchHistory.timestamp));
  }

  async addBatchHistory(insertHistory: InsertBatchHistory): Promise<BatchHistory> {
    const [history] = await db.insert(batchHistory).values({
      ...insertHistory,
      timestamp: new Date()
    }).returning();
    return history;
  }
}

export const storage = new DatabaseStorage();
