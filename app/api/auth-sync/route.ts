import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Track already processed requests with timestamps
const processedRequests = new Map<string, number>();

type CrossmintUserBody = {
  id: string;
  email: string;
  walletAddress?: string;
  crossmintWalletId?: string;
};

export async function POST(request: Request) {
  try {
    const body: CrossmintUserBody = await request.json();
    
    if (!body.id || !body.email) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required user information: id and email" 
      }, { status: 400 });
    }

    // Create a unique request key and check for duplicates
    const requestKey = `${body.id}:${body.walletAddress || 'no-wallet'}`;
    const now = Date.now();
    const lastProcessed = processedRequests.get(requestKey) || 0;
    
    if (now - lastProcessed < 30000) { // 30 seconds
      console.log(`Skipping duplicate auth-sync request for ${body.id.slice(0, 8)}`);
      return NextResponse.json({ 
        success: true, 
        message: "Duplicate request, already processed",
        duplicateRequest: true,
      });
    }
    
    // Mark as processed immediately
    processedRequests.set(requestKey, now);
    
    // Cleanup old entries
    const twoMinutesAgo = now - 120000;
    for (const [key, timestamp] of processedRequests.entries()) {
      if (timestamp < twoMinutesAgo) {
        processedRequests.delete(key);
      }
    }

    // Start with detailed logging
    console.log(`[auth-sync] Processing user ${body.id.slice(0, 8)}, email: ${body.email}`);
    
    // STEP 1: Check if user exists in auth.users
    let authUser;
    try {
      const { data, error } = await supabaseServer.auth.admin.getUserById(body.id);
      if (error) {
        console.log(`[auth-sync] Error getting user by ID: ${error.message}`);
      } else if (data?.user) {
        authUser = data.user;
        console.log(`[auth-sync] Found existing auth user: ${authUser.id}`);
      }
    } catch (err) {
      console.error('[auth-sync] Error checking auth user:', err);
    }
    
    // STEP 2: If user doesn't exist in auth.users, create using admin API
    if (!authUser) {
      console.log(`[auth-sync] User ${body.id} not found in auth, will create...`);
      
      try {
        // Important: We need to manually specify the UUID for consistency
        const createUserResponse = await supabaseServer.auth.admin.createUser({
          email: body.email,
          email_confirm: true,
          user_metadata: { provider: "crossmint" },
          // Critical: For admin.createUser, we need id not uuid
          id: body.id
        });
        
        if (createUserResponse.error) {
          console.error(`[auth-sync] Failed to create auth user:`, createUserResponse.error);
          throw createUserResponse.error;
        } else {
          authUser = createUserResponse.data.user;
          console.log(`[auth-sync] Successfully created auth user with ID: ${authUser?.id}`);
        }
      } catch (createErr) {
        console.error('[auth-sync] Error in createUser:', createErr);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create auth user: ${createErr instanceof Error ? createErr.message : String(createErr)}`
        }, { status: 500 });
      }
    }
    
    // STEP 3: Check if user exists in public.users table
    let publicUser;
    try {
      const { data, error } = await supabaseServer
        .from("users")
        .select("*")
        .eq("id", body.id)
        .maybeSingle();
        
      if (error) {
        console.error('[auth-sync] Error checking public.users:', error);
      } else if (data) {
        publicUser = data;
        console.log(`[auth-sync] Found existing user in public.users table: ${publicUser.id}`);
      } else {
        console.log(`[auth-sync] User ${body.id} not found in public.users table`);
      }
    } catch (err) {
      console.error('[auth-sync] Error querying public.users:', err);
    }
      
    // STEP 4: Insert into public.users if not found
    if (!publicUser) {
      console.log(`[auth-sync] Will insert user ${body.id} into public.users`);
      
      try {
        const { data, error } = await supabaseServer
          .from("users")
          .insert({ 
            id: body.id, 
            email: body.email,
            wallet_address: body.walletAddress || null,
            crossmint_wallet_id: body.crossmintWalletId || null
          })
          .select()
          .single();
          
        if (error) {
          console.error('[auth-sync] Failed to insert into public.users:', error);
          return NextResponse.json({ 
            success: false, 
            error: `Failed to create public user: ${error.message}`
          }, { status: 500 });
        }
        
        publicUser = data;
        console.log(`[auth-sync] Successfully created user in public.users: ${publicUser?.id}`);
      } catch (insertErr) {
        console.error('[auth-sync] Exception during user insertion:', insertErr);
      }
    } 
    
    // STEP 5: Update wallet address if needed
    else if (body.walletAddress && publicUser.wallet_address !== body.walletAddress) {
      console.log(`[auth-sync] Updating wallet address for user ${body.id}`);
      
      try {
        // First try using the custom RPC function that has SECURITY DEFINER permissions
        const { error: rpcError } = await supabaseServer.rpc(
          'update_user_wallet',
          { 
            p_user_id: body.id,
            p_wallet_address: body.walletAddress,
            p_wallet_id: body.crossmintWalletId || null
          }
        );

        if (rpcError) {
          console.warn('[auth-sync] RPC function failed, falling back to direct update:', rpcError);
          
          // Fallback to direct update
          const { error: updateError } = await supabaseServer
            .from("users")
            .update({ 
              wallet_address: body.walletAddress,
              crossmint_wallet_id: body.crossmintWalletId || null
            })
            .eq("id", body.id);
            
          if (updateError) {
            console.error('[auth-sync] Failed to update wallet via direct update:', updateError);
            throw updateError;
          }
        }
        
        console.log(`[auth-sync] Successfully updated wallet for user ${body.id}`);
      } catch (updateErr) {
        console.error('[auth-sync] Exception during wallet update:', updateErr);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to update wallet: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`
        }, { status: 500 });
      }
    }
    
    // STEP 6: Insert/update user_wallets table if wallet address provided
    if (body.walletAddress) {
      console.log(`[auth-sync] Checking user_wallets table for ${body.id}`);
      
      try {
        // Check if wallet already exists for user
        const { data: existingWallet, error: walletCheckError } = await supabaseServer
          .from("user_wallets")
          .select("*")
          .eq("user_id", body.id)
          .eq("wallet_address", body.walletAddress)
          .maybeSingle();
          
        if (walletCheckError) {
          console.error('[auth-sync] Error checking user_wallets:', walletCheckError);
        } else if (!existingWallet) {
          // Insert new wallet record
          console.log(`[auth-sync] Inserting new wallet record for user ${body.id}`);
          
          const { error: walletInsertError } = await supabaseServer
            .from("user_wallets")
            .insert({
              user_id: body.id,
              wallet_address: body.walletAddress,
              is_primary: true,
              wallet_type: "evm" // Adjust as needed based on chain type
            });
            
          if (walletInsertError) {
            console.error('[auth-sync] Failed to insert user wallet:', walletInsertError);
          } else {
            console.log(`[auth-sync] Successfully inserted wallet for user ${body.id}`);
          }
        } else {
          console.log(`[auth-sync] Wallet already exists for user ${body.id}`);
        }
      } catch (walletErr) {
        console.error('[auth-sync] Exception during wallet record handling:', walletErr);
      }
    }

    // Return success
    return NextResponse.json({ 
      success: true, 
      authUser: !!authUser,
      publicUser: !!publicUser,
      message: "User synchronized successfully" 
    });
  } catch (err: any) {
    console.error("[auth-sync] Unhandled error:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || String(err) 
    }, { status: 500 });
  }
}
