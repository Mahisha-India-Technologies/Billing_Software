const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { sendEmailWithPDF, sendReminderEmail } = require("../utils/sendEmail");

// ✅ Route to send invoice PDF
router.post("/send-invoice", async (req, res) => {
  try {
    const { invoiceNumber, customerEmail, pdfBase64 } = req.body;

    const [rows] = await db.execute("SELECT * FROM company_info LIMIT 1");
    const company = rows[0];
    if (!company) return res.status(404).json({ message: "Company info not found" });

    const companyEmail = company.email;
    const companyName = company.company_name;

    if (!customerEmail || customerEmail.trim() === "") {
      console.error(`❌ Cannot send invoice email: Missing email for invoice #${invoiceNumber}`);
      return res.status(400).json({ success: false, message: "Customer email is missing." });
    }

    await sendEmailWithPDF({
      pdfBase64,
      invoiceNumber,
      customerEmail,
      fromEmail: companyEmail,
      fromName: companyName,
    });

    res.status(200).json({ success: true, message: "Invoice sent via Email." });
  } catch (err) {
    console.error("❌ Error sending invoice:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Route to send reminders and overdue alerts
router.get("/send-reminders", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    const [companyRows] = await db.execute("SELECT * FROM company_info LIMIT 1");
    const company = companyRows[0];
    if (!company) return res.status(404).json({ message: "Company info not found" });

    const companyEmail = company.email;
    const companyName = company.company_name;

    const [invoices] = await db.execute(`
      SELECT 
        invoices.invoice_id,
        invoices.invoice_number,
        invoices.invoice_date,
        invoices.customer_id,
        invoices.discount_value,
        invoices.transport_charge,
        invoices.total_amount,
        invoices.payment_type,
        invoices.advance_amount,
        invoices.due_date,
        invoices.payment_completion_status,
        invoices.created_at,
        invoices.payment_settlement_date,
        customers.email
      FROM invoices 
      JOIN customers ON invoices.customer_id = customers.customer_id 
      WHERE invoices.payment_status = 'Advance' 
        AND invoices.payment_completion_status = 'Pending'
        AND invoices.due_date IS NOT NULL
    `);

    let remindersSent = 0;
    const reminderList = [];
    const overdueList = [];

    console.log("🔍 Checking invoices for reminders and overdue alerts...");

    for (const invoice of invoices) {
      const { invoice_number, due_date, email: customerEmail } = invoice;

      if (!customerEmail || customerEmail.trim() === "") {
        console.error(`❌ Skipping invoice #${invoice_number}: Missing customer email.`);
        continue;
      }

      const due = new Date(due_date);
      due.setHours(0, 0, 0, 0);

      let type = null;

      if (due.getTime() === twoDaysLater.getTime()) {
        type = "reminder";
      } else if (due.getTime() < today.getTime()) {
        type = "overdue";
      }

      if (type) {
        console.log(`📧 Sending ${type.toUpperCase()} email for invoice #${invoice_number} to ${customerEmail}`);

        await sendReminderEmail({
          customerEmail,
          invoiceNumber: invoice.invoice_number,
          companyEmail,
          companyName,
          dueDate: due.toISOString().split("T")[0],
          type,
        });

        remindersSent++;

        const fullInvoice = {
          ...invoice,
          dueDate: due.toISOString().split("T")[0],
        };

        if (type === "reminder") {
          reminderList.push(fullInvoice);
        } else {
          overdueList.push(fullInvoice);
        }
      } else {
        console.log(`ℹ️ Invoice #${invoice_number} is not due soon or overdue.`);
      }
    }

    res.status(200).json({
      success: true,
      message: `${remindersSent} email(s) sent.`,
      reminders: reminderList,
      overdues: overdueList,
    });
  } catch (err) {
    console.error("❌ Error sending reminders:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// routes/send/checkReminderStatus.js (or inside your router)
router.get("/check-reminder-status", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    const [invoices] = await db.execute(`
      SELECT 
        invoices.invoice_id,
        invoices.invoice_number,
        invoices.invoice_date,
        invoices.customer_id,
        invoices.discount_value,
        invoices.transport_charge,
        invoices.total_amount,
        invoices.payment_type,
        invoices.advance_amount,
        invoices.due_date,
        invoices.payment_completion_status,
        invoices.created_at,
        invoices.payment_settlement_date,
        invoices.subtotal,
        invoices.gst_amount,
        customers.name,
        customers.email,
        customers.mobile,
        customers.whatsapp_number,
        customers.address,
        customers.state,
        customers.pincode,
        customers.place_of_supply,
        customers.vehicle_number,
        customers.gst_number
      FROM invoices 
      JOIN customers ON invoices.customer_id = customers.customer_id 
      WHERE invoices.payment_status = 'Advance' 
        AND invoices.payment_completion_status = 'Pending'
        AND invoices.due_date IS NOT NULL
    `);

    const reminders = [];
    const overdues = [];

    for (const invoice of invoices) {
      const due = new Date(invoice.due_date);
      due.setHours(0, 0, 0, 0);
      const invoiceData = {
        ...invoice,
        dueDate: due.toISOString().split("T")[0],
      };

      if (due.getTime() === twoDaysLater.getTime()) {
        reminders.push(invoiceData);
      } else if (due.getTime() < today.getTime()) {
        overdues.push(invoiceData);
      }
    }

    res.status(200).json({ reminders, overdues });
  } catch (err) {
    console.error("❌ Error checking reminders:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
