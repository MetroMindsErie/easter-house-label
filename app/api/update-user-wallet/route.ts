import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Keep track of processed requests to prevent duplicates
const processedRequests = new Map<string, number>();

type UpdateWalletBody = {
  userId: string;
  walletAddress: string;
  crossmintWalletId?: string;
  email?: string;
  nonce?: string; // Optional nonce to prevent duplicate requests
};

export async function POST(request: Request) {
  try {
    const body: UpdateWalletBody = await request.json();
    
    if (!body.userId || !body.walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: userId and walletAddress" 
      }, { status: 400 });
    }

    // Create a unique key for this request
    const requestKey = `${body.userId}:${body.walletAddress}`;
    
    // Check if we've seen this exact request recently (within last 30 seconds)
    const now = Date.now();
    const lastProcessed = processedRequests.get(requestKey) || 0;
    
    if (now - lastProcessed < 30000) { // 30 seconds
      console.log(`Duplicate request detected for ${body.userId.slice(0, 8)}, skipping...`);
      return NextResponse.json({ 
        success: true, 
        updated: false,
        duplicate: true,
        message: "Duplicate request detected, already processed recently" 
      });
    }
    
    // Record this request to prevent duplicates
    processedRequests.set(requestKey, now);
    
    // Clean up old entries to prevent memory leaks
    for (const [key, timestamp] of processedRequests.entries()) {
      if (now - timestamp > 120000) { // 2 minutes
        processedRequests.delete(key);
      }
    }

    console.log(`Processing wallet update for user ${body.userId.slice(0, 8)}...`);

    // First check if user already has this wallet address to prevent unnecessary updates
    const { data: existingUser } = await supabaseServer
      .from("users")
      .select("wallet_address, crossmint_wallet_id")
      .eq("id", body.userId)
      .single();
    
    // If user already has the same wallet address, skip the update
    if (existingUser && 
        existingUser.wallet_address === body.walletAddress && 
        existingUser.crossmint_wallet_id === body.crossmintWalletId) {
      console.log(`User ${body.userId.slice(0, 8)} already has this wallet information - skipping update`);
      return NextResponse.json({ 
        success: true, 
        updated: false,
        message: "User wallet information already up to date" 
      });
    }

    // First ensure user exists in auth.users and users tables
    if (body.email) {
      const { data: authUser, error: authError } = await supabaseServer.auth.admin.getUserById(body.userId);
      
      if (authError || !authUser?.user) {
        console.log(`User ${body.userId} not found in auth, creating...`);
        
        // Create the user in auth.users if they don't exist
        const { data: newUser, error: createError } = await supabaseServer.auth.admin.createUser({
          email: body.email,
          email_confirm: true,
          user_metadata: {
            provider: "crossmint"
          }
        });
        
        if (createError) {
          console.error("Failed to create auth user:", createError);
        } else {
          console.log(`Created auth user for ${body.userId}`);
        }
      }
      
      // Check if user exists in public.users table
      const { data: publicUser } = await supabaseServer
        .from("users")
        .select("id")
        .eq("id", body.userId)
        .single();
      
      // If not found in public.users, insert directly
      if (!publicUser) {
        const { error: insertError } = await supabaseServer
          .from("users")
          .insert({ 
            id: body.userId, 
            email: body.email,
          });
          
        if (insertError) {
          console.error("Failed to insert user into public.users:", insertError);
        } else {
          console.log(`Inserted user ${body.userId} into public.users table`);
        }
      }
    }

    // Try using the database function that has SECURITY DEFINER privileges
    try {
      const { error: functionError } = await supabaseServer.rpc(
        'update_user_wallet',
        { 
          p_user_id: body.userId,
          p_wallet_address: body.walletAddress,
          p_wallet_id: body.crossmintWalletId || null
        }
      );

      if (functionError) {
        console.warn("RPC function call failed:", functionError);
        throw functionError;
      }

      console.log(`Successfully updated wallet for user ${body.userId.slice(0, 8)}`);
      return NextResponse.json({ 
        success: true, 
        updated: true,
        method: "rpc_function",
        message: "User wallet information updated successfully" 
      });
    } catch (funcError) {
      // If the function call fails, fall back to direct update with service role
      console.log("Falling back to direct update with service role...");
      
      const { error: updateError } = await supabaseServer
        .from("users")
        .update({ 
          wallet_address: body.walletAddress,
          crossmint_wallet_id: body.crossmintWalletId || null
        })
        .eq("id", body.userId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`Successfully updated wallet for user ${body.userId.slice(0, 8)} via direct update`);
      return NextResponse.json({ 
        success: true, 
        updated: true,
        method: "direct_update",
        message: "User wallet information updated successfully" 
      });
    }
  } catch (err: any) {
    console.error("Failed to update user wallet:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || String(err) 
    }, { status: 500 });
  }
}
