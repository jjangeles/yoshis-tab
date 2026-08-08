import Fraction from "fraction.js";

export interface ItemShare {
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shareCost: number;
  type: "item" | "misc";
  misc_calc_type: string | null;
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
function createRetinaCanvas(
  width: number,
  height: number,
  scale = 2
) {
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

function getFraction(
  shareCost: number,
  totalCost: number
): string {
  if (totalCost <= 0) {
    return "0";
  }

  return new Fraction(shareCost / totalCost).toFraction();
}

/**
 * Copies a PNG image directly to the system clipboard.
 *
 * This should be called directly from a user interaction
 * such as a "Copy Image" button click.
 */
export async function copyImageToClipboard(
  canvas: HTMLCanvasElement
): Promise<void> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error(
      "Image clipboard is not supported on this device."
    );
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Failed to create image blob.");
  }

  const clipboardItem = new ClipboardItem({
    "image/png": blob,
  });

  await navigator.clipboard.write([clipboardItem]);
}

/**
 * Triggers browser download/share compatible with
 * iOS WebKit and Desktop browsers.
 *
 * On mobile, this opens the native Share Sheet with
 * the PNG file attached.
 *
 * NOTE:
 * The "Copy" action inside the native iOS Share Sheet
 * is controlled by iOS and may copy text instead of
 * the image. Use copyImageToClipboard() for explicit
 * image clipboard support.
 */
function triggerDownload(
  canvas: HTMLCanvasElement,
  baseFilename: string
): Promise<void> {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const filename = baseFilename.replace(
      ".png",
      `-${timestamp}.png`
    );

    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(
        navigator.userAgent
      );

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
        console.error(
          "Fallback download failed:",
          e
        );
      }

      resolve();
    };

    try {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            fallbackDownload();
            return;
          }

          const file = new File(
            [blob],
            filename,
            {
              type: "image/png",
            }
          );

          // Mobile iOS/Android Web Share
          if (
            isMobile &&
            navigator.canShare &&
            navigator.canShare({
              files: [file],
            })
          ) {
            try {
              await navigator.share({
                files: [file],
                title: "Receipt Breakdown",
              });

              resolve();
              return;
            } catch (err: unknown) {
              // User cancelled the share sheet.
              if (
                err instanceof DOMException &&
                err.name === "AbortError"
              ) {
                resolve();
                return;
              }

              console.error(
                "Share failed:",
                err
              );
            }
          }

          // Desktop standard download
          const blobUrl =
            URL.createObjectURL(blob);

          const link =
            document.createElement("a");

          link.download = filename;
          link.href = blobUrl;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);

          resolve();
        },
        "image/png"
      );
    } catch (err) {
      console.error(
        "Canvas export error, using fallback:",
        err
      );

      fallbackDownload();
    }
  });
}

/**
 * Renders and downloads a single participant's receipt card.
 */
export async function exportSingleParticipantImage(
  participant: ParticipantShare,
  metadata?: ReceiptMetadata
): Promise<void> {
  try {
    const items = participant?.items || [];

    const padding = 32;
    const width = 480;

    const hasMeta = Boolean(
      metadata?.merchantName ||
        metadata?.receiptDate
    );

    const headerHeight = hasMeta ? 120 : 90;
    const itemRowHeight = 44;
    const footerHeight = 80;

    const contentHeight =
      items.length * itemRowHeight;

    const height =
      headerHeight +
      contentHeight +
      footerHeight +
      padding * 2;

    const { canvas, ctx } =
      createRetinaCanvas(
        width,
        height
      );

    if (!ctx) {
      throw new Error(
        "Could not create 2D canvas context"
      );
    }

    // Background card
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(
      0,
      0,
      width,
      height,
      24
    );
    ctx.fill();

    // Premium Top Accent Bar
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      0,
      0,
      width,
      height,
      24
    );
    ctx.clip();

    ctx.fillStyle = "#4f46e5";
    ctx.fillRect(
      0,
      0,
      width,
      8
    );

    ctx.restore();

    // Outer Border
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(
      0,
      0,
      width,
      height,
      24
    );
    ctx.stroke();

    let y = padding;

    // Merchant Name / Date row
    if (
      metadata?.merchantName ||
      metadata?.receiptDate
    ) {
      ctx.fillStyle = "#4338ca";
      ctx.font =
        "bold 13px system-ui, -apple-system, sans-serif";

      const merchantText =
        (
          metadata.merchantName || ""
        ).toUpperCase();

      ctx.fillText(
        merchantText,
        padding,
        y + 14
      );

      if (metadata.receiptDate) {
        ctx.fillStyle = "#71717a";
        ctx.font =
          "500 12px system-ui, -apple-system, sans-serif";

        const dateWidth =
          ctx.measureText(
            metadata.receiptDate
          ).width;

        ctx.fillText(
          metadata.receiptDate,
          width -
            padding -
            dateWidth,
          y + 14
        );
      }

      y += 28;
    }

    // Participant Name Header
    ctx.fillStyle = "#18181b";
    ctx.font =
      "900 28px system-ui, -apple-system, sans-serif";

    ctx.fillText(
      participant?.participantName ||
        "Participant",
      padding,
      y + 24
    );

    ctx.fillStyle = "#71717a";
    ctx.font =
      "500 13px system-ui, -apple-system, sans-serif";

    ctx.fillText(
      "Individual Receipt Breakdown",
      padding,
      y + 46
    );

    y +=
      headerHeight -
      (hasMeta ? 28 : 0);

    // Header Divider
    ctx.strokeStyle = "#f4f4f5";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(
      padding,
      y - 20
    );
    ctx.lineTo(
      width - padding,
      y - 20
    );
    ctx.stroke();

    // Items
    items.forEach((item) => {
      const totalPrice =
        item?.totalPrice || 0;

      const shareCost =
        item?.shareCost || 0;

      const percentageShare =
        totalPrice !== 0
          ? Math.abs(
              (shareCost /
                totalPrice) *
                100
            )
          : 0;

      ctx.fillStyle = "#27272a";
      ctx.font =
        "600 15px system-ui, -apple-system, sans-serif";

      ctx.fillText(
        item?.itemName || "Item",
        padding,
        y + 14
      );

      ctx.fillStyle = "#71717a";
      ctx.font =
        "400 13px system-ui, -apple-system, sans-serif";

      let subText = "";

      if (item?.type === "misc") {
        subText =
          `${percentageShare.toFixed(0)}% of ₱${totalPrice.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}`;
      } else {
        subText =
          `${getFraction(
            shareCost,
            item?.unitPrice || 0
          )} x ₱${(
            item?.unitPrice || 0
          ).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
      }

      ctx.fillText(
        subText,
        padding,
        y + 34
      );

      ctx.fillStyle = "#18181b";
      ctx.font =
        "bold 15px system-ui, -apple-system, sans-serif";

      const costText =
        `₱${shareCost.toLocaleString(
          "en-PH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`;

      const costWidth =
        ctx.measureText(costText)
          .width;

      ctx.fillText(
        costText,
        width -
          padding -
          costWidth,
        y + 24
      );

      y += itemRowHeight;
    });

    y += 10;

    // Total Section Callout Box
    const totalBoxHeight = 64;

    ctx.fillStyle = "#f8fafc";

    ctx.beginPath();
    ctx.roundRect(
      padding,
      y,
      width - padding * 2,
      totalBoxHeight,
      12
    );
    ctx.fill();

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font =
      "700 12px system-ui, -apple-system, sans-serif";

    ctx.fillText(
      "TOTAL SHARE",
      padding + 20,
      y +
        totalBoxHeight / 2 +
        4
    );

    ctx.fillStyle = "#0f172a";
    ctx.font =
      "900 24px system-ui, -apple-system, sans-serif";

    const totalShareCost =
      participant?.totalShareCost || 0;

    const totalText =
      `₱${totalShareCost.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;

    const totalWidth =
      ctx.measureText(totalText)
        .width;

    ctx.fillText(
      totalText,
      width -
        padding -
        20 -
        totalWidth,
      y +
        totalBoxHeight / 2 +
        8
    );

    const safeName = (
      participant?.participantName ||
      "participant"
    )
      .toLowerCase()
      .replace(/\s+/g, "-");

    await triggerDownload(
      canvas,
      `${safeName}-share.png`
    );
  } catch (err) {
    console.error(
      "Export single participant failed:",
      err
    );
  }
}

/**
 * Renders and downloads all participants
 * formatted in identical receipt cards.
 */
export async function exportAllParticipantsSummaryImage(
  participants: ParticipantShare[],
  metadata?: ReceiptMetadata
): Promise<void> {
  try {
    const list = Array.isArray(
      participants
    )
      ? participants
      : [];

    const padding = 32;
    const width = 520;
    const cardPadding = 24;
    const cardHeaderHeight = 44;
    const itemRowHeight = 38;
    const cardFooterHeight = 48;
    const cardGap = 24;

    const hasMeta = Boolean(
      metadata?.merchantName ||
        metadata?.receiptDate
    );

    const headerSectionHeight =
      hasMeta ? 120 : 80;

    const grandTotalSectionHeight = 90;

    let grandTotalCost = 0;

    const cardHeights = list.map(
      (p) => {
        grandTotalCost +=
          p?.totalShareCost || 0;

        const itemCount = Math.max(
          p?.items?.length || 0,
          1
        );

        return (
          cardPadding * 2 +
          cardHeaderHeight +
          itemCount *
            itemRowHeight +
          cardFooterHeight
        );
      }
    );

    const totalCardsHeight =
      cardHeights.reduce(
        (acc, h) => acc + h,
        0
      ) +
      Math.max(
        list.length - 1,
        0
      ) *
        cardGap;

    const height =
      padding * 2 +
      headerSectionHeight +
      totalCardsHeight +
      grandTotalSectionHeight;

    const { canvas, ctx } =
      createRetinaCanvas(
        width,
        height
      );

    if (!ctx) {
      throw new Error(
        "Could not create 2D canvas context"
      );
    }

    // Premium Outer background
    ctx.fillStyle = "#fcfcfd";
    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    let y = padding;

    // Header Block
    ctx.textAlign = "center";

    if (metadata?.merchantName) {
      ctx.fillStyle = "#18181b";
      ctx.font =
        "900 26px system-ui, -apple-system, sans-serif";

      ctx.fillText(
        metadata.merchantName,
        width / 2,
        y + 24
      );
    }

    if (metadata?.receiptDate) {
      const formattedDate =
        new Date(
          metadata.receiptDate
        ).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );

      ctx.fillStyle = "#71717a";
      ctx.font =
        "500 13px system-ui, -apple-system, sans-serif";

      ctx.fillText(
        formattedDate,
        width / 2,
        y + 48
      );
    }

    ctx.textAlign = "left";

    y +=
      headerSectionHeight -
      (hasMeta ? 28 : 0);

    // Cards
    list.forEach(
      (p, index) => {
        const cardHeight =
          cardHeights[index];

        const cardX = padding;
        const cardWidth =
          width - padding * 2;

        // Card Shadow
        ctx.save();

        ctx.shadowColor =
          "rgba(0, 0, 0, 0.04)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 8;

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();
        ctx.roundRect(
          cardX,
          y,
          cardWidth,
          cardHeight,
          16
        );
        ctx.fill();

        ctx.restore();

        // Card Border
        ctx.strokeStyle = "#f4f4f5";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        let innerY =
          y + cardPadding;

        // Card Header
        ctx.fillStyle = "#18181b";
        ctx.font =
          "800 18px system-ui, -apple-system, sans-serif";

        ctx.fillText(
          p?.participantName ||
            "Participant",
          cardX + cardPadding,
          innerY + 16
        );

        ctx.fillStyle = "#a1a1aa";
        ctx.font =
          "500 12px system-ui, -apple-system, sans-serif";

        ctx.fillText(
          "Individual Breakdown",
          cardX + cardPadding,
          innerY + 36
        );

        innerY += cardHeaderHeight;

        // Soft Divider
        ctx.strokeStyle = "#f4f4f5";

        ctx.beginPath();
        ctx.moveTo(
          cardX + cardPadding,
          innerY
        );
        ctx.lineTo(
          cardX +
            cardWidth -
            cardPadding,
          innerY
        );
        ctx.stroke();

        innerY += 16;

        const pItems =
          p?.items || [];

        if (pItems.length === 0) {
          ctx.fillStyle = "#a1a1aa";
          ctx.font =
            "italic 13px system-ui, -apple-system, sans-serif";

          ctx.fillText(
            "No items assigned",
            cardX + cardPadding,
            innerY + 16
          );

          innerY += itemRowHeight;
        } else {
          pItems.forEach(
            (item) => {
              const totalPrice =
                item?.totalPrice || 0;

              const shareCost =
                item?.shareCost || 0;

              const percentageShare =
                totalPrice !== 0
                  ? Math.abs(
                      (shareCost /
                        totalPrice) *
                        100
                    )
                  : 0;

              ctx.fillStyle =
                "#27272a";

              ctx.font =
                "600 14px system-ui, -apple-system, sans-serif";

              ctx.fillText(
                item?.itemName ||
                  "Item",
                cardX +
                  cardPadding,
                innerY + 12
              );

              ctx.fillStyle =
                "#71717a";

              ctx.font =
                "400 12px system-ui, -apple-system, sans-serif";

              let subText = "";

              if (
                item?.type ===
                "misc"
              ) {
                subText =
                  `${percentageShare.toFixed(0)}% of ₱${totalPrice.toLocaleString(
                    "en-PH",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`;
              } else {
                subText =
                  `${getFraction(
                    shareCost,
                    item?.unitPrice || 0
                  )} x ₱${(
                    item?.unitPrice || 0
                  ).toLocaleString(
                    "en-PH",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`;
              }

              ctx.fillText(
                subText,
                cardX +
                  cardPadding,
                innerY + 28
              );

              ctx.fillStyle =
                "#18181b";

              ctx.font =
                "bold 14px system-ui, -apple-system, sans-serif";

              const costText =
                `₱${shareCost.toLocaleString(
                  "en-PH",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`;

              const costWidth =
                ctx.measureText(
                  costText
                ).width;

              ctx.fillText(
                costText,
                cardX +
                  cardWidth -
                  cardPadding -
                  costWidth,
                innerY + 18
              );

              innerY +=
                itemRowHeight;
            }
          );
        }

        // Pre-Total Divider
        ctx.save();

        ctx.strokeStyle =
          "#e4e4e7";

        ctx.setLineDash([
          4,
          4,
        ]);

        ctx.beginPath();
        ctx.moveTo(
          cardX + cardPadding,
          innerY
        );
        ctx.lineTo(
          cardX +
            cardWidth -
            cardPadding,
          innerY
        );
        ctx.stroke();

        ctx.restore();

        innerY += 20;

        ctx.fillStyle = "#71717a";
        ctx.font =
          "700 11px system-ui, -apple-system, sans-serif";

        ctx.fillText(
          "TOTAL SHARE",
          cardX +
            cardPadding,
          innerY + 14
        );

        ctx.fillStyle =
          "#18181b";

        ctx.font =
          "900 18px system-ui, -apple-system, sans-serif";

        const totalShare =
          p?.totalShareCost || 0;

        const subTotalText =
          `₱${totalShare.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}`;

        const subTotalWidth =
          ctx.measureText(
            subTotalText
          ).width;

        ctx.fillText(
          subTotalText,
          cardX +
            cardWidth -
            cardPadding -
            subTotalWidth,
          innerY + 16
        );

        y +=
          cardHeight +
          cardGap;
      }
    );

    // Grand Total Card
    const grandTotalWidth =
      width - padding * 2;

    ctx.save();

    ctx.shadowColor =
      "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    ctx.fillStyle = "#18181b";

    ctx.beginPath();
    ctx.roundRect(
      padding,
      y,
      grandTotalWidth,
      72,
      16
    );
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#a1a1aa";
    ctx.font =
      "700 12px system-ui, -apple-system, sans-serif";

    ctx.fillText(
      "GRAND TOTAL",
      padding + 28,
      y + 40
    );

    ctx.fillStyle = "#ffffff";
    ctx.font =
      "900 24px system-ui, -apple-system, sans-serif";

    const grandTotalStr =
      `₱${grandTotalCost.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;

    const grandTotalW =
      ctx.measureText(
        grandTotalStr
      ).width;

    ctx.fillText(
      grandTotalStr,
      width -
        padding -
        28 -
        grandTotalW,
      y + 44
    );

    await triggerDownload(
      canvas,
      "receipt-summary-all.png"
    );
  } catch (err) {
    console.error(
      "Export all participants summary failed:",
      err
    );
  }
}
