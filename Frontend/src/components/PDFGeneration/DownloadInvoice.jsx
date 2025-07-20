import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toWords } from "number-to-words";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

export const generateInvoicePDF = async (invoice, returnBlob = false) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const numberToWords = (num) => {
    return (
      toWords(parseFloat(num || 0)).replace(/^\w/, (c) => c.toUpperCase()) +
      " Rupees Only"
    );
  };

  const format = (value) => {
    return Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  try {
    const response = await axios.get(`${API_BASE_URL}/api/company/info`);
    const data = response.data;

    if (!data || Object.keys(data).length === 0) {
      alert("Company information not found.");
      return;
    }

    const companyInfo = {
      name: data.company_name || "Company Name",
      address: data.address || "No address provided",
      gstNumber: data.gst_no || "GST not available",
      pan: data.pan_no || "PAN not available",
      mobile: `${data.cell_no1 || ""}${
        data.cell_no2 ? ", " + data.cell_no2 : ""
      }`,
      bankName: data.bank_name || "Bank name",
      accountNo: data.account_number || "Account No",
      ifsc: data.ifsc_code || "IFSC",
      branch: data.branch_name || "Branch",
    };

    // ✅ Now call PDF drawing function AFTER company info is fetched
    await drawPDF(companyInfo); // Pass invoice also if needed
  } catch (error) {
    console.error("Error fetching company info for PDF:", error);
  }

  async function drawPDF(companyInfo) {
    // Title
    doc.setFont("helvetica", "bold").setFontSize(16);
    const topMargin = 10;
    const titleY = topMargin + 10;

    doc.text("Tax Invoice", pageWidth / 2, titleY, { align: "center" });

    // QR Code
    try {
      const qrData = invoice.qr_string?.trim() || "https://example.com";
      const qrImage = await QRCode.toDataURL(qrData, { margin: 0, width: 80 });
      doc.setFontSize(10);
      doc.text("e-Invoice", 185, 20, { align: "right" });
      doc.addImage(qrImage, "PNG", 165, 25, 30, 30);
    } catch (err) {
      console.warn("QR Code generation failed:", err);
    }

    // IRN Section
    const labelX = 14,
      valueX = 35,
      irnYStart = 45,
      lineHeight = 5;
    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("IRN:", labelX, irnYStart);
    doc.text(invoice.irn?.trim() || "-", valueX, irnYStart);
    doc.text("Ack No:", labelX, irnYStart + lineHeight);
    doc.text(invoice.ack_number?.trim() || "-", valueX, irnYStart + lineHeight);
    doc.text("Ack Date:", labelX, irnYStart + lineHeight * 2);
    doc.text(
      invoice.ack_date?.trim() || "-",
      valueX,
      irnYStart + lineHeight * 2
    );

    // Company Info & Invoice Details
    autoTable(doc, {
      startY: irnYStart + 15,
      margin: { left: 14, right: 14 },
      body: [
        [
          {
            content: companyInfo.name,
            colSpan: 2,
            styles: { fontStyle: "bold", fontSize: 10 },
          },
        ],
        [
          {
            content: `${companyInfo.address}
GST No: ${companyInfo.gstNumber}
PAN: ${companyInfo.pan}
Mobile: ${companyInfo.mobile}`,
            styles: { fontSize: 10 },
          },
          {
            content: `Invoice No: ${invoice.invoice_number || "-"}
e-Way Bill No: ${invoice.eway_bill_number || "-"}
Date: ${invoice.invoice_date || "-"}`,
            styles: { fontSize: 10 },
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      tableLineColor: 100,
      tableLineWidth: 0.4,
    });

    // Buyer/Consignee Info
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      margin: { left: 14, right: 14 },
      body: [
        [
          { content: "Consignee (Ship To):", styles: { fontStyle: "bold" } },
          { content: "Buyer (Bill To):", styles: { fontStyle: "bold" } },
        ],
        [
          {
            content: `${invoice.customer_name}
${invoice.address}
State: ${invoice.state}, Code: ${invoice.state_code}
Mobile: ${invoice.customer_mobile}
GST No: ${invoice.gst_number}
Place of Supply: ${invoice.place_of_supply}`,
            styles: { fontSize: 10 },
          },
          {
            content: `${invoice.customer_name}
${invoice.address}
State: ${invoice.state}, Code: ${invoice.state_code}
Mobile: ${invoice.customer_mobile}
GST No: ${invoice.gst_number}
Place of Supply: ${invoice.place_of_supply}`,
            styles: { fontSize: 10 },
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      tableLineColor: 100,
      tableLineWidth: 0.4,
    });

    // Products Table
    const headers = [
      [
        "S.N",
        "Description",
        "HSN",
        "Qty",
        "Discount(%)",
        "Rate",
        "Per",
        "Amount",
      ],
    ];
    const data = (invoice.items || []).map((item, i) => [
      i + 1,
      item.product_name,
      item.hsn_code,
      `${item.quantity} ${item.unit || ""}`,
      parseFloat(item.discount || 0).toFixed(2),
      parseFloat(item.rate || 0).toFixed(2),
      item.unit || "-",
      parseFloat(item.total_with_gst || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      head: headers,
      body: data,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2.5 },
      headStyles: {
        fillColor: [220, 220, 220],
        fontStyle: "bold",
        textColor: "#313030",
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 47 },
        2: { cellWidth: 16 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 15, halign: "center" },
        7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
    });

    const afterProductY = doc.lastAutoTable.finalY + 2;

    // Summary Table (new layout)
    autoTable(doc, {
      startY: afterProductY,
      margin: { left: 14, right: 14 },
      body: [
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Taxable Value",
            styles: { fontStyle: "bold", halign: "right" },
          },
          { content: format(invoice.subtotal), styles: { halign: "right" } },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Central Tax (9%)",
            styles: { fontStyle: "bold", halign: "right" },
          },
          { content: format(invoice.cgst_amount), styles: { halign: "right" } },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "State Tax (9%)",
            styles: { fontStyle: "bold", halign: "right" },
          },
          { content: format(invoice.sgst_amount), styles: { halign: "right" } },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Total GST",
            styles: { fontStyle: "bold", halign: "right" },
          },
          {
            content: format(+invoice.cgst_amount + +invoice.sgst_amount),
            styles: { halign: "right" },
          },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Transport Charges",
            styles: { fontStyle: "bold", halign: "right" },
          },
          {
            content: format(invoice.transport_charge),
            styles: { halign: "right" },
          },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Total Amount",
            styles: { fontStyle: "bold", halign: "right" },
          },
          {
            content: format(invoice.total_amount),
            styles: { halign: "right" },
          },
        ]),
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        6: { cellWidth: 60 }, // Label column
        7: { cellWidth: 35 }, // Value column
      },
      tableLineColor: 100,
      tableLineWidth: 0.4,
    });

    // Amount in Words
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      margin: { left: 14, right: 14 },
      body: [
        [
          {
            content: `Amount Chargeable (in words): INR ${numberToWords(
              invoice.total_amount
            )}`,
            colSpan: 10,
            styles: {
              fontStyle: "bold",
              halign: "right",
              textColor: "#313030",
            },
          },
        ],
        [
          {
            content: `Tax Amount (in words): INR ${numberToWords(
              (+invoice.cgst_amount || 0) + (+invoice.sgst_amount || 0)
            )}`,
            colSpan: 10,
            styles: { halign: "right", textColor: "#313030" },
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      tableLineColor: 100,
      tableLineWidth: 0.4,
    });

    // Constants
    const sectionWidth = pageWidth - 28;
    const marginLeft = 14;
    const marginRight = 14;

    // Function to estimate height of an autoTable section
    const estimateTableHeight = (lineCount, lineHeight = 5, padding = 8) => {
      return lineCount * lineHeight + padding; // rough estimate: total content height + padding
    };

    // ────────────────────── Bank Details Section (Page-Safe) ──────────────────────
    let bankY = doc.lastAutoTable.finalY + 4;
    const bankLineCount = 7; // Title + 6 lines of info
    const bankHeight = estimateTableHeight(bankLineCount);

    if (bankY + bankHeight > pageHeight - 30) {
      doc.addPage();
      bankY = 20; // reset on new page
    }

    autoTable(doc, {
      startY: bankY,
      margin: { left: marginLeft, right: marginRight },
      body: [
        [
          {
            content: `Company's Bank Details\n\nA/c Name : ${companyInfo.name}\nBank Name : ${companyInfo.bankName}\nA/c No : ${companyInfo.accountNo}\nBranch : ${companyInfo.branch}\nIFSC Code : ${companyInfo.ifsc}`,
            styles: {
              fontSize: 10,
              halign: "left",
              fontStyle: "bold",
              lineWidth: 0.2,
              lineColor: [180, 180, 180],
              fillColor: [245, 245, 245],
              textColor: [50, 50, 50],
              cellPadding: 4,
            },
          },
        ],
      ],
      columnStyles: {
        0: { cellWidth: sectionWidth },
      },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
    });

    // ────────────────────── Declaration Section (Page-Safe) ──────────────────────
    let declarationY = doc.lastAutoTable.finalY + 4;
    const declarationLineCount = 7; // "Declaration:" + ~6 text lines
    const declarationHeight = estimateTableHeight(declarationLineCount);

    if (declarationY + declarationHeight > pageHeight - 30) {
      doc.addPage();
      declarationY = 20;
    }

    autoTable(doc, {
      startY: declarationY,
      margin: { left: marginLeft, right: marginRight },
      body: [
        [
          {
            content: `Declaration:\n\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods once sold will not be taken back or exchanged.\n\nSubject to Erode Jurisdiction only.`,
            styles: {
              fontSize: 10,
              halign: "left",
              fontStyle: "bold",
              lineWidth: 0.2,
              lineColor: [180, 180, 180],
              fillColor: [255, 255, 255],
              textColor: [60, 60, 60],
              cellPadding: 4,
            },
          },
        ],
      ],
      columnStyles: {
        0: { cellWidth: sectionWidth },
      },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
    });

    // ────────────────────── Signature Box (Smart Positioning) ──────────────────────
    let signatureY = doc.lastAutoTable.finalY + 10;
    const boxWidth = 80;
    const boxHeight = 35;
    const boxX = pageWidth - 14 - boxWidth;

    // If content already filled 70% of page, move to new page
    if (signatureY + boxHeight > pageHeight * 0.7) {
      doc.addPage();
      signatureY = 20; // top margin after new page
    }

    // Draw rounded signature box
    doc.setDrawColor(60, 60, 60); // dark gray border
    doc.setLineWidth(0.2);
    doc.roundedRect(boxX, signatureY, boxWidth, boxHeight, 0, 0);

    // "For Company Name" - centered at top
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(`For ${companyInfo.name}`, boxX + boxWidth / 2, signatureY + 10, {
      align: "center",
    });

    // Signature line
    doc.setDrawColor(180); // lighter gray
    doc.line(boxX + 10, signatureY + 22, boxX + boxWidth - 10, signatureY + 22);

    // "Authorized Signatory" - below the line
    doc.text("Authorized Signatory", boxX + boxWidth / 2, signatureY + 30, {
      align: "center",
    });

    // ────────────────────── Footer Line + Page Number ──────────────────────
    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Draw outer border on each page
      doc.setDrawColor(80); // soft dark grey
      doc.setLineWidth(0.3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 18); // 10mm margin from each side

      // Footer line
      doc.setDrawColor(180).setLineWidth(0.5);
      doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

      // Page number and invoice no
      doc.setFontSize(8).setTextColor(100);
      doc.text(
        `Page ${i} of ${pageCount} | Invoice No: ${
          invoice.invoice_number || "-"
        }`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // After building the document
    const pdfBlob = new Blob([doc.output("arraybuffer")], { type: "application/pdf" });

if (returnBlob) {
  return pdfBlob; // Now FormData will accept it!
}

    // Save PDF
    doc.save(`Invoice_${invoice.invoice_number || "Bill"}.pdf`);
  }
};
