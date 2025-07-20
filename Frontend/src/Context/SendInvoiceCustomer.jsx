// src/utils/sendInvoiceToCustomer.js

import axios from "axios";
import API_BASE_URL from "../Context/Api";

/**
 * Sends the generated invoice PDF to backend for email + WhatsApp delivery.
 *
 * @param {Blob} pdfBlob - PDF file in Blob format
 * @param {Object} customer - Customer details { name, email, whatsapp_number, invoiceNo }
 * @returns {Promise<Object>} - Response from backend
 */
export const sendInvoiceToCustomer = async (pdfBlob, customer) => {
  if (!pdfBlob || !customer) {
    throw new Error("Missing PDF or customer data.");
  }

  const formData = new FormData();
  formData.append("pdf", pdfBlob, `Invoice_${customer.invoiceNo || "Bill"}.pdf`);
  formData.append("name", customer.name || "");
  formData.append("email", customer.email || "");
  formData.append("whatsapp", customer.whatsapp_number || "");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/invoices/send-to-customer`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Failed to send invoice to customer:", error);
    throw error;
  }
};
