import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

dayjs.extend(utc);
dayjs.extend(timezone);

export const generateStockMovementsPDF = async (stockMovements = []) => {
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

  const safeToLocaleString = (val) =>
    isNaN(val) || val === null || val === undefined
      ? "0"
      : Number(val).toLocaleString("en-IN");

  const drawHeader = () => {
    const offset = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40);

    doc.text(gstin, 40, 30 + offset);
    doc.text(phones, PAGE_WIDTH - 40, 30 + offset, { align: "right" });

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(companyName, PAGE_WIDTH / 2, 48 + offset, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const addressText = addressLines.join(" ");
    const wrappedAddress = doc.splitTextToSize(addressText, PAGE_WIDTH * 0.6);
    wrappedAddress.forEach((line, index) => {
      doc.text(line, PAGE_WIDTH / 2, 70 + index * 12 + offset, {
        align: "center",
      });
    });

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(40, 90 + offset, PAGE_WIDTH - 40, 90 + offset);
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 60, PAGE_HEIGHT - 10);
    }
  };

  const headers = [
    [
      "S.No",
      "Product",
      "Type",
      "Qty Changed",
      "Old Stock",
      "New Stock",
      "Updated By",
      "Date",
    ],
  ];

  const rows = stockMovements.map((sm, i) => [
    i + 1,
    sm.product_name,
    sm.change_type,
    safeToLocaleString(sm.quantity_changed),
    safeToLocaleString(sm.old_stock),
    safeToLocaleString(sm.new_stock),
    sm.updated_by || "-",
    dayjs.utc(sm.created_at).tz("Asia/Kolkata").format("DD-MM-YYYY - hh:mm A"),
  ]);

  // Calculate totals for old_stock and new_stock
  const totalOldStock = stockMovements.reduce(
    (acc, cur) =>
      acc +
      (isNaN(cur.old_stock) || cur.old_stock === null
        ? 0
        : Number(cur.old_stock)),
    0
  );
  const totalNewStock = stockMovements.reduce(
    (acc, cur) =>
      acc +
      (isNaN(cur.new_stock) || cur.new_stock === null
        ? 0
        : Number(cur.new_stock)),
    0
  );

  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 40, right: 40 },
    styles: {
      fontSize: 10,
      font: "helvetica",
      cellPadding: 5,
      textColor: 20,
      valign: "middle",
    },
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 10,
      halign: "left",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { cellWidth: 100, halign: "left" }, // Product
      2: { halign: "left" }, // Type
      3: { halign: "center" }, // Type
      4: { halign: "center" }, // Type
      5: { halign: "center" }, // Type
      6: { halign: "center" }, // Updated By
      7: { halign: "left" }, // Date
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: () => {
      // 1. Draw outer border first
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);

      // 2. Draw header inside the border
      drawHeader();

      // 3. Draw title inside the page, just below the header & border
      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Recent Stock Movement List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        {
          align: "center",
        }
      );
    },
  });

  // After autoTable is done, add totals on last page or new page

  const lastPage = doc.getNumberOfPages();
  doc.setPage(lastPage);

  // Position to draw totals (y position)
  // Let's reserve about 40pt height for totals
  const marginBottom = 40;
  const footerHeight = 20;
  const currentY = doc.lastAutoTable.finalY || HEADER_HEIGHT + 50;

  // Check if enough space remains on this page for totals without overflow
  const spaceNeeded = 40; // space needed for totals box height
  const spaceLeft = PAGE_HEIGHT - marginBottom - footerHeight - currentY;

  if (spaceLeft < spaceNeeded) {
    // Not enough space, add a new page
    doc.addPage();
    doc.setPage(doc.getNumberOfPages());
  }

  // Draw totals box
  const boxX = 40;
  const boxWidth = PAGE_WIDTH - 80;
  const boxY =
    doc.lastAutoTable.finalY + 10 > PAGE_HEIGHT - marginBottom - spaceNeeded
      ? 40
      : doc.lastAutoTable.finalY + 10;
  const boxHeight = 30;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxWidth, boxHeight);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total Old Stock:", boxX + 10, boxY + 20);
  doc.setFont("helvetica", "normal");
  doc.text(safeToLocaleString(totalOldStock), boxX + 130, boxY + 20);

  doc.setFont("helvetica", "bold");
  doc.text("Total New Stock:", boxX + 250, boxY + 20);
  doc.setFont("helvetica", "normal");
  doc.text(safeToLocaleString(totalNewStock), boxX + 370, boxY + 20);

  drawFooter();

  doc.save("Recent_Stock_Movements.pdf");
};
