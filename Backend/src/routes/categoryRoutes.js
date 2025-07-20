const express = require("express");
const router = express.Router();
const db = require("../config/config.js");

// GET all categories
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM product_categories ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ADD new category
router.post("/add", async (req, res) => {
  const { category_name, is_active = true } = req.body;
  if (!category_name) {
    return res.status(400).json({ error: "Category name is required" });
  }

  try {
    await db.execute(
      "INSERT INTO product_categories (category_name, is_active) VALUES (?, ?)",
      [category_name, is_active]
    );
    res.status(201).json({ message: "Category added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Category already exists" });
    } else {
      console.error("Error adding category:", error);
      res.status(500).json({ error: "Failed to add category" });
    }
  }
});

// UPDATE category name or status
router.put("/edit/:id", async (req, res) => {
  const { id } = req.params;
  const { category_name, is_active } = req.body;

  try {
    const [result] = await db.execute(
      "UPDATE product_categories SET category_name = ?, is_active = ? WHERE category_id = ?",
      [category_name, is_active, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Category already exists" });
    } else {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  }
});

// TOGGLE status
router.patch("/toggle-status/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [current] = await db.execute("SELECT is_active FROM product_categories WHERE category_id = ?", [id]);
    if (current.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const newStatus = !current[0].is_active;
    await db.execute("UPDATE product_categories SET is_active = ? WHERE category_id = ?", [newStatus, id]);
    res.json({ message: `Category ${newStatus ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    console.error("Error toggling status:", error);
    res.status(500).json({ error: "Failed to toggle status" });
  }
});

module.exports = router;
