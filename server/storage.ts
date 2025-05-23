import { 
  User, InsertUser, 
  Product, InsertProduct,
  Workshop, InsertWorkshop,
  Batch, InsertBatch,
  BatchHistory, InsertBatchHistory
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private workshops: Map<number, Workshop>;
  private batches: Map<number, Batch>;
  private batchHistories: Map<number, BatchHistory>;
  
  private currentUserId: number;
  private currentProductId: number;
  private currentWorkshopId: number;
  private currentBatchId: number;
  private currentHistoryId: number;
  private batchCodeCounter: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.workshops = new Map();
    this.batches = new Map();
    this.batchHistories = new Map();
    
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentWorkshopId = 1;
    this.currentBatchId = 1;
    this.currentHistoryId = 1;
    this.batchCodeCounter = 1;

    this.seedData();
  }

  private seedData() {
    // Seed users
    const admin: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "admin123",
      role: "admin",
      permissions: "view,register,edit"
    };
    this.users.set(admin.id, admin);

    const supervisor: User = {
      id: this.currentUserId++,
      username: "supervisor",
      password: "super123", 
      role: "production_supervisor",
      permissions: "view,edit"
    };
    this.users.set(supervisor.id, supervisor);

    // Seed products
    const product1: Product = {
      id: this.currentProductId++,
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
    };
    this.products.set(product1.id, product1);

    const product2: Product = {
      id: this.currentProductId++,
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
    };
    this.products.set(product2.id, product2);

    // Seed workshops
    const workshop1: Workshop = {
      id: this.currentWorkshopId++,
      name: "Oficina de Costura Silva",
      manager: "Maria Silva",
      phone: "(11) 99999-1234",
      address: "Rua das Flores, 123 - Vila Industrial",
      serviceType: "Costura, Acabamento",
      capacity: "50 peças/dia",
      color: "#3B82F6"
    };
    this.workshops.set(workshop1.id, workshop1);

    const workshop2: Workshop = {
      id: this.currentWorkshopId++,
      name: "Atelier Bordados Premium",
      manager: "Ana Costa", 
      phone: "(11) 98888-5678",
      address: "Av. Central, 456 - Centro",
      serviceType: "Bordado, Aplicações",
      capacity: "30 peças/dia",
      color: "#F59E0B"
    };
    this.workshops.set(workshop2.id, workshop2);

    // Seed batches
    const batch1: Batch = {
      id: this.currentBatchId++,
      code: "051",
      productId: product1.id,
      quantity: 100,
      cutDate: new Date("2024-12-23"),
      status: "external_workshop",
      workshopId: workshop1.id,
      sentToProductionDate: new Date("2024-12-23T14:30:00"),
      expectedReturnDate: new Date("2024-12-25"),
      actualReturnDate: null,
      conferenceResult: null,
      observations: "Tecido cortado conforme especificação. Atenção especial para o alinhamento das listras.",
      imageUrl: null
    };
    this.batches.set(batch1.id, batch1);

    const batch2: Batch = {
      id: this.currentBatchId++,
      code: "025",
      productId: product2.id,
      quantity: 75,
      cutDate: new Date("2024-12-25"),
      status: "external_workshop", 
      workshopId: workshop2.id,
      sentToProductionDate: new Date("2024-12-25T09:00:00"),
      expectedReturnDate: new Date("2024-12-26"),
      actualReturnDate: null,
      conferenceResult: null,
      observations: "Lote para produção urgente",
      imageUrl: null
    };
    this.batches.set(batch2.id, batch2);

    const batch3: Batch = {
      id: this.currentBatchId++,
      code: "040",
      productId: product1.id,
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
    };
    this.batches.set(batch3.id, batch3);

    this.batchCodeCounter = 52; // Next code will be 052
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...productData };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Workshop methods
  async getWorkshop(id: number): Promise<Workshop | undefined> {
    return this.workshops.get(id);
  }

  async getAllWorkshops(): Promise<Workshop[]> {
    return Array.from(this.workshops.values());
  }

  async createWorkshop(insertWorkshop: InsertWorkshop): Promise<Workshop> {
    const id = this.currentWorkshopId++;
    const workshop: Workshop = { ...insertWorkshop, id };
    this.workshops.set(id, workshop);
    return workshop;
  }

  async updateWorkshop(id: number, workshopData: Partial<InsertWorkshop>): Promise<Workshop | undefined> {
    const workshop = this.workshops.get(id);
    if (!workshop) return undefined;
    
    const updatedWorkshop = { ...workshop, ...workshopData };
    this.workshops.set(id, updatedWorkshop);
    return updatedWorkshop;
  }

  async deleteWorkshop(id: number): Promise<boolean> {
    return this.workshops.delete(id);
  }

  // Batch methods
  async getBatch(id: number): Promise<Batch | undefined> {
    return this.batches.get(id);
  }

  async getBatchByCode(code: string): Promise<Batch | undefined> {
    return Array.from(this.batches.values()).find(batch => batch.code === code);
  }

  async getAllBatches(): Promise<Batch[]> {
    return Array.from(this.batches.values());
  }

  async createBatch(insertBatch: InsertBatch): Promise<Batch> {
    const id = this.currentBatchId++;
    const code = String(this.batchCodeCounter++).padStart(3, '0');
    const batch: Batch = { ...insertBatch, id, code };
    this.batches.set(id, batch);
    return batch;
  }

  async updateBatch(id: number, batchData: Partial<Batch>): Promise<Batch | undefined> {
    const batch = this.batches.get(id);
    if (!batch) return undefined;
    
    const updatedBatch = { ...batch, ...batchData };
    this.batches.set(id, updatedBatch);
    return updatedBatch;
  }

  async deleteBatch(id: number): Promise<boolean> {
    return this.batches.delete(id);
  }

  // Batch History methods
  async getBatchHistory(batchId: number): Promise<BatchHistory[]> {
    return Array.from(this.batchHistories.values())
      .filter(history => history.batchId === batchId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async addBatchHistory(insertHistory: InsertBatchHistory): Promise<BatchHistory> {
    const id = this.currentHistoryId++;
    const history: BatchHistory = { 
      ...insertHistory, 
      id, 
      timestamp: new Date() 
    };
    this.batchHistories.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
