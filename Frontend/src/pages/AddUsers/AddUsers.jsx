import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddLinkIcon from "@mui/icons-material/AddLink";
import DeleteIcon from "@mui/icons-material/Delete";
import AddUserModal from "./AddUserModal";
import DrawIcon from "@mui/icons-material/Draw";
import API_BASE_URL from "../../Context/Api";
import CloseIcon from "@mui/icons-material/Close";
import CompanyInfoModal from "./CompanyInfoModal";
import CompareOutlinedIcon from "@mui/icons-material/CompareOutlined";

const AddUsers = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { palette } = theme;
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedUser, setSelectedUser] = useState(null);
  const [openInfoModal, setOpenInfoModal] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // or "error"
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/all-users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      showSnackbar("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/delete/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      // ✅ Successful deletion (HTTP 200 or 204)
      showSnackbar("User deleted successfully", "success");
      fetchUsers(); // Refresh the user list
    } else if (res.status === 400) {
      // ⚠️ Bad request – likely client-side issue, show server's message
      const data = await res.json();
      showSnackbar(data.message || "Invalid delete request", "error");
    } else if (res.status === 404) {
      // ❌ Not found – user doesn't exist
      showSnackbar("User not found", "error");
    } else if (res.status === 409) {
      // ❌ Conflict – maybe user is linked to something (like active invoice)
      showSnackbar("Cannot delete user due to existing dependencies", "error");
    } else {
      // ❌ Other errors – fallback for 500, 403, etc.
      showSnackbar("Failed to delete user. Please try again.", "error");
    }
  } catch (err) {
    // 🛑 Network error or unexpected exception
    showSnackbar("An error occurred while deleting user", "error");
    console.error("Delete User Error:", err);
  }
};

  const [passwordVisibility, setPasswordVisibility] = useState({});

  // Toggle function per user
  const togglePasswordVisibility = (userId) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset to first page on new search
  };

  const handleCloseSearch = (e) => {
    setSearchTerm("");
    setPage(0); // Reset to first page on new search
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.mobile_number?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term) ||
      u.password_hash?.toLowerCase().includes(term) ||
      u.status?.toLowerCase().includes(term)
    );
  });

  const paginated = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        backgroundColor: isDark ? "#121212" : "#f5f5f5",
        color: theme.palette.text.primary,
        minHeight: "100vh",
        p: isMobile ? 2 : 4,
        boxSizing: "border-box",
        overflowX: "hidden",
        width: "100%",
        maxWidth: "100vw",
      }}
    >
      <Typography
        gutterBottom
        sx={{
          fontSize: { xs: "20px", sm: "26px" },
          color: primaryColor,
          fontWeight: "bold",
          pt: { xs: 3, sm: 1 },
          pb: { xs: 1, sm: 0 },
        }}
      >
        User Management
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          mb: 2,
          mt: 4,
          gap: "8px",
        }}
      >
        {/* Search bar */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: palette.background.paper,
              borderRadius: "40px",
              p: "6px 16px",
              width: "100%",
              maxWidth: "400px",
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
              placeholder="Search for the User..."
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

        <Box sx={{ display: "flex", gap: "10px", mt: { xs: 2, sm: 0 }, flexDirection: {xs: 'column', sm: 'row'} }}>
          <Button
            variant="outlined"
            startIcon={<CompareOutlinedIcon />}
            onClick={() => setOpenInfoModal(true)}
            sx={{
              color: primaryColor,
              textTransform: "none",
              border: `2px solid ${primaryColor}`,
              borderRadius: "10px",
              fontWeight: "bold",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                filter: "brightness(1.1)",
                transform: "scale(1.01)",
              },
            }}
          >
            {`Edit Company Info`}
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setSelectedUser(null);
              setModalMode("add");
              setOpenModal(true);
            }}
            sx={{
              gap: "8px",
              textTransform: "none",
              color: primaryColor,
              border: `2px solid ${primaryColor}`,
              borderRadius: "10px",
              backgroundColor: "transparent",
              transition: "all 0.3s ease-in-out",
              fontWeight: "bold",
              textAlign: "center",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                filter: "brightness(1.1)",
                transform: "scale(1.01)",
              },
            }}
          >
            <AddLinkIcon />
            Add User
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            maxWidth: "100vw",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <TableContainer
            component={Paper}
            sx={{
              border: `2px solid ${primaryColor}`,
              borderRadius: 2,
              boxShadow: `0 0 8px ${primaryColor}66`,
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 1000,
                width: "100%",
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
                  }}
                >
                  {[
                    "S.No",
                    "Name",
                    "Email",
                    "Mobile",
                    "Role",
                    "Password",
                    "Status",
                    "Actions",
                  ].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        color: primaryColor,
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        fontSize: { xs: "0.9rem", sm: "0.95rem" },
                        py: 2.2,
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((u, index) => (
                    <TableRow key={u.user_id} hover>
                      <TableCell sx={{ fontWeight: "bold", width: '30px', textAlign: 'center' }}>
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: "bold" }}
                      >{`${u.first_name} ${u.last_name}`}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.mobile_number}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {u.role
                          ? u.role.charAt(0).toUpperCase() + u.role.slice(1)
                          : ""}
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {u.password_hash}
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {u.status
                          ? u.status.charAt(0).toUpperCase() + u.status.slice(1)
                          : ""}
                      </TableCell>
                      <TableCell align="left">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            setModalMode("edit");
                            setSelectedUser({ id: u.user_id, ...u });
                            setOpenModal(true);
                          }}
                          sx={{
                            borderRadius: "50%",
                            border: `1px solid ${primaryColor}`,
                            "&:hover": {
                              boxShadow: `0 0 8px ${primaryColor}`,
                            },
                          }}
                        >
                          <DrawIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => deleteUser(u.user_id)}
                          sx={{
                            ml: 1,
                            borderRadius: "50%",
                            border: `1px solid ${theme.palette.error.main}`,
                            "&:hover": {
                              boxShadow: `0 0 8px ${theme.palette.error.main}`,
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              rowsPerPageOptions={[5, 10, 20, 50]}
              count={filteredUsers.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                px: 2,
                backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* Add/Edit User Modal */}
      <AddUserModal
  open={openModal}
  handleClose={() => {
    setOpenModal(false);
    setSelectedUser(null);
    setModalMode("add");
  }}
  onUserAdded={() => {
    fetchUsers();
    showSnackbar(
      modalMode === "edit"
        ? "User updated successfully"
        : "User added successfully",
      "success"
    );
  }}
  onError={(message) => showSnackbar(message, "error")} // ✅ NEW PROP
  mode={modalMode}
  userToEdit={selectedUser}
/>
      <CompanyInfoModal
        open={openInfoModal}
        handleClose={() => setOpenInfoModal(false)}
      />

      {/* Snackbar Notification */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={closeSnackbar}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddUsers;
