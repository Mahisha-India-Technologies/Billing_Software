import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import API_BASE_URL from "../../Context/Api";
import Barcode from "react-barcode";
import { useRef } from "react";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';

const ProductModal = ({
  open,
  handleClose,
  handleSave,
  mode,
  initialData,
  categories = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";

  const barcodeRef = useRef();

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "95%" : "90%",
    maxWidth: 500,
    maxHeight: "90vh",
    bgcolor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: "20px",
    boxShadow: `0 0 20px ${primaryColor}`,
    display: "flex",
    flexDirection: "column",
  };

  const [productData, setProductData] = useState({
  product_name: "",
  description: "",
  category_id: categories[0]?.category_id || "",
  price: "",
  stock_quantity: "",
  image_url: "",
  gst: 0,
  c_gst: 0,
  s_gst: 0,
  hsn_code: "",
  discount: "",
  barcode: "", // ✅ ADDED
});

const [initialStock, setInitialStock] = useState(null);

useEffect(() => {
  if (mode === "edit" && initialData) {
    const parsedGST = parseFloat(initialData.gst);
    const halfGST = parseFloat((parsedGST / 2).toFixed(2));
    setProductData({
      ...initialData,
      category_id: parseInt(initialData.category_id) || "",
      gst: parsedGST || 0,
      c_gst: initialData.c_gst || halfGST,
      s_gst: initialData.s_gst || halfGST,
      hsn_code: initialData.hsn_code || "",
      discount: parseFloat(initialData.discount) || 0,
      barcode: initialData.barcode || "", // ✅ SET BARCODE IF IN EDIT
    });

    setInitialStock(initialData.stock_quantity);
  } else {
    setProductData({
      product_name: "",
      description: "",
      category_id: "",
      price: "",
      stock_quantity: "",
      image_url: "",
      gst: "",
      c_gst: "",
      s_gst: "",
      hsn_code: "",
      discount: "",
      barcode: "", // ✅ RESET ON ADD
    });
    setInitialStock(null);
  }
}, [mode, initialData, categories]);

const handleChange = (e) => {
  const { name, value, type } = e.target;
  let val = value;

  if (type === "number") val = value === "" ? "" : Number(value);

  if (name === "gst") {
    const gstVal = value === "" ? "" : parseFloat(val);
    const halfGST = gstVal !== "" ? parseFloat((gstVal / 2).toFixed(2)) : "";
    setProductData((prev) => ({
      ...prev,
      gst: gstVal,
      c_gst: halfGST,
      s_gst: halfGST,
    }));
  } else if (name === "category_id") {
    setProductData((prev) => ({
      ...prev,
      category_id: parseInt(val),
    }));
  } else {
    setProductData((prev) => ({
      ...prev,
      [name]: val,
    }));
  }
};

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/products/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    setProductData((prev) => ({
      ...prev,
      image_url: res.data.imagePath,
    }));
  } catch (err) {
    console.error("Image upload failed:", err);
  }
};

const handleSubmit = async () => {
  const {
    product_name,
    price,
    stock_quantity,
    category_id,
    gst,
    hsn_code,
    product_id,
    discount,
    barcode,
  } = productData;

  if (!product_name || price === "" || stock_quantity === "" || !category_id) {
    alert("Please fill in all required fields.");
    return;
  }

  if (!hsn_code || hsn_code.trim().length < 4) {
    alert("Please enter a valid HSN code (minimum 4 digits)");
    return;
  }

  const gstNum = parseFloat(gst);
  if (isNaN(gstNum) || gstNum < 0 || gstNum > 300) {
    alert("GST must be a number between 0 and 300.");
    return;
  }

  const discountNum = parseFloat(discount);
  if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
    alert("Discount must be a number between 0 and 100.");
    return;
  }

  const halfGST = parseFloat((gstNum / 2).toFixed(2));

  const updatedData = {
    ...productData,
    gst: gstNum,
    c_gst: halfGST,
    s_gst: halfGST,
    discount: discountNum,
    barcode: barcode?.trim(), // ✅ INCLUDE BARCODE
  };

  const userData = localStorage.getItem("user");
  if (!userData) {
    setSnackbarMessage("Please login first to generate invoice.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
    return;
  }

  const user = JSON.parse(userData);
  const userId = user.username;

  try {
    if (mode === "edit" && Number(initialStock) !== Number(stock_quantity)) {
      await axios.post(`${API_BASE_URL}/api/products/update-stock`, {
        product_id: product_id,
        new_stock: stock_quantity,
        reason: "Stock modified via product modal",
        updated_by: userId,
      });
    }

    handleSave(updatedData);
  } catch (err) {
    console.error("Error updating stock:", err);
    alert("Stock update failed. Please try again.");
  }
};

const handleDownloadBarcode = () => {
  const svgElement = barcodeRef.current?.querySelector("svg");

  if (!svgElement) {
    alert("Barcode not available.");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `${productData.product_name}_barcode.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
};

const handlePrintBarcode = () => {
  const printContents = barcodeRef.current?.innerHTML;

  if (!printContents) {
    alert("No barcode to print.");
    return;
  }

  const printWindow = window.open("", "", "width=400,height=200");

  printWindow.document.write(`
    <html>
      <head>
        <title>Print Barcode</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: white;
          }

          @page {
            size: auto;
            margin: 0;
          }

          body {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .barcode-container {
            display: inline-block;
            margin: 0;
            padding: 0;
            line-height: 0;
          }

          svg {
            width: auto;
            height: auto;
            display: block;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">${printContents}</div>
        <script>
          window.onload = function () {
            window.print();
            window.onafterprint = function () {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${isDark ? "#444" : "#ccc"}`,
            display: "flex",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: primaryColor,
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <Typography variant="h6" fontWeight={600} color="white">
            {mode === "edit" ? "Edit Product" : "Add New Product"}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon sx={{ color: "#fff" }} />
          </IconButton>
        </Box>

        {/* Body - Scrollable */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 4,
            py: 2,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: isDark ? "#555" : "#ccc",
              borderRadius: "4px",
            },
          }}
        >
          {[
            { label: "Product Name", name: "product_name", required: true },
            {
              label: "Description",
              name: "description",
              multiline: true,
              rows: 2,
            },
            { label: "HSN Code", name: "hsn_code", required: true },
          ].map(({ label, name, ...rest }) => (
            <TextField
              key={name}
              label={label}
              name={name}
              fullWidth
              margin="dense"
              value={productData[name]}
              onChange={handleChange}
              variant="filled"
              required={rest.required}
              multiline={rest.multiline}
              rows={rest.rows}
              InputProps={{
                style: {
                  backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
                  color: isDark ? "#fff" : "#000",
                },
              }}
              InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
            />
          ))}

          <TextField
  label="Category"
  name="category_id"
  fullWidth
  select
  margin="dense"
  value={productData.category_id}
  onChange={handleChange}
  variant="filled"
  InputProps={{
    style: {
      backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
      color: isDark ? "#fff" : "#000",
    },
  }}
  InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
>
  {categories.map((category) => (
    <MenuItem
      key={category.category_id}
      value={category.category_id}
      disabled={!category.is_active}
    >
      {category.category_name} {!category.is_active && "(Inactive)"}
    </MenuItem>
  ))}
</TextField>

          {[
            { label: "Price (₹)", name: "price" },
            { label: "Stock Quantity", name: "stock_quantity" },
            { label: "GST %", name: "gst" },
          ].map(({ label, name }) => (
            <TextField
              key={name}
              label={label}
              name={name}
              fullWidth
              type="number"
              required
              margin="dense"
              value={productData[name]}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                style: {
                  backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
                  color: isDark ? "#fff" : "#000",
                },
              }}
              InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
            />
          ))}

          <TextField
            label="CGST %"
            name="c_gst"
            fullWidth
            type="number"
            margin="dense"
            value={productData.c_gst}
            variant="filled"
            disabled
            InputProps={{
              style: {
                backgroundColor: isDark ? "#2b2b2b" : "#e0e0e0",
                color: "#888",
              },
            }}
            InputLabelProps={{ style: { color: "#888" } }}
          />

          <TextField
            label="SGST %"
            name="s_gst"
            fullWidth
            type="number"
            margin="dense"
            value={productData.s_gst}
            variant="filled"
            disabled
            InputProps={{
              style: {
                backgroundColor: isDark ? "#2b2b2b" : "#e0e0e0",
                color: "#888",
              },
            }}
            InputLabelProps={{ style: { color: "#888" } }}
          />

          <TextField
            label="Discount (%)"
            name="discount"
            fullWidth
            type="number"
            margin="dense"
            value={productData.discount}
            onChange={handleChange}
            variant="filled"
            inputProps={{ min: 0, max: 100, step: "0.01" }} // ✅ Decimal + Integer support
            InputProps={{
              style: {
                backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
                color: isDark ? "#fff" : "#000",
              },
            }}
            InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
          />

          <Box
            mt={3}
            p={2}
            border={`1px solid ${primaryColor}`}
            borderRadius="10px"
            boxShadow={
              isDark ? `0 0 10px ${primaryColor}` : `0 0 6px ${primaryColor}55`
            }
            bgcolor={isDark ? "#1e1e1e" : "#f9f9f9"}
          >
            <TextField
              label="Upload Image"
              name="image_url"
              fullWidth
              margin="dense"
              value={productData.image_url}
              variant="filled"
              disabled
              InputProps={{
                endAdornment: (
                  <Button
                    variant="contained"
                    component="label"
                    sx={{
                      ml: 1,
                      textTransform: "none",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      backgroundColor: primaryColor,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px", // space between icon and text
                      "&:hover": {
                        backgroundColor: isDark ? "#0097a7" : "#0d8f5e",
                      },
                    }}
                  >
                    <CloudUploadOutlinedIcon fontSize="small" />
                    Upload
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                ),
                style: {
                  backgroundColor: isDark ? "#2b2b2b" : "#e0e0e0",
                  color: "#888",
                  paddingRight: "8px",
                },
              }}
              InputLabelProps={{ style: { color: "#888" } }}
            />
          </Box>

          {productData.image_url && (
            <Box mt={2} textAlign="center">
              <img
                src={`${API_BASE_URL}/${productData.image_url}`}
                alt="Preview"
                style={{
                  maxHeight: "150px",
                  borderRadius: "10px",
                  border: `1px solid ${primaryColor}`,
                }}
              />
            </Box>
          )}

          {mode === "edit" && productData.barcode && (
  <Box mt={2} textAlign="center">
    <Typography variant="subtitle2" gutterBottom>
      Product Barcode
    </Typography>

    <div ref={barcodeRef}>
      <Barcode
        value={productData.barcode}
        width={2}
        height={80}
        fontSize={14}
        displayValue
        background="#fff"
      />
    </div>

    <Box sx={{display: 'flex', justifyContent: 'center', mt: 2, flexDirection: {xs: 'column', sm: 'row'}, gap: '10px'}}>
      <Button
    startIcon={<CloudDownloadIcon />}
      variant="outlined"
      sx={{ textTransform: 'none', borderRadius: 4 }}
      onClick={() => handleDownloadBarcode()}
    >
      Download Barcode
    </Button>
    <Button
    startIcon={<LocalPrintshopIcon />}
  variant="outlined"
  sx={{ textTransform: 'none', borderRadius: 4 }}
  onClick={() => handlePrintBarcode()}
>
  Print Barcode
</Button>
    </Box>

  </Box>
)}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${isDark ? "#444" : "#ccc"}`,
            textAlign: "center",
            backgroundColor: isDark ? "#121212" : "#f5f5f5",
            borderBottomLeftRadius: "20px",
            borderBottomRightRadius: "20px",
          }}
        >
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              backgroundColor: "transparent",
              color: primaryColor,
              border: `1px solid ${primaryColor}`,
              fontWeight: "bold",
              px: 4,
              py: 1,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                backgroundColor: primaryColor,
                color: "#fff",
              },
            }}
          >
            Save Product
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ProductModal;
