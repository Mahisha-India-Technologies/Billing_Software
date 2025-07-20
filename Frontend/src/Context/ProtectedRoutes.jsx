import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ isAuthenticated, user, allowedRoles, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    // Redirect unauthorized users to their default page
    const fallbackPath =
      user?.role === "admin"
        ? "/"
        : user?.role === "cashier"
        ? "/gst-invoice"
        : "/gst-invoice";

    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
