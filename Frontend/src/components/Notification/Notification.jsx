import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  useTheme,
  Box,
  Tooltip,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { fetchReminderData } from "../../utils/reminder";

// 📅 Format and label Due Date
const formatDueDate = (dueDateStr) => {
  const today = new Date();
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  const formatted = dueDate.toLocaleDateString("en-GB");
  const isOverdue = diff < 0;
  const label = isOverdue ? `${Math.abs(diff)} day(s) ago` : `${diff} day(s) left`;

  return (
    <Box component="span">
      {formatted}{" "}
      <Box
        component="span"
        sx={{
          color: isOverdue ? "error.main" : "success.main",
          fontWeight: 600,
          fontSize: "0.85rem",
          ml: 0.5,
        }}
      >
        ({label})
      </Box>
    </Box>
  );
};

// ... (imports remain the same)

const ReminderModal = ({ open, onClose, onDataLoaded }) => {
  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;

  const [data, setData] = useState({ reminders: [], overdues: [] });
  const [tab, setTab] = useState(0);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null);
  const [dueSortOrder, setDueSortOrder] = useState("asc");

  useEffect(() => {
    if (open) {
      fetchReminderData()
        .then(({ reminders, overdues }) => {
          setData({ reminders, overdues });
          onDataLoaded?.(reminders, overdues);
        })
        .catch((err) => console.error("Error fetching reminders:", err));
    }
  }, [open, onDataLoaded]);

  const handleCopyInvoiceNumber = (invoiceNumber, invoiceId) => {
    navigator.clipboard.writeText(invoiceNumber);
    setCopiedInvoiceId(invoiceId);
    setTimeout(() => setCopiedInvoiceId(null), 2000);
  };

  const toggleSortOrder = () => {
    setDueSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortedRows = useMemo(() => {
    const currentRows = tab === 0 ? data.overdues : data.reminders;
    return [...currentRows].sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return dueSortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [data, tab, dueSortOrder]);

  const renderTable = (rows) => {
    const hasData = rows && rows.length > 0;

    return (
      <Box
        sx={{
          width: "100%",
          height: { xs: "390px", sm: "320px", md: "300px" },
          border: `2px ${hasData ? "solid" : "dashed"} ${primaryColor}`,
          borderRadius: 2,
          overflowY: hasData ? "auto" : "hidden",
          bgcolor: hasData ? "transparent" : isDark ? "grey.900" : "grey.100",
          display: "flex",
          alignItems: hasData ? "stretch" : "center",
          justifyContent: hasData ? "start" : "center",
          flexDirection: "column",
          "&::-webkit-scrollbar": {
            width: "2px",
            height: "2px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: "10px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: isDark ? "#2c2c2c" : "#f0f0f0",
          },
        }}
      >
        {hasData ? (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: primaryColor }}>
                {[
                  "Action",
                  "Invoice No",
                  "Customer Name",
                  "Email",
                  "Phone",
                  "GST No.",
                  "Amount(₹)",
                  "Advance(₹)",
                  "Balance(₹)",
                  "Due Date",
                ].map((header, i) => (
                  <TableCell
                    key={i}
                    sx={{
                      backgroundColor: primaryColor,
                      fontWeight: "bold",
                      color: "#fff",
                      minWidth: header === "Invoice No" || header === "Due Date" ? "160px" : "auto",
                      cursor: header === "Due Date" ? "pointer" : "default",
                    }}
                    align={header === "Action" ? "center" : "left"}
                    onClick={header === "Due Date" ? toggleSortOrder : undefined}
                  >
                    {header}
                    {header === "Due Date" &&
                      (dueSortOrder === "asc" ? (
                        <ArrowDownwardIcon fontSize="inherit" sx={{ ml: 1, fontSize: 16 }} />
                      ) : (
                        <ArrowUpwardIcon fontSize="inherit" sx={{ ml: 1, fontSize: 16 }} />
                      ))}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((invoice) => (
                <TableRow key={invoice.invoice_id}>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        copiedInvoiceId === invoice.invoice_id
                          ? "Copied"
                          : "Copy Invoice Number"
                      }
                      arrow
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopyInvoiceNumber(invoice.invoice_number, invoice.invoice_id)
                        }
                        sx={{
                          color: 'gray',
                          "&:hover": {
                            color: primaryColor,
                          },
                        }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", minWidth: "160px" }}>
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", minWidth: "200px" }}>
                    {invoice.name}
                  </TableCell>
                  <TableCell>{invoice.email}</TableCell>
                  <TableCell>{invoice.mobile}</TableCell>
                  <TableCell>{invoice.gst_number}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
                    {invoice.total_amount}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {invoice.advance_amount}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: "error.main" }}>
                    {invoice.total_amount - invoice.advance_amount}
                  </TableCell>
                  <TableCell sx={{ minWidth: "200px" }}>{formatDueDate(invoice.dueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <>
            <HourglassEmptyIcon sx={{ fontSize: 48, mb: 1, color: primaryColor }} />
            <Typography variant="subtitle1" fontWeight="bold">
              No data available
            </Typography>
            <Typography variant="body2">You're all caught up!</Typography>
          </>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: "95%", sm: "90%", md: "85%", lg: "80%" },
          height: { xs: "80vh", sm: "70vh", md: "65vh" },
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddAlarmIcon sx={{ color: primaryColor }} />
          <Typography variant="h6" sx={{ color: primaryColor, fontWeight: "bold" }}>
            Invoice Notifications
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", ml: -5 }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
          >
            <Tab label={`Overdues (${data.overdues.length})`} sx={{ fontWeight: "bold", textTransform: 'none' }} />
            <Tab label={`Reminders (${data.reminders.length})`} sx={{ fontWeight: "bold", textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* 👉 Instructional Message */}
        <Typography variant="body2" sx={{ ml: 1, mt: -1.5, color: "text.secondary" }}>
          (Copy Invoice number and search it in the Party Master page)
        </Typography>

        {renderTable(sortedRows)}
      </DialogContent>
    </Dialog>
  );
};

export default ReminderModal;

