// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./src/config/config.js");
const app = express();
const PORT = 5000;
app.use(cors());
app.use(bodyParser.json());
const path = require("path");
const productRoutes = require("./src/routes/products.js");
const authRoutes = require("./src/routes/authRoutes.js");
const invoiceRoutes = require("./src/routes/invoices.js");
const gstReportsRoutes = require("./src/routes/gstReports.js");
const usersRoutes = require("./src/routes/addUserRoutes.js");
const companyInfoRoutes = require("./src/routes/companyInfoRoutes.js");
const categoriesRoutes = require("./src/routes/categoryRoutes.js");
const invoiceRoute = require("./src/routes/sendInvoice.js");

app.use((req, res, next) => {
  console.log(
    `[GLOBAL LOG] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  next();
});
app.use("/invoices", express.static(path.join(__dirname, "public/invoices")));

app.use("/temp", express.static(path.join(__dirname, "temp")));

app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use(
  "/invoices",
  express.static(path.join(__dirname, "public", "invoices"))
);
// Serve static PDF files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/gst-reports", gstReportsRoutes);
app.use("/api/company", companyInfoRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/send", invoiceRoute);

// Health check
app.get("/", (req, res) => {
  res.send("✅ Billing API is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
