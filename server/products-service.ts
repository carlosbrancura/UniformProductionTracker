import { pool } from "./db";

console.log('ProductsService: Pool connection status:', !!pool);

export class ProductsService {
  async getAllProducts() {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, code, description, 
          fabric_type as "fabricType",
          fabric_meters_per_piece as "fabricMetersPerPiece",
          notions, notes, available_colors as "availableColors",
          available_sizes as "availableSizes",
          production_value as "productionValue"
        FROM products 
        ORDER BY id DESC
      `);
      
      return result.rows.map(row => ({
        ...row,
        notions: Array.isArray(row.notions) ? row.notions : [],
        availableColors: Array.isArray(row.availableColors) ? row.availableColors : [],
        availableSizes: Array.isArray(row.availableSizes) ? row.availableSizes : []
      }));
    } catch (error: any) {
      console.error('Error fetching products:', error.message);
      throw new Error('Failed to fetch products');
    }
  }

  async createProduct(productData: any) {
    try {
      console.log('ProductsService: Creating product with data:', productData);
      
      // Garantir que cores e tamanhos sejam arrays válidos
      const colors = Array.isArray(productData.availableColors) ? productData.availableColors : [];
      const sizes = Array.isArray(productData.availableSizes) ? productData.availableSizes : [];
      const notions = Array.isArray(productData.notions) ? productData.notions : [];
      
      const result = await pool.query(`
        INSERT INTO products (
          name, code, description, fabric_type, fabric_meters_per_piece,
          notions, notes, available_colors, available_sizes, production_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
          id, name, code, description,
          fabric_type as "fabricType",
          fabric_meters_per_piece as "fabricMetersPerPiece",
          notions, notes, available_colors as "availableColors", 
          available_sizes as "availableSizes",
          production_value as "productionValue"
      `, [
        productData.name || '',
        productData.code || `PROD_${Date.now()}`,
        productData.description || null,
        productData.fabricType || '',
        productData.fabricMetersPerPiece || '0',
        JSON.stringify(notions),
        productData.notes || null,
        JSON.stringify(colors),
        JSON.stringify(sizes),
        productData.productionValue || '0'
      ]);

      if (result.rows.length === 0) {
        throw new Error('Product was not created');
      }

      const product = {
        ...result.rows[0],
        notions: result.rows[0].notions ? JSON.parse(result.rows[0].notions) : [],
        availableColors: result.rows[0].availableColors ? JSON.parse(result.rows[0].availableColors) : [],
        availableSizes: result.rows[0].availableSizes ? JSON.parse(result.rows[0].availableSizes) : []
      };

      console.log('ProductsService: Product created successfully:', product);
      return product;
    } catch (error: any) {
      console.error('ProductsService: Error creating product:', error.message);
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  async updateProduct(id: number, productData: any) {
    try {
      const result = await pool.query(`
        UPDATE products SET
          name = $1, code = $2, description = $3, fabric_type = $4,
          fabric_meters_per_piece = $5, notions = $6, notes = $7,
          available_colors = $8, available_sizes = $9, production_value = $10
        WHERE id = $11
        RETURNING 
          id, name, code, description,
          fabric_type as "fabricType",
          fabric_meters_per_piece as "fabricMetersPerPiece", 
          notions::text, notes,
          available_colors::text as "availableColors",
          available_sizes::text as "availableSizes",
          production_value as "productionValue"
      `, [
        productData.name,
        productData.code,
        productData.description,
        productData.fabricType,
        productData.fabricMetersPerPiece,
        JSON.stringify(productData.notions || []),
        productData.notes,
        JSON.stringify(productData.availableColors || []),
        JSON.stringify(productData.availableSizes || []),
        productData.productionValue,
        id
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      const product = {
        ...result.rows[0],
        notions: result.rows[0].notions ? JSON.parse(result.rows[0].notions) : [],
        availableColors: result.rows[0].availableColors ? JSON.parse(result.rows[0].availableColors) : [],
        availableSizes: result.rows[0].availableSizes ? JSON.parse(result.rows[0].availableSizes) : []
      };

      return product;
    } catch (error: any) {
      console.error('Error updating product:', error.message);
      throw new Error('Failed to update product');
    }
  }

  async deleteProduct(id: number) {
    try {
      const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error: any) {
      console.error('Error deleting product:', error.message);
      throw new Error('Failed to delete product');
    }
  }
}

export const productsService = new ProductsService();