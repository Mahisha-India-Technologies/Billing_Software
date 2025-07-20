const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// ✅ Send Invoice Email with PDF
const sendEmailWithPDF = async ({ pdfBase64, invoiceNumber, customerEmail, fromEmail, fromName }) => {
  try {
    if (!customerEmail || customerEmail.trim() === "") {
      console.error(`❌ Cannot send invoice email: Missing customer email for invoice #${invoiceNumber}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASS,
      },
    });

    const mailOptions = {
      from: `"${fromName}" <${process.env.EMAIL_AUTH_USER}>`,
      replyTo: fromEmail,
      to: customerEmail,
      subject: `Invoice #${invoiceNumber} from ${fromName}`,
      html: `
        <p>Dear Customer,</p>
        <p>Thank you for your recent business with <strong>${fromName}</strong>.</p>
        <p>Please find attached your invoice <strong>#${invoiceNumber}</strong>.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <br />
        <p>Best regards,<br /><strong>${fromName}</strong></p>
      `,
      attachments: [
        {
          filename: `Invoice_${invoiceNumber}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Invoice email sent to ${customerEmail} for invoice #${invoiceNumber}`);
  } catch (err) {
    console.error("❌ Error sending invoice email:", err);
    throw err;
  }
};

// ✅ Send Reminder or Overdue Alert Email
const sendReminderEmail = async ({ customerEmail, invoiceNumber, companyName, companyEmail, dueDate, type }) => {
  try {
    if (!customerEmail || customerEmail.trim() === "") {
      console.error(`❌ Cannot send ${type} email: Missing email for invoice #${invoiceNumber}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASS,
      },
    });

    const subject = type === "reminder"
      ? `⏳ Payment Reminder: Invoice #${invoiceNumber} due on ${dueDate}`
      : `⚠️ Overdue Payment Alert: Invoice #${invoiceNumber}`;

    const htmlBody = type === "reminder"
      ? `
        <p>Dear Customer,</p>
        <p>This is a friendly reminder that your invoice <strong>#${invoiceNumber}</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>Please ensure payment is completed before the due date.</p>
        <br />
        <p>Best regards,<br /><strong>${companyName}</strong></p>
      `
      : `
        <p>Dear Customer,</p>
        <p>The payment for invoice <strong>#${invoiceNumber}</strong> was due on <strong>${dueDate}</strong> and is still pending.</p>
        <p>Please complete payment immediately to avoid late fees.</p>
        <br />
        <p>Best regards,<br /><strong>${companyName}</strong></p>
      `;

    const mailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_AUTH_USER}>`,
      replyTo: companyEmail,
      to: customerEmail,
      subject,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ ${type.toUpperCase()} email sent to ${customerEmail} for invoice #${invoiceNumber}`);
  } catch (err) {
    console.error(`❌ Error sending ${type} email for invoice #${invoiceNumber}:`, err);
  }
};

module.exports = {
  sendEmailWithPDF,
  sendReminderEmail,
};
