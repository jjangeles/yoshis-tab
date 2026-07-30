export interface ItemShare {
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shareCost: number;
  type: "item" | "misc";
}

export interface ParticipantShare {
  participantId: string;
  participantName: string;
  items: ItemShare[];
  totalShareCost: number;
}

export interface ReceiptMetadata {
  merchantName?: string | null;
  receiptDate?: string | null;
}

// Helper for high-DPI canvas setup
function createRetinaCanvas(width: number, height: number, scale = 2) {
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(scale, scale);
  }
  return { canvas, ctx };
}

/**
 * Triggers browser download for a canvas, automatically adding a timestamp to filename.
 */
function triggerDownload(canvas: HTMLCanvasElement, baseFilename: string) {
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");

  // Add numerical timestamp to prevent conflicts (e.g., "jane-share-1721234567890.png")
  const timestamp = Date.now();
  link.download = baseFilename.replace(".png", `-${timestamp}.png`);
  
  link.href = dataUrl;
  link.click();
}

/**
 * Renders and downloads a single participant's receipt card
 */
export function exportSingleParticipantImage(
  participant: ParticipantShare,
  metadata?: ReceiptMetadata
) {
  const padding = 32;
  const width = 480;
  
  // Extra space in header if merchant or date is present
  const hasMeta = Boolean(metadata?.merchantName || metadata?.receiptDate);
  const headerHeight = hasMeta ? 120 : 90;
  const itemRowHeight = 44;
  const footerHeight = 80;

  const contentHeight = participant.items.length * itemRowHeight;
  const height = headerHeight + contentHeight + footerHeight + padding * 2;

  const { canvas, ctx } = createRetinaCanvas(width, height);
  if (!ctx) return;

  // Background card
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 24);
  ctx.fill();

  // Border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = padding;

  // Merchant Name / Date row (if present)
  if (metadata?.merchantName || metadata?.receiptDate) {
    ctx.fillStyle = "#2563eb"; // Accent color for merchant
    ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
    
    const merchantText = (metadata.merchantName || "").toUpperCase();
    ctx.fillText(merchantText, padding, y + 14);

    if (metadata.receiptDate) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      const dateWidth = ctx.measureText(metadata.receiptDate).width;
      ctx.fillText(metadata.receiptDate, width - padding - dateWidth, y + 14);
    }
    y += 28;
  }

  // Participant Name Header
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(participant.participantName, padding, y + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText("Individual Receipt Breakdown", padding, y + 40);

  y += headerHeight - (hasMeta ? 28 : 0);

  // Divider
  ctx.strokeStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(padding, y - 20);
  ctx.lineTo(width - padding, y - 20);
  ctx.stroke();

  // Items
  participant.items.forEach((item) => {
    const percentageShare =
      item.totalPrice && item.totalPrice !== 0
        ? Math.abs((item.shareCost / item.totalPrice) * 100)
        : 0;

    ctx.fillStyle = "#0f172a";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText(item.itemName, padding, y + 14);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui, -apple-system, sans-serif";

    let subText = `${item.quantity} x ₱${item.unitPrice.toFixed(2)}`;
    if (item.type === "misc") {
      subText = `[Misc] ${percentageShare.toFixed(0)}% of ₱${item.totalPrice.toFixed(2)}`;
    }
    ctx.fillText(subText, padding, y + 32);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    const costText = `₱${item.shareCost.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const costWidth = ctx.measureText(costText).width;
    ctx.fillText(costText, width - padding - costWidth, y + 24);

    y += itemRowHeight;
  });

  y += 10;
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  // Total
  y += 30;
  ctx.fillStyle = "#64748b";
  ctx.font = "600 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("TOTAL SHARE", padding, y + 10);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  const totalText = `₱${participant.totalShareCost.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const totalWidth = ctx.measureText(totalText).width;
  ctx.fillText(totalText, width - padding - totalWidth, y + 12);

  // Clean filename base (triggerDownload adds timestamp)
  const filenameBase = `${participant.participantName.toLowerCase().replace(/\s+/g, "-")}-share.png`;
  triggerDownload(canvas, filenameBase);
}

/**
 * Renders and downloads all participants formatted in identical receipt cards
 */
export function exportAllParticipantsSummaryImage(
  participants: ParticipantShare[],
  metadata?: ReceiptMetadata
) {
  const padding = 32;
  const width = 520;
  const cardPadding = 20;
  const cardHeaderHeight = 40;
  const itemRowHeight = 36;
  const cardFooterHeight = 40;
  const cardGap = 20;
  
  const hasMeta = Boolean(metadata?.merchantName || metadata?.receiptDate);
  const headerSectionHeight = hasMeta ? 110 : 80;
  const grandTotalSectionHeight = 90;

  // Calculate card heights
  let totalCardsHeight = 0;
  let grandTotalCost = 0;

  const cardHeights = participants.map((p) => {
    grandTotalCost += p.totalShareCost;
    const itemCount = Math.max(p.items.length, 1);
    return cardPadding * 2 + cardHeaderHeight + itemCount * itemRowHeight + cardFooterHeight;
  });

  totalCardsHeight =
    cardHeights.reduce((acc, h) => acc + h, 0) +
    (participants.length - 1) * cardGap;

  const height =
    padding * 2 +
    headerSectionHeight +
    totalCardsHeight +
    grandTotalSectionHeight;

  const { canvas, ctx } = createRetinaCanvas(width, height);
  if (!ctx) return;

  // Outer background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  let y = padding;

  // Main Summary Header Title Block (Centered Merchant Name & Date)
  ctx.textAlign = "center";

  if (metadata?.merchantName) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(metadata.merchantName, width / 2, y + 22);
  }

  if (metadata?.receiptDate) {
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.fillText(metadata.receiptDate, width / 2, y + 44);
  }

  // Reset alignment back to left for the rest of the canvas elements
  ctx.textAlign = "left";

  y += headerSectionHeight - (hasMeta ? 28 : 0);

  // Render cards for each participant
  participants.forEach((p, index) => {
    const cardHeight = cardHeights[index];
    const cardX = padding;
    const cardWidth = width - padding * 2;

    // Card background
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cardX, y, cardWidth, cardHeight, 16);
    ctx.fill();

    // Card border
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.stroke();

    let innerY = y + cardPadding;

    // Participant Title Header
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
    ctx.fillText(p.participantName, cardX + cardPadding, innerY + 16);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillText("Individual Breakdown", cardX + cardPadding, innerY + 32);

    innerY += cardHeaderHeight;

    // Divider
    ctx.strokeStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.moveTo(cardX + cardPadding, innerY);
    ctx.lineTo(cardX + cardWidth - cardPadding, innerY);
    ctx.stroke();

    innerY += 12;

    // Line items
    if (p.items.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 12px system-ui, -apple-system, sans-serif";
      ctx.fillText("No items assigned", cardX + cardPadding, innerY + 16);
      innerY += itemRowHeight;
    } else {
      p.items.forEach((item) => {
        const percentageShare =
          item.totalPrice && item.totalPrice !== 0
            ? Math.abs((item.shareCost / item.totalPrice) * 100)
            : 0;

        ctx.fillStyle = "#0f172a";
        ctx.font = "500 13px system-ui, -apple-system, sans-serif";
        ctx.fillText(item.itemName, cardX + cardPadding, innerY + 12);

        ctx.fillStyle = "#64748b";
        ctx.font = "11px system-ui, -apple-system, sans-serif";
        let subText = `${item.quantity} x ₱${item.unitPrice.toFixed(2)}`;
        if (item.type === "misc") {
          subText = `[Misc] ${percentageShare.toFixed(0)}% of ₱${item.totalPrice.toFixed(2)}`;
        }
        ctx.fillText(subText, cardX + cardPadding, innerY + 26);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
        const costText = `₱${item.shareCost.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
        const costWidth = ctx.measureText(costText).width;
        ctx.fillText(
          costText,
          cardX + cardWidth - cardPadding - costWidth,
          innerY + 18
        );

        innerY += itemRowHeight;
      });
    }

    // Inner bottom border
    ctx.strokeStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.moveTo(cardX + cardPadding, innerY);
    ctx.lineTo(cardX + cardWidth - cardPadding, innerY);
    ctx.stroke();

    innerY += 16;

    // Sub-total
    ctx.fillStyle = "#64748b";
    ctx.font = "600 11px system-ui, -apple-system, sans-serif";
    ctx.fillText("TOTAL SHARE", cardX + cardPadding, innerY + 10);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
    const subTotalText = `₱${p.totalShareCost.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const subTotalWidth = ctx.measureText(subTotalText).width;
    ctx.fillText(
      subTotalText,
      cardX + cardWidth - cardPadding - subTotalWidth,
      innerY + 10
    );

    y += cardHeight + cardGap;
  });

  // Grand Total Card
  const grandTotalWidth = width - padding * 2;
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(padding, y, grandTotalWidth, 64, 16);
  ctx.fill();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("GRAND TOTAL", padding + 24, y + 36);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  const grandTotalStr = `₱${grandTotalCost.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const grandTotalW = ctx.measureText(grandTotalStr).width;
  ctx.fillText(grandTotalStr, width - padding - 24 - grandTotalW, y + 38);

  // Trigger download (helper automatically adds timestamp)
  triggerDownload(canvas, "receipt-summary-all.png");
}
