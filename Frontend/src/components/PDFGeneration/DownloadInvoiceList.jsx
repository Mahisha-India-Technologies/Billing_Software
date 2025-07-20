import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

export const generateInvoiceListPDF = async (invoiceList = []) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // 🔄 Fetch company info
  const { data: company } = await axios.get(`${API_BASE_URL}/api/company/info`);
  const companyName = company?.company_name || "Company Name";
  const addressLines = company?.address
    ? company.address.split("\n")
    : ["Address Line 1", "Address Line 2"];
  const gstin = company?.gst_no ? `GSTIN : ${company.gst_no}` : "GSTIN : N/A";
  const phones = `Cell : ${company?.cell_no1 || ""}${
    company?.cell_no2 ? `, ${company.cell_no2}` : ""
  }`;

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const HEADER_HEIGHT = 90;
  const formatCurrency = (value) => Number(value || 0).toFixed(2);
  let lastTableY = 0;

  const drawHeader = () => {
    const HEADER_TOP_OFFSET = 15;
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(40);
    doc.text(gstin, 40, 30 + HEADER_TOP_OFFSET);
    doc.text(phones, PAGE_WIDTH - 40, 30 + HEADER_TOP_OFFSET, {
      align: "right",
    });

    doc.setFontSize(16).setTextColor(0);
    doc.text(companyName, PAGE_WIDTH / 2, 48 + HEADER_TOP_OFFSET, {
      align: "center",
    });

    doc.setFontSize(10).setFont("helvetica", "normal");
    const addressText = addressLines.join(" ");
    const wrappedAddress = doc.splitTextToSize(addressText, PAGE_WIDTH * 0.6);
    wrappedAddress.forEach((line, index) => {
      doc.text(line, PAGE_WIDTH / 2, 70 + index * 12 + HEADER_TOP_OFFSET, {
        align: "center",
      });
    });

    doc
      .setDrawColor(0)
      .setLineWidth(0.4)
      .line(
        40,
        90 + HEADER_TOP_OFFSET,
        PAGE_WIDTH - 40,
        90 + HEADER_TOP_OFFSET
      );
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc
        .setPage(i)
        .setFontSize(9)
        .setTextColor(100)
        .setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 60, PAGE_HEIGHT - 10);
    }
  };

  const sortedInvoices = [...invoiceList].sort(
    (a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)
  );

  const headers = [
    [
      "#",
      "Customer Name",
      "GST No",
      "Invoice No",
      "Discount",
      "Transport",
      "Date",
      "Total",
    ],
  ];
  const rows = sortedInvoices.map((inv, i) => [
    i + 1,
    inv.customer_name || "Anonymous",
    inv.gst_number || "N/A",
    inv.invoice_number || "N/A",
    formatCurrency(inv.discount_value),
    formatCurrency(inv.transport_charge),
    new Date(inv.created_at).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    formatCurrency(inv.total_amount),
  ]);

  const totalAmount = sortedInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );
  const totalDiscount = sortedInvoices.reduce(
    (sum, inv) => sum + Number(inv.discount_value || 0),
    0
  );
  const totalTransport = sortedInvoices.reduce(
    (sum, inv) => sum + Number(inv.transport_charge || 0),
    0
  );

  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 40, right: 40 },
    styles: {
      fontSize: 10,
      font: "helvetica",
      valign: "middle",
      textColor: 20,
      cellPadding: { top: 5, bottom: 5, left: 10, right: 5 },
    },
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      halign: "left",
    },
    bodyStyles: { fontSize: 10, halign: "left" },
    columnStyles: {
      0: { cellWidth: 25, halign: "left", fontStyle: "bold" },
      1: { cellWidth: 80 },
      2: { cellWidth: 90 },
      3: { cellWidth: 90 },
      4: { cellWidth: 52, halign: "right" },
      5: { cellWidth: 55, halign: "right" },
      6: { cellWidth: 80 },
      7: { cellWidth: 60, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: (data) => {
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      doc
        .setDrawColor(0)
        .setLineWidth(1)
        .rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);

      drawHeader();

      doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
      doc.text(
        "Overall Generated Invoices List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      if (currentPage === totalPages) lastTableY = data.cursor.y;
    },
  });

  const finalPage = doc.getNumberOfPages();
  doc.setPage(finalPage);

  let boxY = lastTableY + 20;
  const boxX = PAGE_WIDTH - 280;
  const boxWidth = 240;
  const boxHeight = 80;
  const bottomMargin = 40;
  const topMarginForBoxOnNewPage = 150;

  if (boxY + boxHeight + bottomMargin > PAGE_HEIGHT) {
    doc.addPage();
    boxY = topMarginForBoxOnNewPage;
    drawHeader();

    doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
    doc.text(
      "Overall Generated Invoices List (Continued)",
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      { align: "center" }
    );
  }

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4, 4, "F");
  doc
    .setDrawColor(160)
    .setLineWidth(0.5)
    .line(boxX, boxY - 10, PAGE_WIDTH - 40, boxY - 10);

  let currentY = boxY + 20;
  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;

  doc.setFontSize(11).setTextColor(60);
  doc.text("Total Discount:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalDiscount), valueX, currentY, {
    align: "right",
  });

  currentY += 20;
  doc.text("Total Transport:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalTransport), valueX, currentY, {
    align: "right",
  });

  currentY += 20;
  doc.setFontSize(12).setTextColor(0).setFont("helvetica", "bold");
  doc.text("Grand Total:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalAmount), valueX, currentY, {
    align: "right",
  });

  drawFooter();
  doc.save("Invoice_List.pdf");
};
