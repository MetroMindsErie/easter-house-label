"use client";

import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { BuyNow } from "@/components/BuyNow";
import { useEffect, useRef, useState } from "react";

// Global session storage key
const MINT_SESSION_STORAGE_KEY = "crossmint_mint_wallet_synced";

export default function MintPage() {
  const { status: authStatus, user } = useAuth();
  const { wallet } = useWallet();
  const [walletSynced, setWalletSynced] = useState(false);
  const syncAttemptMade = useRef(false);

  // Check if we've already synced this session
  useEffect(() => {
    const userId = (user as any)?.id;
    const walletAddress = wallet?.address;

    if (typeof window !== "undefined" && userId && walletAddress) {
      const key = `${MINT_SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
      const alreadySynced = sessionStorage.getItem(key);
      if (alreadySynced === "true") {
        setWalletSynced(true);
      }
    }
  }, [(user as any)?.id, wallet?.address]);

  // Sync user/wallet once per session
  useEffect(() => {
    // Skip if already synced, already attempted, or missing data
    if (walletSynced || syncAttemptMade.current || authStatus !== "logged-in") {
      return;
    }

    const userId = (user as any)?.id;
    const email = (user as any)?.email;
    const walletAddress = wallet?.address;

    if (!userId || !email || !walletAddress) {
      return;
    }

    // Mark that we've attempted sync
    syncAttemptMade.current = true;

    const syncUserData = async () => {
      console.log("Mint: Starting user sync...");
      try {
        // Call auth-sync endpoint
        const response = await fetch("/api/auth-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            email,
            walletAddress,
            crossmintWalletId: walletAddress,
          }),
        });

        const result = await response.json();
        console.log("Mint: Auth sync result:", result);

        if (response.ok && result.success) {
          // Mark as synced in session storage
          if (typeof window !== "undefined") {
            const key = `${MINT_SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
            sessionStorage.setItem(key, "true");
            setWalletSynced(true);
          }
        }
      } catch (error) {
        console.error("Mint: Error syncing user data:", error);
      }
    };

    // Delay execution
    const timeout = setTimeout(syncUserData, 1000);
    return () => clearTimeout(timeout);
  }, [authStatus, user, wallet, walletSynced]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mint a Music NFT</h1>
      <p className="mb-4 text-sm text-gray-600">
        Purchase exclusive music NFTs. Make sure you are signed in and have
        created/opened your Crossmint wallet so a wallet address is available to
        receive the NFT.
      </p>

      {authStatus !== "logged-in" && (
        <div className="mb-4 p-3 bg-yellow-50 border rounded">
          Please sign in with Crossmint (Google or Email) before purchasing.
          After signing in, open the Crossmint Wallet modal to create or attach
          your wallet.
        </div>
      )}

      <BuyNow />
    </div>
  );
}
