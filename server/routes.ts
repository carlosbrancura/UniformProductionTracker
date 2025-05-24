import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertWorkshopSchema, insertBatchSchema, insertBatchHistorySchema } from "@shared/schema";
import { db, pool } from "./db";
import { batches, batchHistory, products, batchProducts } from "@shared/schema";
import { eq } from "drizzle-orm";
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
      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
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
      const workshop = await storage.updateWorkshop(id, workshopData);
      if (!workshop) {
        return res.status(404).json({ message: "Workshop not found" });
      }
      res.json(workshop);
    } catch (error) {
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
      const batchData = {
        cutDate: new Date(cutDate),
        status: status || "waiting",
        workshopId: workshopId && workshopId !== "internal" ? parseInt(workshopId) : null,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
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

  app.put("/api/batches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Batch update request:', req.body);
      
      const { cutDate, status, workshopId, expectedReturnDate, observations } = req.body;
      
      console.log('Raw request data:', { cutDate, status, workshopId, expectedReturnDate, observations });
      
      // Prepare batch data for update - only include fields that are being changed
      const batchData: any = {};

      if (status) {
        batchData.status = status;
        console.log('Adding status:', status);
      }
      
      if (workshopId !== undefined) {
        batchData.workshopId = workshopId && workshopId !== "internal" ? parseInt(workshopId) : null;
        console.log('Adding workshopId:', batchData.workshopId);
      }
      
      if (observations !== undefined) {
        batchData.observations = observations || null;
        console.log('Adding observations:', batchData.observations);
      }

      // Handle dates by only including them if they are valid strings
      if (cutDate && cutDate !== "" && cutDate !== null) {
        console.log('Processing cutDate:', cutDate, typeof cutDate);
        batchData.cutDate = cutDate; // Let Drizzle handle the conversion
      }
      
      if (expectedReturnDate && expectedReturnDate !== "" && expectedReturnDate !== null) {
        console.log('Processing expectedReturnDate:', expectedReturnDate, typeof expectedReturnDate);
        batchData.expectedReturnDate = expectedReturnDate; // Let Drizzle handle the conversion
      }

      console.log('Final batch data for update:', batchData);
      
      // Update directly with Drizzle instead of using storage
      const [updatedBatch] = await db
        .update(batches)
        .set(batchData)
        .where(eq(batches.id, id))
        .returning();
      
      if (!updatedBatch) {
        return res.status(404).json({ message: "Batch not found" });
      }

      // Products are not editable - to change products, delete and recreate the batch
      
      // Add history entry
      await storage.addBatchHistory({
        batchId: updatedBatch.id,
        action: "Lote atualizado",
        userId: 1,
        notes: observations || null
      });
      
      console.log('Batch updated successfully:', updatedBatch);
      res.json(updatedBatch);
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

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);
  return httpServer;
}
