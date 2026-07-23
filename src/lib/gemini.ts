export async function parseReceiptImage(imageUrl: string) {
  // Placeholder: implement Gemini Vision API integration here.
  // This function should send the image to the AI endpoint and return
  // structured receipt data such as merchant, items, taxes, and totals.
  return {
    merchantName: "",
    receiptDate: null,
    subtotal: 0,
    tax: 0,
    serviceCharge: 0,
    discount: 0,
    total: 0,
    currency: "PHP",
    items: [],
  };
}
