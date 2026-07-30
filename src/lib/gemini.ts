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
    Extract receipt data from the provided image into JSON.

    ### CRITICAL ITEM TYPE RULES:
    1. Standard purchased products, food, or drinks MUST have "type": "item".
    2. Non-product financial line items MUST have "type": "misc". This includes:
       - Tax / VAT / GST
       - Service Charges / Delivery Fees / Tips
       - Discounts / Promos / Vouchers (Must have negative unit_price and total_price, e.g. -50.00)
       - Rounding adjustments

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

  const items: ParsedItem[] = (parsed.items || []).map((item: any) => ({
    name: String(item.name || ""),
    quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1,
    unit_price: parseNumber(item.unit_price) ?? 0,
    total_price: parseNumber(item.total_price) ?? 0,
    type: item.type === "misc" ? "misc" : "item", // ✅ Preserved and safely typed!
  }));

  return {
    merchant_name: String(parsed.merchant_name || ""),
    receipt_date: typeof parsed.receipt_date === "string" ? parsed.receipt_date : null,
    items,
    subtotal: parseNumber(parsed.subtotal),
    tax: parseNumber(parsed.tax),
    service_charge: parseNumber(parsed.service_charge),
    discount: parseNumber(parsed.discount),
    total: Number(parsed.total),
  };
}