import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertWorkshopSchema, insertBatchSchema, insertBatchHistorySchema } from "@shared/schema";
import { db, pool } from "./db";
import { batches, batchHistory, products, batchProducts } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { productsService } from "./products-service";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Products API - Fixed
  app.get("/api/products", async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM products ORDER BY id DESC`);
      res.json(result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        fabricType: row.fabric_type,
        fabricMetersPerPiece: row.fabric_meters_per_piece,
        notions: row.notions,
        notes: row.notes,
        availableColors: row.available_colors,
        availableSizes: row.available_sizes,
        productionValue: row.production_value
      })));
    } catch (error: any) {
      console.error('Products error:', error);
      res.json([]); // Return empty array instead of error
    }
  });

  app.post("/api/products-new", async (req, res) => {
    try {
      console.log('Received product data:', req.body);
      const productData = req.body;
      
      const result = await pool.query(`
        INSERT INTO products (
          name, code, description, fabric_type, fabric_meters_per_piece,
          notions, notes, available_colors, available_sizes, production_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        productData.name || '',
        productData.code || `PROD_${Date.now()}`,
        productData.description || null,
        productData.fabricType || '',
        productData.fabricMetersPerPiece || '0',
        JSON.stringify(productData.notions || []),
        productData.notes || null,
        JSON.stringify(productData.availableColors || []),
        JSON.stringify(productData.availableSizes || []),
        productData.productionValue || '0'
      ]);

      console.log('Product created:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Product creation error:', error);
      res.status(500).json({ message: "Failed to create product", error: error.message });
    }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });



  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Temporary validation bypass for new fields
      const productData = {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        fabricType: req.body.fabricType,
        fabricMetersPerPiece: req.body.fabricMetersPerPiece,
        notions: req.body.notions,
        notes: req.body.notes,
        availableColors: req.body.availableColors || [],
        availableSizes: req.body.availableSizes || [],
        productionValue: req.body.productionValue || '0'
      };
      
      const product = await storage.updateProduct(id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error('Product update error:', error);
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if product is used in any batches
      const batchesUsingProduct = await db
        .select()
        .from(batchProducts)
        .where(eq(batchProducts.productId, id))
        .limit(1);
      
      if (batchesUsingProduct.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir produto que está sendo usado em lotes" 
        });
      }
      
      const [deletedProduct] = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning();
      
      if (deletedProduct) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error: any) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product", error: error.message });
    }
  });

  // Workshops routes
  app.get("/api/workshops", async (req, res) => {
    try {
      const workshops = await storage.getAllWorkshops();
      res.json(workshops);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch workshops" });
    }
  });

  app.post("/api/workshops", async (req, res) => {
    try {
      const workshopData = insertWorkshopSchema.parse(req.body);
      const workshop = await storage.createWorkshop(workshopData);
      res.status(201).json(workshop);
    } catch (error) {
      res.status(400).json({ message: "Invalid workshop data" });
    }
  });

  app.put("/api/workshops/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const workshopData = insertWorkshopSchema.partial().parse(req.body);
      
      // Check if schedule order is already taken (excluding current workshop)
      if (workshopData.scheduleOrder) {
        const existingWorkshop = await storage.getWorkshopByScheduleOrder(workshopData.scheduleOrder);
        if (existingWorkshop && existingWorkshop.id !== id) {
          return res.status(400).json({ message: 'Esta ordem já está sendo usada por outra oficina' });
        }
      }
      
      const workshop = await storage.updateWorkshop(id, workshopData);
      if (!workshop) {
        return res.status(404).json({ message: "Workshop not found" });
      }
      res.json(workshop);
    } catch (error) {
      console.error("Workshop update error:", error);
      res.status(400).json({ message: "Invalid workshop data" });
    }
  });

  app.delete("/api/workshops/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWorkshop(id);
      if (!deleted) {
        return res.status(404).json({ message: "Workshop not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete workshop" });
    }
  });

  // Batches routes
  app.get("/api/batches", async (req, res) => {
    try {
      const batches = await storage.getAllBatches();
      res.json(batches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });

  app.get("/api/batches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const batch = await storage.getBatch(id);
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch" });
    }
  });

  app.post("/api/batches", async (req, res) => {
    try {
      console.log('Batch creation request:', req.body);
      
      // Check what fields are actually being sent
      const { products, cutDate, status, workshopId, expectedReturnDate, observations } = req.body;
      
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "Products array is required" });
      }
      
      if (!cutDate) {
        return res.status(400).json({ message: "Cut date is required" });
      }

      // Create the batch using storage service which handles multiple products
      // Fix timezone issue by creating dates at noon to avoid timezone shifts
      const createLocalDate = (dateString: string) => {
        const parts = dateString.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      };

      const batchData = {
        cutDate: createLocalDate(cutDate),
        status: status || "waiting",
        workshopId: workshopId && workshopId !== "internal" ? parseInt(workshopId) : null,
        expectedReturnDate: expectedReturnDate ? createLocalDate(expectedReturnDate) : null,
        observations: observations || null,
        products: products.map((p: any) => ({
          productId: parseInt(p.productId),
          quantity: parseInt(p.quantity),
          selectedColor: p.selectedColor,
          selectedSize: p.selectedSize,
        }))
      };

      const batch = await storage.createBatch(batchData);
      console.log('Batch created successfully:', batch);
      
      res.status(201).json(batch);
    } catch (error: any) {
      console.error("Batch creation error:", error);
      res.status(500).json({ message: "Database error", error: error.message });
    }
  });

  // Get batch products
  app.get("/api/batch-products/:batchId", async (req, res) => {
    try {
      const batchId = parseInt(req.params.batchId);
      const products = await db.select().from(batchProducts).where(eq(batchProducts.batchId, batchId));
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch products" });
    }
  });

  // Simple batch edit - pure SQL
  app.put("/api/batches/:id/simple", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, workshopId, observations, expectedReturnDate } = req.body;
      
      console.log('Batch update:', { id, status, workshopId, observations, expectedReturnDate });
      
      // Build SQL manually to avoid date conversion issues
      const updateFields = [];
      const params = [id];
      let paramIndex = 2;

      if (status) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
        
        // If marking as returned, set actual return date automatically
        if (status === 'returned') {
          updateFields.push(`actual_return_date = $${paramIndex}`);
          params.push(new Date().toISOString().split('T')[0]);
          paramIndex++;
        }
      }
      
      if (workshopId !== undefined) {
        updateFields.push(`workshop_id = $${paramIndex}`);
        params.push(workshopId);
        paramIndex++;
      }
      
      if (observations !== undefined) {
        updateFields.push(`observations = $${paramIndex}`);
        params.push(observations);
        paramIndex++;
      }
      
      if (expectedReturnDate !== undefined) {
        updateFields.push(`expected_return_date = $${paramIndex}`);
        params.push(expectedReturnDate);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const sql = `
        UPDATE batches 
        SET ${updateFields.join(', ')} 
        WHERE id = $1 
        RETURNING *
      `;

      console.log('SQL:', sql);
      console.log('Params:', params);

      const result = await pool.query(sql, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      console.log('Batch updated successfully');
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Batch update error:", error);
      res.status(500).json({ message: "Failed to update batch", error: error.message });
    }
  });

  app.delete("/api/batches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Delete batch products first
      await db.delete(batchProducts).where(eq(batchProducts.batchId, id));
      
      // Delete batch history
      await db.delete(batchHistory).where(eq(batchHistory.batchId, id));
      
      // Delete the batch
      const deleted = await storage.deleteBatch(id);
      if (!deleted) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      console.log(`Batch ${id} deleted successfully`);
      res.status(204).send();
    } catch (error: any) {
      console.error("Batch deletion error:", error);
      res.status(500).json({ message: "Failed to delete batch", error: error.message });
    }
  });

  // Batch history routes
  app.get("/api/batches/:id/history", async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const history = await storage.getBatchHistory(batchId);
      res.json(history);
    } catch (error) {
      console.error("Batch history error:", error);
      res.status(500).json({ message: "Failed to fetch batch history" });
    }
  });

  // Image upload route
  app.post("/api/batches/:id/image", upload.single('image'), async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const batch = await storage.updateBatch(batchId, { imageUrl });
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }

      res.json({ imageUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Financial Management Routes
  
  // Get workshop financial summary for a date range
  app.get("/api/financial/workshop-summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      
      const summary = await storage.getWorkshopFinancialSummary(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(summary);
    } catch (error) {
      console.error("Error fetching workshop financial summary:", error);
      res.status(500).json({ error: "Failed to fetch workshop financial summary" });
    }
  });

  // Get unpaid batches for a specific workshop
  app.get("/api/financial/unpaid-batches/:workshopId", async (req, res) => {
    try {
      const workshopId = parseInt(req.params.workshopId);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      
      const batches = await storage.getUnpaidBatchesByWorkshop(
        workshopId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(batches);
    } catch (error) {
      console.error("Error fetching unpaid batches:", error);
      res.status(500).json({ error: "Failed to fetch unpaid batches" });
    }
  });

  // Invoice Management Routes
  
  // Get all invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Get invoices for a specific workshop
  app.get("/api/invoices/workshop/:workshopId", async (req, res) => {
    try {
      const workshopId = parseInt(req.params.workshopId);
      const invoices = await storage.getInvoicesByWorkshop(workshopId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching workshop invoices:", error);
      res.status(500).json({ error: "Failed to fetch workshop invoices" });
    }
  });

  // Create new invoice
  app.post("/api/invoices", async (req, res) => {
    try {
      console.log('Creating invoice with data:', req.body);
      const { batchIds, ...invoiceData } = req.body;
      
      // Get workshop info for proper invoice numbering
      const workshop = await storage.getWorkshop(invoiceData.workshopId);
      if (!workshop) {
        return res.status(404).json({ error: 'Workshop not found' });
      }

      // Generate proper invoice number: [3 letters] - [ddmmyy] - [sequential 4 digits]
      const workshopCode = workshop.name.substring(0, 3).toUpperCase();
      const today = new Date();
      const dateCode = String(today.getDate()).padStart(2, '0') + 
                      String(today.getMonth() + 1).padStart(2, '0') + 
                      String(today.getFullYear()).slice(-2);
      
      // Get next sequential number (starting from 1000)
      const existingInvoices = await storage.getAllInvoices();
      const todayInvoices = existingInvoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate.toDateString() === today.toDateString() && 
               inv.invoiceNumber.startsWith(`${workshopCode}-${dateCode}-`);
      });
      
      const nextSequential = 1000 + todayInvoices.length;
      const generatedInvoiceNumber = `${workshopCode}-${dateCode}-${nextSequential}`;
      
      // Calculate total amount from batches
      let totalAmount = 0;
      if (batchIds && batchIds.length > 0) {
        for (const batchId of batchIds) {
          // Get batch products for this batch
          const batchProductsResult = await db
            .select()
            .from(batchProducts)
            .innerJoin(products, eq(batchProducts.productId, products.id))
            .where(eq(batchProducts.batchId, batchId));
          
          // Calculate batch value
          const batchValue = batchProductsResult.reduce((total, bp) => {
            const productValue = parseFloat(bp.products.productionValue?.toString() || '0');
            return total + (bp.batch_products.quantity * productValue);
          }, 0);
          
          totalAmount += batchValue;
        }
      }
      
      // Create invoice using direct SQL to avoid date conversion issues
      console.log('Attempting to insert invoice with:', {
        workshopId: invoiceData.workshopId,
        invoiceNumber: generatedInvoiceNumber,
        dueDate: invoiceData.dueDate,
        totalAmount: totalAmount.toFixed(2),
        notes: invoiceData.notes || ''
      });

      const result = await pool.query(`
        INSERT INTO invoices (workshop_id, invoice_number, due_date, total_amount, notes, issue_date, status)
        VALUES ($1, $2, $3::date, $4::numeric, $5, NOW(), $6)
        RETURNING *
      `, [
        invoiceData.workshopId,
        generatedInvoiceNumber,
        invoiceData.dueDate,
        totalAmount.toFixed(2),
        invoiceData.notes || '',
        'pending'
      ]);
      
      const invoice = result.rows[0];
      console.log('Invoice created successfully:', invoice);
      
      // Add batches to the invoice if provided
      if (batchIds && batchIds.length > 0) {
        for (const batchId of batchIds) {
          // Insert invoice batch relationship
          await pool.query(`
            INSERT INTO invoice_batches (invoice_id, batch_id, amount)
            VALUES ($1, $2, $3)
          `, [invoice.id, batchId, '0.00']);
          
          // Mark batch as paid
          await pool.query(`
            UPDATE batches SET paid = true WHERE id = $1
          `, [batchId]);
        }
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Mark invoice as paid
  app.patch("/api/invoices/:id/pay", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const updatedInvoice = await storage.updateInvoice(invoiceId, {
        status: 'paid',
        paidDate: new Date()
      });
      
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ error: "Failed to mark invoice as paid" });
    }
  });

  // Get batch products for multiple batches (for financial calculations)
  app.post("/api/batch-products/multiple", async (req, res) => {
    try {
      const { batchIds } = req.body;
      if (!batchIds || !Array.isArray(batchIds)) {
        return res.status(400).json({ error: "batchIds array is required" });
      }
      
      console.log('Fetching batch products for batch IDs:', batchIds);
      
      // Convert to integers and use inArray instead of SQL ANY
      const validBatchIds = batchIds.map(id => parseInt(id.toString())).filter(id => !isNaN(id));
      
      if (validBatchIds.length === 0) {
        return res.json([]);
      }
      
      // Use a simple loop approach for IN clause
      const batchProductsResult = [];
      for (const batchId of validBatchIds) {
        const products = await db
          .select()
          .from(batchProducts)
          .where(eq(batchProducts.batchId, batchId));
        batchProductsResult.push(...products);
      }
      
      console.log('Found batch products:', batchProductsResult);
      res.json(batchProductsResult);
    } catch (error) {
      console.error("Error fetching batch products:", error);
      res.status(500).json({ error: "Failed to fetch batch products" });
    }
  });

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // GET /api/invoices/:id/batches - Get batches for a specific invoice
  app.get('/api/invoices/:id/batches', async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoiceBatches = await storage.getInvoiceBatches(invoiceId);
      res.json(invoiceBatches);
    } catch (error) {
      console.error('Error fetching invoice batches:', error);
      res.status(500).json({ error: 'Failed to fetch invoice batches' });
    }
  });

  // GET /api/batch-products/batch/:batchId - Get products for a specific batch
  app.get('/api/batch-products/batch/:batchId', async (req, res) => {
    try {
      const batchId = parseInt(req.params.batchId);
      const batchProducts = await storage.getBatchProducts(batchId);
      res.json(batchProducts);
    } catch (error) {
      console.error('Error fetching batch products:', error);
      res.status(500).json({ error: 'Failed to fetch batch products' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
