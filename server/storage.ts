import { 
  users, products, workshops, batches, batchHistory, batchProducts, invoices, invoiceBatches,
  type User, type InsertUser, 
  type Product, type InsertProduct,
  type Workshop, type InsertWorkshop,
  type Batch, type InsertBatch,
  type BatchHistory, type InsertBatchHistory,
  type BatchProduct, type InsertBatchProduct,
  type Invoice, type InsertInvoice,
  type InvoiceBatch, type InsertInvoiceBatch
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, lte, isNull, isNotNull, and, or, not, sql } from "drizzle-orm";

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
  getWorkshopByScheduleOrder(order: number): Promise<Workshop | undefined>;
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

  // Financial Management - Invoices
  getInvoice(id: number): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByWorkshop(workshopId: number): Promise<Invoice[]>;
  getInvoicesByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Invoice Batches
  getInvoiceBatches(invoiceId: number): Promise<InvoiceBatch[]>;
  addBatchesToInvoice(invoiceId: number, batches: InsertInvoiceBatch[]): Promise<InvoiceBatch[]>;
  removeBatchFromInvoice(invoiceId: number, batchId: number): Promise<boolean>;

  // Financial Reports
  getUnpaidBatchesByWorkshop(workshopId: number, startDate: Date, endDate: Date): Promise<Batch[]>;
  getWorkshopFinancialSummary(startDate: Date, endDate: Date): Promise<any[]>;
  
  // Batch Products
  getBatchProducts(batchId: number): Promise<BatchProduct[]>;
}

export class DatabaseStorage implements IStorage {
  private batchCodeCounter: number = 1;

  constructor() {
    this.seedData();
    this.initializeBatchCounter();
  }

  private async initializeBatchCounter() {
    try {
      const latestBatch = await db
        .select({ code: batches.code })
        .from(batches)
        .orderBy(desc(batches.code))
        .limit(1);
      
      if (latestBatch.length > 0) {
        this.batchCodeCounter = parseInt(latestBatch[0].code) + 1;
      }
    } catch (error) {
      console.log('No existing batches found, starting from 001');
      this.batchCodeCounter = 1;
    }
  }

  private async seedData() {
    try {
      // Check if data already exists
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) return;

      // Skip seeding for now to avoid type conflicts
      console.log('Skipping seed data to prevent type conflicts');

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
    return (result.rowCount || 0) > 0;
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      return await db.select().from(products);
    } catch (error) {
      console.error('Database error in getAllProducts:', error);
      throw error;
    }
  }

  async createProduct(insertProduct: any): Promise<Product> {
    try {
      console.log('Creating product with data:', JSON.stringify(insertProduct, null, 2));
      
      // Map the data to match database column names
      const productData = {
        name: insertProduct.name || '',
        code: insertProduct.code || '',
        description: insertProduct.description || null,
        fabricType: insertProduct.fabricType || '',
        fabricMetersPerPiece: insertProduct.fabricMetersPerPiece || '',
        notions: insertProduct.notions || [],
        notes: insertProduct.notes || null,
        availableColors: insertProduct.availableColors || [],
        availableSizes: insertProduct.availableSizes || [],
        productionValue: insertProduct.productionValue || '0'
      };
      
      console.log('Mapped product data:', JSON.stringify(productData, null, 2));
      
      const [product] = await db.insert(products).values(productData).returning();
      console.log('Product created successfully:', product);
      return product;
    } catch (error: any) {
      console.error('Database error in createProduct:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(productData).where(eq(products.id, id)).returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Workshop methods
  async getWorkshop(id: number): Promise<Workshop | undefined> {
    const [workshop] = await db.select().from(workshops).where(eq(workshops.id, id));
    return workshop || undefined;
  }

  async getWorkshopByScheduleOrder(order: number): Promise<Workshop | undefined> {
    const [workshop] = await db.select().from(workshops).where(eq(workshops.scheduleOrder, order));
    return workshop || undefined;
  }

  async getAllWorkshops(): Promise<Workshop[]> {
    return await db.select().from(workshops).orderBy(workshops.scheduleOrder);
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
    // Get all batches with their first product for display purposes
    const batchesWithProducts = await db
      .select({
        id: batches.id,
        code: batches.code,
        cutDate: batches.cutDate,
        status: batches.status,
        workshopId: batches.workshopId,
        sentToProductionDate: batches.sentToProductionDate,
        expectedReturnDate: batches.expectedReturnDate,
        actualReturnDate: batches.actualReturnDate,
        conferenceResult: batches.conferenceResult,
        observations: batches.observations,
        imageUrl: batches.imageUrl,
        productId: batchProducts.productId,
        quantity: batchProducts.quantity,
      })
      .from(batches)
      .leftJoin(batchProducts, eq(batches.id, batchProducts.batchId))
      .orderBy(desc(batches.id));

    // Group by batch ID and take the first product for each batch
    const batchMap = new Map();
    for (const row of batchesWithProducts) {
      if (!batchMap.has(row.id)) {
        batchMap.set(row.id, row);
      }
    }

    return Array.from(batchMap.values());
  }

  async createBatch(batchData: any): Promise<Batch> {
    // Get the highest existing batch code number
    try {
      const latestBatch = await db
        .select({ code: batches.code })
        .from(batches)
        .orderBy(desc(batches.code))
        .limit(1);
      
      let nextNumber = 1;
      if (latestBatch.length > 0) {
        const latestCode = latestBatch[0].code;
        // Extract number from code (handle non-numeric codes gracefully)
        const codeNum = parseInt(latestCode);
        if (!isNaN(codeNum)) {
          nextNumber = codeNum + 1;
        }
      }
      
      const code = nextNumber.toString().padStart(3, '0');
      
      // Extract products from batchData
      const { products, ...batchFields } = batchData;
      
      // Create the batch first
      const [batch] = await db.insert(batches).values({ 
        ...batchFields, 
        code 
      }).returning();
    
    // Create batch products if provided
    if (products && products.length > 0) {
      for (const product of products) {
        await db.insert(batchProducts).values({
          batchId: batch.id,
          productId: product.productId,
          quantity: product.quantity,
          selectedColor: product.selectedColor || null,
          selectedSize: product.selectedSize || null,
        });
      }
    }
    
      // Add history entry
      await db.insert(batchHistory).values({
        batchId: batch.id,
        action: "Lote criado",
        userId: 1,
        notes: null,
        timestamp: new Date()
      });
      
      return batch;
    } catch (error) {
      console.error('Error creating batch:', error);
      throw error;
    }
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

  // Financial Management Implementation
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByWorkshop(workshopId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.workshopId, workshopId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(
        and(
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate)
        )
      )
      .orderBy(desc(invoices.issueDate));
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set(invoiceData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getInvoiceBatches(invoiceId: number): Promise<InvoiceBatch[]> {
    return await db
      .select()
      .from(invoiceBatches)
      .where(eq(invoiceBatches.invoiceId, invoiceId));
  }

  async addBatchesToInvoice(invoiceId: number, batchData: InsertInvoiceBatch[]): Promise<InvoiceBatch[]> {
    const result = await db
      .insert(invoiceBatches)
      .values(batchData)
      .returning();
    return result;
  }

  async removeBatchFromInvoice(invoiceId: number, batchId: number): Promise<boolean> {
    const result = await db
      .delete(invoiceBatches)
      .where(
        and(
          eq(invoiceBatches.invoiceId, invoiceId),
          eq(invoiceBatches.batchId, batchId)
        )
      );
    return (result.rowCount || 0) > 0;
  }

  async getUnpaidBatchesByWorkshop(workshopId: number, startDate: Date, endDate: Date): Promise<Batch[]> {
    return await db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.workshopId, workshopId),
          eq(batches.paid, false),
          gte(batches.cutDate, startDate),
          lte(batches.cutDate, endDate)
        )
      )
      .orderBy(desc(batches.cutDate));
  }

  async getWorkshopFinancialSummary(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Get all workshops ordered by ID (registration order)
      const allWorkshops = await db
        .select()
        .from(workshops)
        .orderBy(workshops.id);
      
      const workshopSummary = await Promise.all(
        allWorkshops.map(async (workshop) => {
          // Get unpaid batches for this workshop in the date range
          const unpaidBatches = await this.getUnpaidBatchesByWorkshop(workshop.id, startDate, endDate);
          
          // Get paid batches count by checking invoices
          const paidBatchesResult = await db
            .select({ count: sql<number>`count(distinct ${batches.id})` })
            .from(batches)
            .innerJoin(invoiceBatches, eq(batches.id, invoiceBatches.batchId))
            .innerJoin(invoices, eq(invoiceBatches.invoiceId, invoices.id))
            .where(
              and(
                eq(batches.workshopId, workshop.id),
                eq(invoices.status, 'paid'),
                gte(batches.cutDate, startDate),
                lte(batches.cutDate, endDate)
              )
            );
          
          const paidBatchesCount = paidBatchesResult[0]?.count || 0;
          
          // Calculate total unpaid value
          let totalUnpaidValue = 0;
          for (const batch of unpaidBatches) {
            const batchProducts = await db
              .select()
              .from(batchProducts)
              .innerJoin(products, eq(batchProducts.productId, products.id))
              .where(eq(batchProducts.batchId, batch.id));
            
            for (const bp of batchProducts) {
              const productionValue = parseFloat(bp.products.productionValue?.toString() || '0');
              totalUnpaidValue += bp.batch_products.quantity * productionValue;
            }
          }
          
          return {
            workshopId: workshop.id,
            workshopName: workshop.name,
            pendingBatchCount: unpaidBatches.length,
            paidBatchCount: paidBatchesCount,
            totalUnpaidValue: totalUnpaidValue.toFixed(2)
          };
        })
      );
      
      // Return all workshops (even with 0 values) in registration order
      return workshopSummary;
    } catch (error) {
      console.error('Error in getWorkshopFinancialSummary:', error);
      return [];
    }
  }

  async getBatchProducts(batchId: number): Promise<BatchProduct[]> {
    try {
      const products = await db.select()
        .from(batchProducts)
        .where(eq(batchProducts.batchId, batchId));
      
      return products;
    } catch (error) {
      console.error('Error fetching batch products:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
