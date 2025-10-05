import { supabaseServer } from "./supabaseServer";

/**
 * Handles payment processing for NFT purchases using Crossmint USDXM
 * 
 * IMPORTANT: This is a template for production implementation.
 * To use real payments, set CROSSMINT_MOCK_MINT=false in .env
 */
export async function processPayment(
  buyerWallet: string, 
  sellerWallet: string,
  amountUsdxm: number,
  description: string,
  trackId: number
): Promise<{success: boolean, transactionId?: string, error?: string}> {
  const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Missing Crossmint API key");
  }
  
  try {
    // 1. Create a payment transaction
    const paymentResp = await fetch("https://api.crossmint.com/v1/wallets/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: buyerWallet,
        to: sellerWallet,
        amount: amountUsdxm.toString(), // Amount in USDXM
        asset: "USDXM",
        description: description
      })
    });
    
    if (!paymentResp.ok) {
      const errorData = await paymentResp.json();
      console.error("Payment failed:", errorData);
      
      // Record failed transaction attempt
      await supabaseServer
        .from("payment_transactions")
        .insert({
          buyer_wallet: buyerWallet,
          seller_wallet: sellerWallet,
          amount_usdxm: amountUsdxm,
          track_id: trackId,
          status: "failed",
          error_message: JSON.stringify(errorData)
        });
        
      return {
        success: false,
        error: errorData.message || "Payment failed"
      };
    }
    
    const paymentData = await paymentResp.json();
    const txId = paymentData.id || paymentData.transactionId;
    
    // 2. Record successful payment
    await supabaseServer
      .from("payment_transactions")
      .insert({
        buyer_wallet: buyerWallet,
        seller_wallet: sellerWallet,
        amount_usdxm: amountUsdxm,
        track_id: trackId,
        status: "completed",
        transaction_id: txId
      });
      
    return {
      success: true,
      transactionId: txId
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown payment error"
    };
  }
}
