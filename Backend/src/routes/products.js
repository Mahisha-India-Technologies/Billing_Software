const express = require("express");
const router = express.Router();
const db = require("../config/config.js"); // Database config import
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==============================
// Multer setup for image upload
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/images/products");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.use((req, res, next) => {
  console.log(
    `[PRODUCT ROUTER] ${new Date().toISOString()} ${req.method} ${
      req.originalUrl
    }`
  );
  next();
});

// ========== YOUR EXISTING ROUTES ==========
// ... [all existing add, edit, delete, get routes stay the same]

// ==============================
// 6. IMAGE UPLOAD ROUTE
// ==============================
router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imagePath = `images/products/${req.file.filename}`;
  res.status(200).json({ imagePath });
});

// ==============================
// 1. ADD A NEW PRODUCT
// ==============================
// Generate barcode function
const generateBarcode = () => {
  return 'BC' + Math.random().toString().slice(2, 10);
};

router.post("/add", async (req, res) => {
  try {
    const {
      product_name,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount = 0,
      barcode, // optional barcode from frontend (if provided)
    } = req.body;

    if (
      !product_name || !hsn_code || !category_id ||
      price == null || stock_quantity == null ||
      gst == null || c_gst == null || s_gst == null
    ) {
      return res.status(400).json({
        error:
          "Required fields missing: product_name, hsn_code, category_id, price, stock_quantity, gst, c_gst, s_gst",
      });
    }

    const validatePercentage = (val) =>
      typeof val === "number" && !isNaN(val) && val >= 0 && val <= 300;

    if (
      !validatePercentage(gst) ||
      !validatePercentage(c_gst) ||
      !validatePercentage(s_gst)
    ) {
      return res.status(400).json({
        error: "gst, c_gst, and s_gst must be numbers between 0 and 300",
      });
    }

    const validDiscount =
      typeof discount === "number" && !isNaN(discount) && discount >= 0;
    if (!validDiscount) {
      return res.status(400).json({ error: "Discount must be a positive number" });
    }

    const [categoryCheck] = await db.execute(
      "SELECT * FROM product_categories WHERE category_id = ? AND is_active = 1",
      [category_id]
    );
    if (categoryCheck.length === 0) {
      return res.status(400).json({ error: "Invalid or inactive category ID" });
    }

    const finalBarcode = barcode || generateBarcode();

    const insertQuery = `
      INSERT INTO products (
        product_name, barcode, hsn_code, category_id, price, stock_quantity,
        description, image_url, gst, c_gst, s_gst, discount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertQuery, [
      product_name,
      finalBarcode,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description || "",
      image_url || "",
      gst,
      c_gst,
      s_gst,
      discount,
    ]);

    res.status(201).json({
      message: "Product added successfully",
      product_id: result.insertId,
      barcode: finalBarcode,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
});


// ==============================
// 2. EDIT A PRODUCT BY ID (with image deletion)
// ==============================
router.put("/edit/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId))
      return res.status(400).json({ error: "Invalid product ID" });

    let {
      product_name,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount = 0,
      barcode, // ✅ optional
    } = req.body;

    category_id = parseInt(category_id);
    price = parseFloat(price);
    stock_quantity = parseInt(stock_quantity);
    gst = parseFloat(gst);
    c_gst = parseFloat(c_gst);
    s_gst = parseFloat(s_gst);
    discount = parseFloat(discount);

    if (
      !product_name || !hsn_code ||
      isNaN(category_id) || isNaN(price) || isNaN(stock_quantity) ||
      isNaN(gst) || isNaN(c_gst) || isNaN(s_gst) || isNaN(discount)
    ) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const isValidPercentage = (num) =>
      typeof num === "number" && num >= 0 && num <= 300;
    if (
      !isValidPercentage(gst) ||
      !isValidPercentage(c_gst) ||
      !isValidPercentage(s_gst)
    ) {
      return res.status(400).json({ error: "GST must be between 0 and 300" });
    }

    const [categoryRows] = await db.execute(
      "SELECT category_id, is_active FROM product_categories WHERE category_id = ?",
      [category_id]
    );

    if (categoryRows.length === 0) {
      return res.status(400).json({ error: "Category does not exist" });
    }

    product_name = product_name.trim();
    hsn_code = hsn_code.trim();
    description = description ? description.trim() : "";
    image_url = image_url ? image_url.trim() : "";

    const updateQuery = `
      UPDATE products SET
        product_name = ?, barcode = ?, hsn_code = ?, category_id = ?, price = ?, stock_quantity = ?,
        description = ?, image_url = ?, gst = ?, c_gst = ?, s_gst = ?, discount = ?
      WHERE product_id = ?
    `;

    const params = [
      product_name,
      barcode || null,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount,
      productId,
    ];

    const [result] = await db.execute(updateQuery, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Product not found or no changes made" });
    }

    return res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("PUT /edit/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

// Fetch all product categories
router.get("/categories", async (req, res) => {
  try {
    const [categories] = await db.execute(`
      SELECT category_id, category_name, is_active
      FROM product_categories
      ORDER BY category_name ASC
    `);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/", async (req, res) => {
  try {
    const [products] = await db.execute(`
      SELECT p.*, c.category_name
      FROM products p
      JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.is_traced = FALSE
      ORDER BY p.created_at DESC
    `);

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ==============================
// 3. DELETE A PRODUCT BY ID
// ==============================
// 

router.delete("/delete/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    // Step 1: Check if product is referenced in invoice_items
    const [checkRef] = await db.execute(
      "SELECT COUNT(*) AS count FROM invoice_items WHERE product_id = ?",
      [productId]
    );

    if (checkRef[0].count > 0) {
      // Product is in use → just mark it as traced
      await db.execute(
        "UPDATE products SET is_traced = TRUE WHERE product_id = ?",
        [productId]
      );

      return res.status(200).json({
        message: "Product marked as traced (not deleted).",
        traced: true,
      });
    }

    // Step 2: Safe to delete (never used)
    const [result] = await db.execute(
      "DELETE FROM products WHERE product_id = ?",
      [productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully", traced: false });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});


//Traced Products fetching Route
router.get("/traced", async (req, res) => {
  try {
    const [products] = await db.execute(`
      SELECT p.*, c.category_name
      FROM products p
      JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.is_traced = TRUE
      ORDER BY p.created_at DESC
    `);

    res.json(products);
  } catch (error) {
    console.error("Error fetching traced products:", error);
    res.status(500).json({ error: "Failed to fetch traced products" });
  }
});

//Update the traced status of a product
router.put("/:productId/toggle-trace", async (req, res) => {
  const { productId } = req.params;

  try {
    const [result] = await db.execute(
      `UPDATE products SET is_traced = NOT is_traced WHERE product_id = ?`,
      [productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product trace status toggled successfully" });
  } catch (error) {
    console.error("Error toggling trace status:", error);
    res.status(500).json({ error: "Failed to toggle trace status" });
  }
});

// ==============================
// 5. GET A SINGLE PRODUCT BY ID
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    const [rows] = await db.execute(
      `
      SELECT p.*, c.category_name
      FROM products p
      JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `,
      [productId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products/update-stock
router.post("/update-stock", async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      product_id,
      new_stock,
      updated_by = "admin",
      reason = "Stock updated due to shortage",
    } = req.body;

    if (!product_id || new_stock === undefined || new_stock < 0) {
      return res
        .status(400)
        .json({ message: "Invalid product_id or new_stock value." });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT stock_quantity FROM products WHERE product_id = ? FOR UPDATE",
      [product_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found." });
    }

    const oldStock = rows[0].stock_quantity;
    const stockChange = new_stock - oldStock;
    const changeType = stockChange > 0 ? "IN" : "OUT";

    await connection.execute(
      "UPDATE products SET stock_quantity = ? WHERE product_id = ?",
      [new_stock, product_id]
    );

    await connection.execute(
      `INSERT INTO stock_movements 
       (product_id, change_type, quantity_changed, old_stock, new_stock, reason, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        changeType,
        Math.abs(stockChange),
        oldStock,
        new_stock,
        reason,
        updated_by,
      ]
    );

    await connection.commit();
    res.status(200).json({ message: "Stock updated and movement logged." });
  } catch (error) {
    await connection.rollback();
    res
      .status(500)
      .json({ message: "Error updating stock", error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/products/by-barcode/:barcode
router.get("/by-barcode/:barcode", async (req, res) => {
  const { barcode } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM products WHERE barcode = ?",
      [barcode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching product by barcode:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

