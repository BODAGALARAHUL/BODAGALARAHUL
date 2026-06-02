/**
 * Admin Sync System
 * Handles syncing admin-created products to the frontend commerce system
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { AdminProduct } from "./commerce";

const PRODUCTS_CACHE_FILE = path.join(process.cwd(), "..", ".cache", "products.json");

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
	const dir = path.join(process.cwd(), "..", ".cache");
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * Sync admin product to frontend cache
 * Called whenever admin saves/creates a product
 */
export async function syncProductFromAdmin(product: AdminProduct): Promise<AdminProduct> {
	try {
		ensureCacheDir();

		// Read existing products
		let products: AdminProduct[] = [];
		if (fs.existsSync(PRODUCTS_CACHE_FILE)) {
			const content = fs.readFileSync(PRODUCTS_CACHE_FILE, "utf8");
			products = JSON.parse(content);
		}

		// Check if product exists
		const existingIndex = products.findIndex((p) => p.id === product.id);

		if (existingIndex > -1) {
			// Update existing product
			products[existingIndex] = {
				...products[existingIndex],
				...product,
				updatedAt: new Date().toISOString(),
			};
		} else {
			// Add new product
			products.push({
				...product,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		// Write back to cache
		fs.writeFileSync(PRODUCTS_CACHE_FILE, JSON.stringify(products, null, 2), "utf8");

		console.log(`✅ Product synced: ${product.name} (${product.id})`);
		return product;
	} catch (error) {
		console.error("❌ Error syncing product from admin:", error);
		throw error;
	}
}

/**
 * Sync multiple products from admin
 */
export async function syncProductsFromAdmin(products: AdminProduct[]): Promise<AdminProduct[]> {
	try {
		for (const product of products) {
			await syncProductFromAdmin(product);
		}
		console.log(`✅ Synced ${products.length} products`);
		return products;
	} catch (error) {
		console.error("❌ Error syncing multiple products:", error);
		throw error;
	}
}

/**
 * Remove product from frontend cache
 */
export async function removeProductFromFrontend(productId: string): Promise<{ success: boolean }> {
	try {
		ensureCacheDir();

		if (!fs.existsSync(PRODUCTS_CACHE_FILE)) {
			return { success: true };
		}

		const content = fs.readFileSync(PRODUCTS_CACHE_FILE, "utf8");
		let products: AdminProduct[] = JSON.parse(content);

		products = products.filter((p) => p.id !== productId);

		fs.writeFileSync(PRODUCTS_CACHE_FILE, JSON.stringify(products, null, 2), "utf8");

		console.log(`✅ Product removed: ${productId}`);
		return { success: true };
	} catch (error) {
		console.error("❌ Error removing product:", error);
		throw error;
	}
}

/**
 * Get all products from cache
 */
export function getAllCachedProducts(): AdminProduct[] {
	try {
		ensureCacheDir();

		if (fs.existsSync(PRODUCTS_CACHE_FILE)) {
			const content = fs.readFileSync(PRODUCTS_CACHE_FILE, "utf8");
			return JSON.parse(content);
		}
	} catch (error) {
		console.error("❌ Error reading cached products:", error);
	}

	return [];
}

/**
 * Clear all products cache (for testing)
 */
export function clearProductsCache(): { success: boolean } {
	try {
		ensureCacheDir();

		if (fs.existsSync(PRODUCTS_CACHE_FILE)) {
			fs.unlinkSync(PRODUCTS_CACHE_FILE);
			console.log("✅ Products cache cleared");
		}

		return { success: true };
	} catch (error) {
		console.error("❌ Error clearing cache:", error);
		throw error;
	}
}

/**
 * Validate product before syncing
 */
export function validateProduct(product: Partial<AdminProduct>): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!product.id) errors.push("Product ID is required");
	if (!product.name) errors.push("Product name is required");
	if (!product.slug) errors.push("Product slug is required");
	if (!product.description) errors.push("Product description is required");
	if (!product.category) errors.push("Product category is required");
	if (!Array.isArray(product.images) || product.images.length === 0) {
		errors.push("At least one product image is required");
	}
	if (!Array.isArray(product.variants) || product.variants.length === 0) {
		errors.push("At least one product variant is required");
	}

	// Validate variants
	if (Array.isArray(product.variants)) {
		product.variants.forEach((variant, index) => {
			if (!variant.id) errors.push(`Variant ${index}: ID is required`);
			if (!variant.price) errors.push(`Variant ${index}: Price is required`);
			if (variant.stock === undefined || variant.stock === null) {
				errors.push(`Variant ${index}: Stock is required`);
			}
			if (!Array.isArray(variant.images) || variant.images.length === 0) {
				errors.push(`Variant ${index}: At least one image is required`);
			}
			if (!variant.attributes || Object.keys(variant.attributes).length === 0) {
				errors.push(`Variant ${index}: At least one attribute is required`);
			}
		});
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
