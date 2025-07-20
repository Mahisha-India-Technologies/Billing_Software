import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  IconButton,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { useTheme } from "@mui/material/styles";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import GSTSummaryCards from "./SummaryCards";
import FilterCollapse from "./FilterCollapse";
import MonthlyTrendChart from "./MonthlyTrendChart";
import CategorySalesPieChart from "./CategoryPieChart";
import TopGSTProductsTable from "./TopGstProductsTable";
import GstByUserTable from "./GstByUserTable";
import RecentStockMovementsTable from "./RecentStockTable";
import HighGstInvoicesTable from "./HighGstTable";
import DiscountsByProductTable from "./DiscountsTable";
import { generateTopGSTProductsPDF } from "../../components/PDFGeneration/DownloadTopGst";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { generateHighGSTInvoicesPDF } from "../../components/PDFGeneration/DownloadTopInvoices";
import { generateDiscountsByProductPDF } from "../../components/PDFGeneration/Discounts";
import { generateGstByUserPDF } from "../../components/PDFGeneration/GstByUser";
import { generateStockMovementsPDF } from "../../components/PDFGeneration/StockMovement";
import API_BASE_URL from "../../Context/Api";
import AdvanceInvoiceTable from "./AdvanceInvoiceTable";
import { generateAdvanceInvoicesPDF } from "../../components/PDFGeneration/DownloadAdvanceInvoices";

fetch(`${API_BASE_URL}/products`)
  .then((res) => res.json())
  .then((data) => console.log(data));

export default function Dashboard() {
  // ── Loading state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // ── Report data states ───────────────────────────────────────────────────────
  // “Static” arrays (charts/tables) and “summary” object:
  const [monthlyTrend, setMonthlyTrend] = useState([]); // /monthly
  const [topProducts, setTopProducts] = useState([]); // /top-products
  const [gstByUser, setGstByUser] = useState([]); // /gst-by-user
  const [stockMovements, setStockMovements] = useState([]); // /stock-movements
  const [highGstInvoices, setHighGstInvoices] = useState([]); // /high-gst-invoices
  const [discountsByProduct, setDiscountsByProduct] = useState([]); // /discounts-by-product
  const [categorySales, setCategorySales] = useState([]); // /category-sales
  const [advanceInvoices, setAdvanceInvoices] = useState([]);

  const [summary, setSummary] = useState(null); // /summary

  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ── Filter states (month/year dropdowns) ─────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(""); // "" = all months
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ── Helpers for number formatting ────────────────────────────────────────────
  const safeToFixed = (value, decimals = 2) => {
    const num = Number(value);
    return !isNaN(num) ? num.toFixed(decimals) : "-";
  };
  const safeToLocaleString = (value) => {
    const num = Number(value);
    return !isNaN(num) ? num.toLocaleString() : "-";
  };
  const tooltipFormatter = (value) => {
    if (typeof value === "number" && !isNaN(value)) {
      return `₹${value.toFixed(2)}`;
    }
    if (value == null) return "-";
    return value;
  };

  // ── Fetch **all** eight endpoints (including summary) with optional filters ───
  // ── Fetch all GST reports (with month/year filters if selected) ──
const fetchAllReports = async (month, year) => {
  setLoading(true);

  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;

    const [
      summaryRes,
      monthlyRes,
      topProductsRes,
      gstByUserRes,
      stockMovementsRes,
      highGstInvoicesRes,
      discountsByProductRes,
      categorySalesRes,
      advanceInvoicesRes, // ⬅️ NEW
    ] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/gst-reports/summary`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/monthly`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/top-products`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/gst-by-user`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/stock-movements`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/high-gst-invoices`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/discounts-by-product`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/category-sales`, { params }),
      axios.get(`${API_BASE_URL}/api/gst-reports/advance-invoices`, { params }), // ✅ NEW
    ]);

    // Update state with responses
    setSummary(summaryRes.data || null);
    setMonthlyTrend(monthlyRes.data || []);
    setTopProducts(topProductsRes.data || []);
    setGstByUser(gstByUserRes.data || []);
    setStockMovements(stockMovementsRes.data || []);
    setHighGstInvoices(highGstInvoicesRes.data || []);
    setDiscountsByProduct(discountsByProductRes.data || []);
    setCategorySales(categorySalesRes.data || []);
    setAdvanceInvoices(advanceInvoicesRes.data || []); // ✅ NEW
  } catch (err) {
    console.error("Error fetching GST reports:", err);

    // Clear stale state
    setSummary(null);
    setMonthlyTrend([]);
    setTopProducts([]);
    setGstByUser([]);
    setStockMovements([]);
    setHighGstInvoices([]);
    setDiscountsByProduct([]);
    setCategorySales([]);
    setAdvanceInvoices([]); // ✅ clear advance invoices if error
  } finally {
    setLoading(false);
  }
};

  // ── On component mount, load everything for “overall” (no filters) ───────────
  useEffect(() => {
    fetchAllReports("", ""); // both month="" and year="" => overall data
  }, []); // run once on mount

  // ── Whenever `selectedMonth` or `selectedYear` changes, re‐fetch ALL endpoints ─
  useEffect(() => {
    fetchAllReports(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  // ── Show spinner while data is loading ──────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleDownloadPDF = () => {
    generateTopGSTProductsPDF(topProducts);
  };

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        mt: { xs: 2, sm: 1 },
        overflowX: "hidden", // 🛡️ Prevent outer page overflow
        maxWidth: "100vw",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap" // Makes sure it wraps on small screens
        mb={1}
      >
        {/* Dashboard Title */}
        <Typography
          sx={{
            color: primaryColor,
            mt: { xs: 1, sm: 1, md: 0 },
            fontSize: { xs: "24px", sm: "28px" },
            fontWeight: "bold",
          }}
        >
          Dashboard
        </Typography>

        {/* Filter Button with Tooltip */}
        <Tooltip title="Show Filters" arrow>
          <IconButton
            onClick={() => setShowFilters((prev) => !prev)}
            sx={{
              border: `1px solid ${primaryColor}`,
              color: primaryColor,
              borderRadius: 2,
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}`,
                transform: "scale(1.05)",
              },
            }}
          >
            <FilterAltIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <FilterCollapse
        showFilters={showFilters}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
      />

      <Typography
        fontWeight="bold"
        sx={{
          mb: { xs: 1, sm: 2 },
          fontSize: { xs: "1.1rem", sm: "1.2rem" },
          color: primaryColor,
        }}
      >
        Overall Invoice Summary
      </Typography>

      <GSTSummaryCards summary={summary} />

      {/* Responsive Flex Section */}
      <Grid
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "column",
            md: "column",
            lg: "row",
          },
          gap: "20px",
          width: "100%",
        }}
      >
        <Grid sx={{ width: { md: "100%", lg: "60%" } }}>
          <Typography
            fontWeight="bold"
            sx={{
              mb: { xs: 1, sm: 2 },
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              color: primaryColor,
            }}
          >
            Monthly GST & Sales Trend
          </Typography>

          {/* ✅ Wrapping chart in scrollable container */}
          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <MonthlyTrendChart monthlyTrend={monthlyTrend} />
          </Box>
        </Grid>

        <Grid sx={{ width: { md: "100%", lg: "40%" } }}>
          <Typography
            fontWeight="bold"
            sx={{
              mb: { xs: 1, sm: 2 },
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              color: primaryColor,
            }}
          >
            Category wise Sales Summary
          </Typography>
          <CategorySalesPieChart categorySales={categorySales} />
        </Grid>
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Top GST Contributing Products
            </Typography>
          </Grid>

          <Tooltip title="Download PDF" arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={handleDownloadPDF}
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        {/* ✅ Scroll wrapper for wide table */}
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <TopGSTProductsTable
            topProducts={topProducts}
            safeToFixed={safeToFixed}
            safeToLocaleString={safeToLocaleString}
          />
        </Box>
      </Grid>

      <Grid
        sx={{
          display: "flex",
          flexDirection: "column",
          flexWrap: { md: "nowrap", lg: "wrap" },
        }}
      >
        {/* First table container */}
        <Grid item md={12} lg={6} sx={{ width: "100%" }}>
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
          >
            <Grid item xs="auto">
              <Typography
                fontWeight="bold"
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                  color: primaryColor,
                  whiteSpace: "nowrap",
                }}
              >
                GST Reported by User
              </Typography>
            </Grid>

            <Tooltip title="Download PDF" arrow>
              <Grid item xs="auto">
                <IconButton
                  onClick={() => generateGstByUserPDF(gstByUser)}
                  sx={{
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: "50%",
                    "&:hover": {
                      borderColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                    },
                  }}
                >
                  <CloudDownloadIcon
                    sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                  />
                </IconButton>
              </Grid>
            </Tooltip>
          </Grid>

          <GstByUserTable
            gstByUser={gstByUser}
            safeToFixed={safeToFixed}
            safeToLocaleString={safeToLocaleString}
          />
        </Grid>

        {/* Second table container */}
        <Grid item md={12} lg={6} sx={{ width: "100%" }}>
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
          >
            <Grid item xs="auto">
              <Typography
                fontWeight="bold"
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                  color: primaryColor,
                  whiteSpace: "nowrap",
                }}
              >
                Recent Stock Movements
              </Typography>
            </Grid>

            <Tooltip title="Download PDF" arrow>
              <Grid item xs="auto">
                <IconButton
                  onClick={() => generateStockMovementsPDF(stockMovements)}
                  sx={{
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: "50%",
                    "&:hover": {
                      borderColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                    },
                  }}
                >
                  <CloudDownloadIcon
                    sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                  />
                </IconButton>
              </Grid>
            </Tooltip>
          </Grid>

          <RecentStockMovementsTable
            stockMovements={stockMovements}
            safeToLocaleString={safeToLocaleString}
          />
        </Grid>
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Top GST Invoices
            </Typography>
          </Grid>

          <Tooltip title="Download PDF" arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={() => generateHighGSTInvoicesPDF(highGstInvoices)}
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <HighGstInvoicesTable
          highGstInvoices={highGstInvoices}
          safeToFixed={safeToFixed}
        />
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Product wise Discount
            </Typography>
          </Grid>

          <Tooltip title="Download PDF" arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={() =>
                  generateDiscountsByProductPDF(discountsByProduct)
                }
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <DiscountsByProductTable
          discountsByProduct={discountsByProduct}
          safeToFixed={safeToFixed}
        />
      </Grid>

      <Grid sx={{ width: "100%", mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 1, sm: 2 }, flexWrap: "wrap" }}
        >
          <Grid item xs="auto">
            <Typography
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: primaryColor,
                whiteSpace: "nowrap",
              }}
            >
              Advance Payment Summary
            </Typography>
          </Grid>

          <Tooltip title="Download PDF" arrow>
            <Grid item xs="auto">
              <IconButton
                onClick={() => generateAdvanceInvoicesPDF(advanceInvoices)}
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Grid>
          </Tooltip>
        </Grid>

        <AdvanceInvoiceTable
  advanceInvoices={advanceInvoices}
  safeToFixed={safeToFixed}
/>
      </Grid>
    </Box>
  );
}
