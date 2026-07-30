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
  const safeWidth = Math.max(Math.floor(width || 480), 100);
  const safeHeight = Math.max(Math.floor(height || 300), 100);

  const canvas = document.createElement("canvas");
  canvas.width = safeWidth * scale;
  canvas.height = safeHeight * scale;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(scale, scale);
  }
  return { canvas, ctx };
}

/**
 * Triggers browser download/share compatible with iOS WebKit and Desktop browsers.
 */
function triggerDownload(canvas: HTMLCanvasElement, baseFilename: string): Promise<void> {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const filename = baseFilename.replace(".png", `-${timestamp}.png`);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Synchronous fallback helper
    const fallbackDownload = () => {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("Fallback download failed:", e);
      }
      resolve();
    };

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          fallbackDownload();
          return;
        }

        const file = new File([blob], filename, { type: "image/png" });

        // Mobile iOS/Android Web Share
        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Receipt Breakdown",
            });
            resolve();
            return;
          } catch (err: any) {
            if (err.name === "AbortError") {
              resolve();
              return;
            }
          }
        }

        // Desktop standard download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        resolve();
      }, "image/png");
    } catch (err) {
      console.error("Canvas export error, using fallback:", err);
      fallbackDownload();
    }
  });
}

/**
 * Renders and downloads a single participant's receipt card
 */
export async function exportSingleParticipantImage(
  participant: ParticipantShare,
  metadata?: ReceiptMetadata
): Promise<void> {
  try {
    const items = participant?.items || [];
    const padding = 32;
    const width = 480;

    const hasMeta = Boolean(metadata?.merchantName || metadata?.receiptDate);
    const headerHeight = hasMeta ? 120 : 90;
    const itemRowHeight = 44;
    const footerHeight = 80;

    const contentHeight = items.length * itemRowHeight;
    const height = headerHeight + contentHeight + footerHeight + padding * 2;

    const { canvas, ctx } = createRetinaCanvas(width, height);
    if (!ctx) throw new Error("Could not create 2D canvas context");

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

    // Merchant Name / Date row
    if (metadata?.merchantName || metadata?.receiptDate) {
      ctx.fillStyle = "#2563eb";
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
    ctx.fillText(participant?.participantName || "Participant", padding, y + 20);

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
    items.forEach((item) => {
      const totalPrice = item?.totalPrice || 0;
      const shareCost = item?.shareCost || 0;
      const percentageShare =
        totalPrice !== 0 ? Math.abs((shareCost / totalPrice) * 100) : 0;

      ctx.fillStyle = "#0f172a";
      ctx.font = "500 14px system-ui, -apple-system, sans-serif";
      ctx.fillText(item?.itemName || "Item", padding, y + 14);

      ctx.fillStyle = "#64748b";
      ctx.font = "12px system-ui, -apple-system, sans-serif";

      let subText = `${item?.quantity || 1} x ₱${(item?.unitPrice || 0).toFixed(2)}`;
      if (item?.type === "misc") {
        subText = `[Misc] ${percentageShare.toFixed(0)}% of ₱${totalPrice.toFixed(2)}`;
      }
      ctx.fillText(subText, padding, y + 32);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      const costText = `₱${shareCost.toLocaleString("en-PH", {
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
    const totalShareCost = participant?.totalShareCost || 0;
    const totalText = `₱${totalShareCost.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const totalWidth = ctx.measureText(totalText).width;
    ctx.fillText(totalText, width - padding - totalWidth, y + 12);

    const safeName = (participant?.participantName || "participant")
      .toLowerCase()
      .replace(/\s+/g, "-");
    await triggerDownload(canvas, `${safeName}-share.png`);
  } catch (err) {
    console.error("Export single participant failed:", err);
  }
}

/**
 * Renders and downloads all participants formatted in identical receipt cards
 */
export async function exportAllParticipantsSummaryImage(
  participants: ParticipantShare[],
  metadata?: ReceiptMetadata
): Promise<void> {
  try {
    const list = Array.isArray(participants) ? participants : [];
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

    let grandTotalCost = 0;

    const cardHeights = list.map((p) => {
      grandTotalCost += p?.totalShareCost || 0;
      const itemCount = Math.max(p?.items?.length || 0, 1);
      return cardPadding * 2 + cardHeaderHeight + itemCount * itemRowHeight + cardFooterHeight;
    });

    const totalCardsHeight =
      cardHeights.reduce((acc, h) => acc + h, 0) +
      Math.max(list.length - 1, 0) * cardGap;

    const height =
      padding * 2 +
      headerSectionHeight +
      totalCardsHeight +
      grandTotalSectionHeight;

    const { canvas, ctx } = createRetinaCanvas(width, height);
    if (!ctx) throw new Error("Could not create 2D canvas context");

    // Outer background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    let y = padding;

    // Header Block
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

    ctx.textAlign = "left";
    y += headerSectionHeight - (hasMeta ? 28 : 0);

    // Cards
    list.forEach((p, index) => {
      const cardHeight = cardHeights[index];
      const cardX = padding;
      const cardWidth = width - padding * 2;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cardX, y, cardWidth, cardHeight, 16);
      ctx.fill();

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      let innerY = y + cardPadding;

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.fillText(p?.participantName || "Participant", cardX + cardPadding, innerY + 16);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.fillText("Individual Breakdown", cardX + cardPadding, innerY + 32);

      innerY += cardHeaderHeight;

      ctx.strokeStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.moveTo(cardX + cardPadding, innerY);
      ctx.lineTo(cardX + cardWidth - cardPadding, innerY);
      ctx.stroke();

      innerY += 12;

      const pItems = p?.items || [];
      if (pItems.length === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "italic 12px system-ui, -apple-system, sans-serif";
        ctx.fillText("No items assigned", cardX + cardPadding, innerY + 16);
        innerY += itemRowHeight;
      } else {
        pItems.forEach((item) => {
          const totalPrice = item?.totalPrice || 0;
          const shareCost = item?.shareCost || 0;
          const percentageShare =
            totalPrice !== 0 ? Math.abs((shareCost / totalPrice) * 100) : 0;

          ctx.fillStyle = "#0f172a";
          ctx.font = "500 13px system-ui, -apple-system, sans-serif";
          ctx.fillText(item?.itemName || "Item", cardX + cardPadding, innerY + 12);

          ctx.fillStyle = "#64748b";
          ctx.font = "11px system-ui, -apple-system, sans-serif";
          let subText = `${item?.quantity || 1} x ₱${(item?.unitPrice || 0).toFixed(2)}`;
          if (item?.type === "misc") {
            subText = `[Misc] ${percentageShare.toFixed(0)}% of ₱${totalPrice.toFixed(2)}`;
          }
          ctx.fillText(subText, cardX + cardPadding, innerY + 26);

          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
          const costText = `₱${shareCost.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
          const costWidth = ctx.measureText(costText).width;
          ctx.fillText(costText, cardX + cardWidth - cardPadding - costWidth, innerY + 18);

          innerY += itemRowHeight;
        });
      }

      ctx.strokeStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.moveTo(cardX + cardPadding, innerY);
      ctx.lineTo(cardX + cardWidth - cardPadding, innerY);
      ctx.stroke();

      innerY += 16;

      ctx.fillStyle = "#64748b";
      ctx.font = "600 11px system-ui, -apple-system, sans-serif";
      ctx.fillText("TOTAL SHARE", cardX + cardPadding, innerY + 10);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      const totalShare = p?.totalShareCost || 0;
      const subTotalText = `₱${totalShare.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      const subTotalWidth = ctx.measureText(subTotalText).width;
      ctx.fillText(subTotalText, cardX + cardWidth - cardPadding - subTotalWidth, innerY + 10);

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

    await triggerDownload(canvas, "receipt-summary-all.png");
  } catch (err) {
    console.error("Export all participants summary failed:", err);
  }
}