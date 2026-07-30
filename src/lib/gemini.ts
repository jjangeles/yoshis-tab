import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.5-flash";

interface ParsedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  type: "item" | "misc";
}

interface ParsedReceipt {
  merchant_name: string;
  receipt_date: string | null;
  items: ParsedItem[];
  subtotal: number | null;
  tax: number | null;
  service_charge: number | null;
  discount: number | null;
  total: number;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  if (!cleaned.startsWith("{")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }
  }

  return cleaned;
}

async function fetchImageInlineData(imageUrl: string): Promise<{ mimeType: string; base64: string }> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download receipt image: ${imageResponse.status} ${imageResponse.statusText}`);
  }

  const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
  const mimeType = contentType.split(";")[0].trim() || "application/octet-stream";
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return { mimeType, base64 };
}

export async function parseReceiptImage(imageUrl: string): Promise<ParsedReceipt> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const prompt = `
    Extract receipt data from the provided image into a JSON object.

    ### CRITICAL ITEM CLASSIFICATION RULES:
    1. Standard products, food, or drinks MUST have "type": "item".
    2. Non-product financial line items MUST have "type": "misc". This includes:
      - Tax / VAT / GST / Service Charges / Tips
      - Discounts / Promos / Vouchers (Must have negative unit_price and total_price, e.g. -50.00)

    ### CRITICAL ARITHMETIC & VAT-INCLUSIVE RULES:
    - The sum of all items in "items" (item total_prices + negative discount + tax + charges) MUST strictly equal the final "total" on the receipt.
    - **VAT-Inclusive Receipts Check**: If individual line item prices are already VAT-inclusive, DO NOT add "VAT" or "Tax" as an item with "type": "misc" if doing so would double-count the tax and make the sum of items exceed the total.
    - Only include Tax / VAT as an item in "items" if the line items were listed TAX-EXCLUSIVE (net price) and the tax is added on top to reach the total.
    - Subtotal, Tax, Service Charge, and Discount fields in the root object should still be populated for metadata reference, but "items" array must sum cleanly to "total".

    Format merchant_name in Title Case.
  `;

  const inlineData = await fetchImageInlineData(imageUrl);
  const client = new GoogleGenerativeAI(GEMINI_API_KEY);

  // ✅ Enforce Structured JSON Schema on Gemini API level
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          merchant_name: { type: SchemaType.STRING },
          receipt_date: { type: SchemaType.STRING, nullable: true },
          total: { type: SchemaType.NUMBER },
          subtotal: { type: SchemaType.NUMBER, nullable: true },
          tax: { type: SchemaType.NUMBER, nullable: true },
          service_charge: { type: SchemaType.NUMBER, nullable: true },
          discount: { type: SchemaType.NUMBER, nullable: true },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                quantity: { type: SchemaType.NUMBER },
                unit_price: { type: SchemaType.NUMBER },
                total_price: { type: SchemaType.NUMBER },
                type: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["item", "misc"],
                },
              },
              required: ["name", "quantity", "unit_price", "total_price", "type"],
            },
          },
        },
        required: ["merchant_name", "total", "items"],
      },
    },
  });

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: inlineData.mimeType,
        data: inlineData.base64,
      },
    },
  ]);

  const text = result.response?.text();

  if (!text) {
    throw new Error("Gemini response did not contain text output.");
  }

  const cleanedResponse = cleanJsonText(text);
  let parsed: any;

  try {
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    throw new Error("Gemini response was not valid JSON.");
  }

  let items: ParsedItem[] = (parsed.items || []).map((item: any) => ({
    name: String(item.name || ""),
    quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1,
    unit_price: parseNumber(item.unit_price) ?? 0,
    total_price: parseNumber(item.total_price) ?? 0,
    type: item.type === "misc" ? "misc" : "item",
  }));

  const total = Number(parsed.total) || 0;

  // 2. 🛡️ POST-PROCESSING GUARDRAIL ADDED HERE:
  // Calculate sum of all parsed line items
  const sumItems = items.reduce((acc, curr) => acc + curr.total_price, 0);

  // If there's a discrepancy where tax was double-counted on VAT-inclusive prices:
  if (Math.abs(sumItems - total) > 0.05) {
    const adjustedItems = items.filter((item) => {
      // Remove standalone positive tax/VAT misc items if they caused total to overshoot
      const isTax = item.type === "misc" && /vat|tax|gst/i.test(item.name);
      return !isTax;
    });

    const newSum = adjustedItems.reduce((acc, curr) => acc + curr.total_price, 0);
    
    // If dropping double-counted VAT fixes the math, use the adjusted items list
    if (Math.abs(newSum - total) <= 0.05) {
      items = adjustedItems;
    }
  }

  return {
    merchant_name: String(parsed.merchant_name || ""),
    receipt_date: typeof parsed.receipt_date === "string" ? parsed.receipt_date : null,
    items,
    subtotal: parseNumber(parsed.subtotal),
    tax: parseNumber(parsed.tax),
    service_charge: parseNumber(parsed.service_charge),
    discount: parseNumber(parsed.discount),
    total,
  };
}