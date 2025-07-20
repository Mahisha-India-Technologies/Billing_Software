import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import DrawIcon from "@mui/icons-material/Draw";
import AddBoxIcon from "@mui/icons-material/AddBox";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ProductModal from "./ProductModal";
import logo from "../../assets/images/logo2.svg";
import { ColorModeContext } from "../../Context/ThemeContext.jsx";
import AutoDeleteIcon from "@mui/icons-material/AutoDelete";
import ViewModuleIcon from "@mui/icons-material/ViewModule"; // Card icon
import TableChartIcon from "@mui/icons-material/TableChart"; // Table icon
import Tooltip from "@mui/material/Tooltip";
import ClearAllIcon from "@mui/icons-material/ClearAll"; // For untrace
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  Paper,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";
import API_BASE_URL from "../../Context/Api.jsx";
import CloseIcon from "@mui/icons-material/Close";
import FlipCameraAndroidOutlinedIcon from "@mui/icons-material/FlipCameraAndroidOutlined";
import AutoModeIcon from '@mui/icons-material/AutoMode';
import CategoryModal from "./CategoryModal.jsx";

const Products = () => {
  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;

  const colorMode = useContext(ColorModeContext);

  // 🟡 Snackbar States
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // 🟦 Snackbar Utility Function
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentProduct, setCurrentProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("card"); //  card (or) table

  const [showTracedOnly, setShowTracedOnly] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      showSnackbar("Failed to load categories.", "error");
    }
  };

  const fetchProducts = async () => {
    try {
      const url = showTracedOnly
        ? `${API_BASE_URL}/api/products/traced`
        : `${API_BASE_URL}/api/products`;

      const res = await axios.get(url);
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load products.");
      showSnackbar("Failed to load products.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (!productData.category_id || isNaN(productData.category_id)) {
        return showSnackbar("Invalid category selected.", "error");
      }

      const gst = parseFloat(productData.gst);
      if (isNaN(gst) || gst < 0 || gst > 300) {
        return showSnackbar(
          "GST must be a valid number between 0 and 300.",
          "error"
        );
      }

      if (!productData.hsn_code || productData.hsn_code.trim().length < 4) {
        return showSnackbar(
          "HSN code is required and should be at least 4 characters.",
          "error"
        );
      }

      const c_gst = parseFloat((gst / 2).toFixed(2));
      const s_gst = parseFloat((gst / 2).toFixed(2));

      const finalProduct = {
        ...productData,
        category_id: parseInt(productData.category_id),
        price: parseFloat(productData.price),
        stock_quantity: parseInt(productData.stock_quantity),
        gst,
        c_gst,
        s_gst,
        hsn_code: productData.hsn_code.trim(),
      };

      if (modalMode === "add") {
        await axios.post(`${API_BASE_URL}/api/products/add`, finalProduct);
        showSnackbar("Product added successfully.");
      } else {
        if (!currentProduct?.product_id) {
          return showSnackbar("Invalid product ID for editing.", "error");
        }

        await axios.put(
          `${API_BASE_URL}/api/products/edit/${currentProduct.product_id}`,
          finalProduct
        );
        showSnackbar("Product updated successfully.");
      }

      fetchProducts();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to save product.", "error");
    }
  };

  const filterProducts = (search) => {
    if (!search) {
      setFilteredProducts(products);
    } else {
      const lower = search.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.product_name.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.category_name.toLowerCase().includes(lower) ||
          p.product_id.toString().includes(lower) ||
          p.price.toString().includes(lower) ||
          p.discount_price.toString().includes(lower) ||
          p.discount.toString().includes(lower) ||
          p.stock_quantity.toString().includes(lower) ||
          p.hsn_code.toString().includes(lower) ||
          p.gst.toString().includes(lower)
      );
      setFilteredProducts(filtered);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    filterProducts(val);
  };

  const handleCloseSearch = (e) => {
    setSearchTerm("");
    filterProducts("");
  };

  const checkUserLoggedIn = (customMessage) => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      showSnackbar(customMessage, "error");
      return null;
    }
    return JSON.parse(userData);
  };

  const handleAddProduct = () => {
    const user = checkUserLoggedIn("Please login first to Add Products");
    if (!user) return;
    setModalMode("add");
    setCurrentProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    const user = checkUserLoggedIn("Please login first to Edit Products");
    if (!user) return;
    setModalMode("edit");
    setCurrentProduct(product);
    setIsModalOpen(true);
  };

  const openDeleteModal = (id) => {
    const user = checkUserLoggedIn("Please login first to delete products.");
    if (!user) return;
    setProductIdToDelete(id);
    setOpenDeleteDialog(true);
  };

  const closeDeleteModal = () => {
    setOpenDeleteDialog(false);
    setProductIdToDelete(null);
  };

  //
  const confirmDelete = async () => {
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/products/delete/${productIdToDelete}`
      );

      if (res.status === 200) {
        const wasTraced = res.data.traced;

        let updated;
        if (wasTraced) {
          // Just mark as traced
          updated = products.map((p) =>
            p.product_id === productIdToDelete ? { ...p, is_traced: true } : p
          );
          showSnackbar("Product marked as traced.", "info");
          fetchProducts(); // Roll back optimistic update
        } else {
          // Actually deleted
          updated = products.filter((p) => p.product_id !== productIdToDelete);
          showSnackbar("Product deleted successfully.", "success");
        }

        setProducts(updated);
        setFilteredProducts(
          updated.filter((p) =>
            p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      if (err.response?.status === 400) {
        showSnackbar(err.response.data.error, "error");
      } else {
        showSnackbar("Failed to delete product.", "error");
      }
    } finally {
      closeDeleteModal();
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [showTracedOnly]);

  const handleUntraceProduct = async (productId) => {
    // Optional: Optimistically update UI before server confirmation
    setProducts((prev) =>
      prev.map((prod) =>
        prod.product_id === productId
          ? { ...prod, is_traced: !prod.is_traced }
          : prod
      )
    );

    try {
      await axios.put(`${API_BASE_URL}/api/products/${productId}/toggle-trace`);
      fetchProducts(); // Ensure sync with DB
      showSnackbar("Trace status updated", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to update trace status", "error");
      fetchProducts(); // Roll back optimistic update
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1, sm: 2 },
        py: { xs: 3, sm: 4 },
        fontFamily: "'Inter', sans-serif",
        color: palette.text.primary,
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden", // ✅ Stop global horizontal overflow
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          mt: {xs: 2, sm: 0},
          flexWrap: { xs: "wrap", sm: "wrap", md: "nowrap" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: primaryColor,
            fontSize: { xs: "1.3rem", sm: "1.5rem" },
          }}
        >
          Product Management
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: {xs: '0px', sm: '10px'},
            flexDirection: "row",
            "@media (max-width:600px)": {
              flexDirection: "column",
              width: "100%",
            },
          }}
        >
          <Button
            variant="outlined"
            color={showTracedOnly ? "secondary" : "primary"}
            onClick={() => {
              setShowTracedOnly((prev) => !prev);
            }}
            startIcon={<FlipCameraAndroidOutlinedIcon />}
            sx={{
              bgcolor: "transparent",
              mt: "10px",
              color: primaryColor,
              border: `1px solid ${primaryColor}`,
              px: 2,
              py: 1,
              borderRadius: 3,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              textTransform: "none",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                filter: "brightness(1.1)",
              },
            }}
          >
            {showTracedOnly
              ? "Show Active Products"
              : "Show Traced Products"}
          </Button>

          {!showTracedOnly ? (
            <Button
              startIcon={<AutoModeIcon />}
              onClick={() => setOpenCategoryModal(true)}
              sx={{
                bgcolor: "transparent",
                mt: "10px",
                color: primaryColor,
                border: `1px solid ${primaryColor}`,
                px: 2,
                py: 1,
                borderRadius: 3,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                textTransform: "none",
                "&:hover": {
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                },
              }}
            >
              Update Category
            </Button>
          ) : (
            ""
          )}

          {!showTracedOnly ? (
            <Button
              startIcon={<AddBoxIcon />}
              onClick={handleAddProduct}
              sx={{
                bgcolor: "transparent",
                mt: "10px",
                color: primaryColor,
                border: `1px solid ${primaryColor}`,
                px: 2,
                py: 1,
                borderRadius: 3,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                textTransform: "none",
                "&:hover": {
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                },
              }}
            >
              Add Product
            </Button>
          ) : (
            ""
          )}
        </Box>
      </Box>

      {/* Search bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: palette.background.paper,
            borderRadius: "40px",
            p: "10px 16px",
            width: "100%",
            maxWidth: 520,
            boxShadow: `0 0 10px ${primaryColor}66`,
            border: `2px solid ${primaryColor}`,
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
              filter: "brightness(1.1)",
              transform: "scale(1.02)",
              transition: "all 0.3s ease",
            },
          }}
        >
          <SearchIcon sx={{ color: primaryColor }} />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search for the Products..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: palette.text.primary,
              fontSize: "1rem",
              fontFamily: "'Inter', sans-serif",
            }}
          />

          <CloseIcon
            onClick={handleCloseSearch}
            sx={{ color: "gray", fontSize: "20px", cursor: "pointer" }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mt: 2,
          textAlign: "right",
          gap: "8px",
          mb: "10px",
        }}
      >
        <Tooltip
          title={
            viewMode === "card" ? "Switch to Table View" : "Switch to Card View"
          }
        >
          <IconButton
            onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
            sx={{
              color: primaryColor,
              border: `1.5px solid ${primaryColor}`,
              borderRadius: 2,
              alignItems: "center",
              p: 1.2,
              mb: {xs: 1, sm: 0},
              "&:hover": {
                backgroundColor: primaryColor,
                color: "#fff",
                transition: "all 0.3s ease",
              },
            }}
          >
            {viewMode === "card" ? <TableChartIcon /> : <ViewModuleIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Typography
          sx={{
            textAlign: "center",
            mt: 10,
            fontSize: "1.5rem",
            color: palette.text.secondary,
          }}
        >
          Loading...
        </Typography>
      ) : error ? (
        <Typography sx={{ color: "error.main", textAlign: "center" }}>
          {error}
        </Typography>
      ) : viewMode === "card" ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 4,
          }}
        >
          {filteredProducts.map((product) => (
            <Box
              key={product.product_id}
              sx={{
                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                backdropFilter: "blur(8px)",
                border: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.1)",
                borderRadius: 2,
                p: 2,
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition:
                  "transform 0.2s ease-in-out, border-color 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-5px) scale(1.02)",
                  borderColor: primaryColor,
                },
              }}
            >
              <Box
                component="img"
                src={`${API_BASE_URL}/${product.image_url}`}
                alt={product.product_name}
                sx={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 1,
                  mb: 2,
                }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                  {product.product_name}
                </Typography>
                <Typography sx={{ mb: 1, color: primaryColor }}>
                  {product.category_name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.95rem",
                    color: palette.text.secondary,
                    lineHeight: 1.4,
                    maxHeight: "4.2em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {product.description || "No description provided."}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                    fontSize: "0.9rem",
                    color: palette.text.disabled,
                  }}
                >
                  <Typography>ID: {product.product_id}</Typography>
                  <Typography sx={{ color: primaryColor, fontWeight: "bold" }}>
                    ₹{product.discount_price}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                    mb: 1,
                    fontSize: "0.4rem",
                    color: palette.text.disabled,
                  }}
                >
                  <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
                    HSN: {product.hsn_code}
                  </Typography>
                  <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
                    GST: {product.gst}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                    mb: 1,
                    fontSize: "0.4rem",
                    color: palette.text.disabled,
                  }}
                >
                  <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
                    Discount: {product.discount}%
                  </Typography>
                  <Typography sx={{ fontSize: "13px", fontWeight: "bold" }}>
                    Price: ₹{product.price}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 2,
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: "bold",
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 3,
                    color: product.stock_quantity > 0 ? "#298b24" : "#ef5350",
                    border: `1px solid ${
                      product.stock_quantity > 0 ? "#298b24" : "#ef5350"
                    }`,
                  }}
                >
                  {product.stock_quantity > 0
                    ? `In Stock (${product.stock_quantity})`
                    : "Out of Stock"}
                </Typography>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {/* Existing Edit/Delete buttons */}
                  <IconButton
                    onClick={() => handleEdit(product)}
                    sx={{
                      border: `1px solid ${primaryColor}`,
                      color: primaryColor,
                      p: 1,
                      "&:hover": {
                        boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                      },
                    }}
                  >
                    <DrawIcon />
                  </IconButton>
                  {showTracedOnly ? (
                    <Tooltip title="Mark as Normal Product">
                      <IconButton
                        onClick={() => handleUntraceProduct(product.product_id)}
                        sx={{
                          border: "1px solid #ef5350",
                          color: "#ef5350",
                          p: 1,
                          "&:hover": {
                            boxShadow: "0 0 8px #ef5350, 0 0 6px #df322d",
                          },
                        }}
                      >
                        <ClearAllIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <IconButton
                      disabled={product.is_linked}
                      onClick={() => openDeleteModal(product.product_id)}
                      sx={{
                        border: "1px solid",
                        color: product.is_linked ? "#aaa" : "#ef5350",
                        p: 1,
                        "&:hover": {
                          boxShadow: product.is_linked
                            ? "none"
                            : "0 0 8px #ef5350, 0 0 6px #df322d",
                        },
                        cursor: product.is_linked ? "not-allowed" : "pointer",
                      }}
                    >
                      <AutoDeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ width: "100%" }}>
          <TableContainer
            component={Paper}
            sx={{
              mt: 2,
              maxHeight: 600, // 🟦 Makes only body scrollable
              overflow: "auto",
              border: `1px solid ${primaryColor}`,
              scrollbarWidth: "none",
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ height: 60, backgroundColor: primaryColor }}>
                  {[
                    "ID",
                    "Image",
                    "Name",
                    "Category",
                    "Price",
                    "Discount",
                    "Rate",
                    "GST",
                    "HSN",
                    "Stock",
                    "Actions",
                  ].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        color: primaryColor,
                        fontWeight: "bold",
                        fontSize: "0.95rem",
                        backgroundColor: theme.palette.background.default,
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredProducts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((product) => (
                    <TableRow key={product.product_id}>
                      <TableCell>{product.product_id}</TableCell>
                      <TableCell>
                        <img
                          src={`${API_BASE_URL}/${product.image_url}`}
                          alt={product.product_name}
                          style={{
                            width: 60,
                            height: 60,
                            objectFit: "cover",
                            borderRadius: 6,
                          }}
                        />
                      </TableCell>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell align="right">₹{product.price}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        {product.discount}%
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: "bold", color: primaryColor }}
                      >
                        ₹{product.discount_price}
                      </TableCell>
                      <TableCell align="right">{product.gst}%</TableCell>
                      <TableCell>{product.hsn_code}</TableCell>
                      <TableCell align="center">
                        <Typography
                          sx={{
                            fontWeight: "bold",
                            px: 1.5,
                            py: 0.4,
                            borderRadius: 3,
                            color:
                              product.stock_quantity > 0
                                ? "#298b24"
                                : "#ef5350",
                            border: `1px solid ${
                              product.stock_quantity > 0 ? "#298b24" : "#ef5350"
                            }`,
                          }}
                        >
                          {product.stock_quantity > 0
                            ? `In Stock (${product.stock_quantity})`
                            : "Out of Stock"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: "flex", gap: "10px" }}>
                          <IconButton
                            onClick={() => handleEdit(product)}
                            sx={{
                              color: primaryColor,
                              border: `1px solid ${primaryColor}`,
                              "&:hover": {
                                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                              },
                            }}
                          >
                            <DrawIcon />
                          </IconButton>
                          {showTracedOnly ? (
                            <Tooltip title="Mark as Normal Product">
                              <IconButton
                                onClick={() =>
                                  handleUntraceProduct(product.product_id)
                                }
                                sx={{
                                  border: "1px solid #ef5350",
                                  color: "#ef5350",
                                  p: 1,
                                  "&:hover": {
                                    boxShadow:
                                      "0 0 8px #ef5350, 0 0 6px #df322d",
                                  },
                                }}
                              >
                                <ClearAllIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <IconButton
                              disabled={product.is_linked}
                              onClick={() =>
                                openDeleteModal(product.product_id)
                              }
                              sx={{
                                border: "1px solid",
                                color: product.is_linked ? "#aaa" : "#ef5350",
                                p: 1,
                                "&:hover": {
                                  boxShadow: product.is_linked
                                    ? "none"
                                    : "0 0 8px #ef5350, 0 0 6px #df322d",
                                },
                                cursor: product.is_linked
                                  ? "not-allowed"
                                  : "pointer",
                              }}
                            >
                              <AutoDeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredProducts.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              border: `1px solid ${primaryColor}`,
              borderTop: "none",
              backgroundColor: (theme) => theme.palette.background.paper,
              borderRadius: "0 0 10px 10px",
              boxShadow: (theme) => `0 0 4px ${theme.palette.primary.main}55`,
            }}
          />
        </Box>
      )}

      <ProductModal
        open={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        handleSave={handleSaveProduct}
        mode={modalMode}
        initialData={currentProduct}
        categories={categories}
      />

      <CategoryModal open={openCategoryModal} onClose={() => setOpenCategoryModal(false)} />

      {/* ✅ Delete Confirmation Modal */}
      {/* ✅ Delete Confirmation Modal */}
      <Dialog
        open={openDeleteDialog}
        onClose={closeDeleteModal}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? "#121212" : "#fff",
            border: `2px solid ${primaryColor}`,
            boxShadow: `0 0 12px ${primaryColor}, 0 0 8px ${primaryColor}`,
            borderRadius: 5,
            padding: 1,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ color: primaryColor, fontWeight: "bold" }}>
          Confirm Deletion ?
        </DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete this product? Still the deleted
            producted will be marked as traced product and it will not be
            deleted permanently as it is already used in the invoices.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={closeDeleteModal}
            variant="outlined"
            sx={{
              ml: "10px",
              gap: "8px",
              textTransform: "none",
              color: isDark ? "#d1cfce" : "gray",
              border: isDark ? "1px solid #d1cfce" : "1px solid gray",
              borderRadius: "40px",
              backgroundColor: "transparent",
              transition: "all 0.3s ease-in-out",
              "&:hover": {
                color: isDark ? "#fff" : "#000",
                border: isDark ? "1px solid #fff" : "1px solid #000",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            sx={{
              color: "red",
              border: `1px solid red`,
              borderRadius: "40px",
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Products;
