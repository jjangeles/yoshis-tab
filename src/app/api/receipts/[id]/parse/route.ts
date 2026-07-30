import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseReceiptImage } from "@/lib/gemini";
import type { Database } from "@/types/database";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { id: receiptId } = await context.params;

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: receipt, error: receiptError } = (await supabase
    .from("receipts")
    .select("id, owner_id, image_url")
    .eq("id", receiptId)
    .single()) as any;

  if (receiptError || !receipt) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  if (receipt.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  if (!receipt.image_url || typeof receipt.image_url !== "string") {
    return NextResponse.json({ error: "Receipt image not available." }, { status: 400 });
  }

  const storagePath = receipt.image_url;

  const { data: signedUrlData, error: signedUrlError } =
    await supabase.storage
      .from("receipt-images")
      .createSignedUrl(storagePath, 60 * 10);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      {
        error: signedUrlError?.message ?? "Unable to create image access URL."
      },
      { status: 500 }
    );
  }

  const imageUrl = signedUrlData.signedUrl;

  let parsedReceipt;

  try {
    parsedReceipt = await parseReceiptImage(imageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receipt parsing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const updatePayload: Record<string, unknown> = {
    merchant_name: parsedReceipt.merchant_name,
    receipt_date: parsedReceipt.receipt_date,
    total: parsedReceipt.total,
  };

  if (parsedReceipt.subtotal !== null) {
    updatePayload.subtotal = parsedReceipt.subtotal;
  }
  if (parsedReceipt.tax !== null) {
    updatePayload.tax = parsedReceipt.tax;
  }
  if (parsedReceipt.service_charge !== null) {
    updatePayload.service_charge = parsedReceipt.service_charge;
  }
  if (parsedReceipt.discount !== null) {
    updatePayload.discount = parsedReceipt.discount;
  }

  const { error: updateError } = await (supabase.from("receipts") as any)
    .update(updatePayload)
    .eq("id", receiptId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const deleteResult = await supabase
    .from("receipt_items")
    .delete()
    .eq("receipt_id", receiptId);

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  const itemRows = parsedReceipt.items.map((item) => ({
    receipt_id: receiptId,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    type: item.type,
    misc_calc_type: item.type === "misc" ? "PROPORTIONAL" : "EVEN",
  }));

  const { error: itemsInsertError } = await supabase
    .from("receipt_items")
    .insert(itemRows as any);

  if (itemsInsertError) {
    return NextResponse.json({ error: itemsInsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, items: itemRows });
}