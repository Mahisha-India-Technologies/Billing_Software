const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../config/config.js");

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/logos"); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST: Add or Update Company Info
router.post("/add", upload.single("company_logo"), async (req, res) => {
  try {
    const {
      company_name,
      address,
      cell_no1,
      cell_no2,
      gst_no,
      pan_no,
      account_name,
      bank_name,
      branch_name,
      ifsc_code,
      account_number,
      email,
      website,
    } = req.body;

    const logoFilename = req.file ? req.file.filename : null;

    // Check if company info already exists
    const [existing] = await db.execute("SELECT id, company_logo FROM company_info LIMIT 1");

    if (existing.length > 0) {
      // Update only the logo if a new file is provided, else keep the old one
      const logoToUse = logoFilename || existing[0].company_logo;

      await db.execute(
        `UPDATE company_info
         SET company_name = ?, company_logo = ?, address = ?, cell_no1 = ?, cell_no2 = ?, gst_no = ?, pan_no = ?,
             account_name = ?, bank_name = ?, branch_name = ?, ifsc_code = ?, account_number = ?, email = ?, website = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          company_name,
          logoToUse,
          address,
          cell_no1,
          cell_no2,
          gst_no,
          pan_no,
          account_name,
          bank_name,
          branch_name,
          ifsc_code,
          account_number,
          email,
          website,
          existing[0].id,
        ]
      );
    } else {
      // Insert new record
      await db.execute(
        `INSERT INTO company_info
         (company_name, company_logo, address, cell_no1, cell_no2, gst_no, pan_no, account_name,
          bank_name, branch_name, ifsc_code, account_number, email, website)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_name,
          logoFilename,
          address,
          cell_no1,
          cell_no2,
          gst_no,
          pan_no,
          account_name,
          bank_name,
          branch_name,
          ifsc_code,
          account_number,
          email,
          website,
        ]
      );
    }

    res.json({ message: "Company info saved successfully." });
  } catch (error) {
    console.error("Error saving company info:", error);
    res.status(500).json({ error: "Failed to save company info." });
  }
});

// PUT: Update company info
router.put("/update", upload.single("company_logo"), async (req, res) => {
  try {
    const {
      company_name,
      address,
      cell_no1,
      cell_no2,
      gst_no,
      pan_no,
      account_name,
      bank_name,
      branch_name,
      ifsc_code,
      account_number,
      email,
      website,
    } = req.body;

    const logoFilename = req.file ? req.file.filename : null;

    const [existing] = await db.execute("SELECT id, company_logo FROM company_info LIMIT 1");

    if (existing.length === 0) {
      return res.status(404).json({ message: "No company info found to update." });
    }

    const logoToUse = logoFilename || existing[0].company_logo;

    await db.execute(
      `UPDATE company_info
       SET company_name=?, company_logo=?, address=?, cell_no1=?, cell_no2=?, gst_no=?, pan_no=?, 
           account_name=?, bank_name=?, branch_name=?, ifsc_code=?, account_number=?, email=?, website=?, updated_at=NOW()
       WHERE id=?`,
      [
        company_name,
        logoToUse,
        address,
        cell_no1,
        cell_no2,
        gst_no,
        pan_no,
        account_name,
        bank_name,
        branch_name,
        ifsc_code,
        account_number,
        email,
        website,
        existing[0].id,
      ]
    );

    res.json({ message: "Company info updated successfully." });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update company info" });
  }
});

// GET: Fetch latest company info (for "From Address")
router.get("/info", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM company_info ORDER BY id DESC LIMIT 1");
    res.json(rows[0] || {}); // Send latest or empty
  } catch (err) {
    console.error("Failed to fetch company info:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
