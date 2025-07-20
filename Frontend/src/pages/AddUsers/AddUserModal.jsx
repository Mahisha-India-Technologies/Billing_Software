import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { Snackbar, Alert } from "@mui/material";
import API_BASE_URL from "../../Context/Api";

const initialForm = {
  first_name: "",
  last_name: "",
  mobile_number: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "customer",
  status: "active",
};

const AddUserModal = ({
  open,
  handleClose,
  onUserAdded,
  mode = "add",
  userToEdit = null,
  onError, // ✅ NEW
}) => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = theme.palette.primary.main;

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // "error", "warning", "info"
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    if (mode === "edit" && userToEdit) {
      const {
        id,
        first_name,
        last_name,
        mobile_number,
        email,
        password_hash,
        role,
        status,
      } = userToEdit;
      setFormData({
        first_name,
        last_name,
        mobile_number,
        email,
        password: userToEdit.password_hash || "", // ONLY if safe to expose
        confirmPassword: userToEdit.password_hash || "",
        role,
        status,
        id,
      });
    } else {
      setFormData(initialForm);
    }
    setErrors({});
  }, [mode, userToEdit, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = "First name required";
    if (!formData.last_name) newErrors.last_name = "Last name required";
    if (!formData.mobile_number)
      newErrors.mobile_number = "Mobile number required";
    if (!formData.email) newErrors.email = "Email required";

    if (formData.password || formData.confirmPassword) {
      if (!formData.password) newErrors.password = "Password required";
      if (!formData.confirmPassword)
        newErrors.confirmPassword = "Confirm password required";
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    const endpoint =
      mode === "edit"
        ? `${API_BASE_URL}/api/users/update/${formData.id}`
        : `${API_BASE_URL}/api/users/add-users`;

    const method = mode === "edit" ? "PUT" : "POST";

    const payload = { ...formData };
    delete payload.confirmPassword;
    if (mode === "edit" && !payload.password) delete payload.password;

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.error("Failed to parse JSON:", jsonErr);
    }

    if (res.ok) {
      // ✅ Notify parent of success
      onUserAdded();
      handleClose();
      setFormData(initialForm);
    } else {
      // ❌ Notify parent of backend error message
      if (data.message) {
        onError(data.message);
      } else {
        onError(`Error ${res.status}: ${res.statusText}`);
      }
    }
  } catch (err) {
    console.error("Submit error:", err);
    onError("Something went wrong");
  }
};

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: isMobile ? "95%" : "90%",
          maxWidth: 500,
          height: "90vh",
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRadius: "20px",
          boxShadow: `0 0 20px ${primaryColor}`,
          display: "flex",
          flexDirection: "column",
          p: 0,
        }}
      >
        {/* Header */}
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            position: "relative",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            textAlign="center"
            sx={{ color: primaryColor }}
          >
            {mode === "edit" ? "Edit User" : "Add New User"}
          </Typography>

          {/* Close Icon */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 20,
              right: 10,
              color: theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Scrollable Form */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: { xs: 2, sm: 3 },
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <Grid container spacing={2} sx={{ display: "grid" }}>
            {/* First Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                error={!!errors.first_name}
                helperText={errors.first_name}
              />
            </Grid>

            {/* Last Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                error={!!errors.last_name}
                helperText={errors.last_name}
              />
            </Grid>

            {/* Mobile Number */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mobile Number"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                error={!!errors.mobile_number}
                helperText={errors.mobile_number}
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>

            <>
              {/* Password Field */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Confirm Password Field */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </>
            {/* Role */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
              </TextField>
            </Grid>

            {/* Status */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            sx={{
              py: 1.3,
              fontWeight: "bold",
              fontSize: "1rem",
              borderRadius: 2,
              color: "#fff",
              textTransform: "none",
              backgroundColor: theme.palette.primary.main,
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            {mode === "edit" ? "Update User" : "Add User"}
          </Button>
        </Box>
      </Box>
      
    </Modal>
  );
};

export default AddUserModal;
