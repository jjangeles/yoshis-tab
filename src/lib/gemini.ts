import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.5-flash";

interface ParsedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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

  // Remove markdown code fences if present.
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // If the response contains surrounding text, extract the first JSON object.
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
    Extract the receipt data from the image at the following URL. Return valid JSON only with these fields:
    {
      "merchant_name": string,
      "receipt_date": string | null,
      "items": [
        {"name": string, "quantity": number, "unit_price": number, "total_price": number}
      ],
      "total": number
    }
    Use null for missing numeric values. Do not include any extra properties.
    Tax and discount should be included under items when it is not yet added/deducted
    to the item values you can determine this if all the sum of the receipt items already equals to the total.
    Return negative value for discount.

    Format merchant name to be in title case (e.g., "Starbucks Coffee" instead of "starbucks coffee").

    Image URL: ${imageUrl}
  `;

  const inlineData = await fetchImageInlineData(imageUrl);
  const client = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent([
    {
      text: prompt,
    },
    {
      inlineData: {
        mimeType: inlineData.mimeType,
        data: inlineData.base64,
      },
    },
  ]);

  const candidate = result.response?.candidates?.[0];
  const textPart = candidate?.content?.parts?.find(
    (part): part is { text: string } => typeof (part as any)?.text === "string"
  );
  const text = textPart?.text;

  if (typeof text !== "string") {
    throw new Error("Gemini response did not contain text output.");
  }

  const rawResponse = text.trim();
  const cleanedResponse = cleanJsonText(rawResponse);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    throw new Error("Gemini response was not valid JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as any).merchant_name !== "string" ||
    typeof (parsed as any).total !== "number" ||
    !Array.isArray((parsed as any).items)
  ) {
    throw new Error("Gemini response did not match expected receipt schema.");
  }

  const items = (parsed as any).items.map((item: any) => ({
    name: String(item.name || ""),
    quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1,
    unit_price: parseNumber(item.unit_price) ?? 0,
    total_price: parseNumber(item.total_price) ?? 0,
  }));

  return {
    merchant_name: String((parsed as any).merchant_name || ""),
    receipt_date: typeof (parsed as any).receipt_date === "string" ? (parsed as any).receipt_date : null,
    items,
    subtotal: parseNumber((parsed as any).subtotal),
    tax: parseNumber((parsed as any).tax),
    service_charge: parseNumber((parsed as any).service_charge),
    discount: parseNumber((parsed as any).discount),
    total: Number((parsed as any).total),
  };
}
