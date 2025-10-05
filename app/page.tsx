"use client";

import { useRef, useEffect, useState } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { LandingPage } from "@/components/landing-page";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { Dashboard } from "@/components/dashboard";
import Link from "next/link";

// Global session storage key
const HOME_SESSION_STORAGE_KEY = "crossmint_home_wallet_synced";

export default function Home() {
  const { wallet, status: walletStatus } = useWallet();
  const { status: authStatus, user } = useAuth();
  const nodeRef = useRef(null);
  const [walletSynced, setWalletSynced] = useState(false);
  const syncAttemptMade = useRef(false);

  const isLoggedIn = wallet != null && authStatus === "logged-in";
  const isLoading =
    walletStatus === "in-progress" || authStatus === "initializing";

  // Check if we've already synced this session
  useEffect(() => {
    const userId = (user as any)?.id;
    const walletAddress = wallet?.address;

    if (typeof window !== "undefined" && userId && walletAddress) {
      const key = `${HOME_SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
      const alreadySynced = sessionStorage.getItem(key);
      if (alreadySynced === "true") {
        console.log("Home: Wallet already synced this session");
        setWalletSynced(true);
      }
    }
  }, [(user as any)?.id, wallet?.address]);

  // Sync user/wallet info only once per session
  useEffect(() => {
    // Skip if not logged in, already synced, or already attempted
    if (!isLoggedIn || walletSynced || syncAttemptMade.current) {
      return;
    }

    // Get user details
    const userId = (user as any)?.id;
    const email = (user as any)?.email;
    const walletAddress = wallet?.address;

    if (!userId || !email || !walletAddress) {
      return;
    }

    // Mark that we've attempted sync
    syncAttemptMade.current = true;

    const syncUserData = async () => {
      console.log("Home: Starting user sync...");
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
        console.log("Home: Auth sync result:", result);

        if (response.ok && result.success) {
          // Mark as synced in session storage
          if (typeof window !== "undefined") {
            const key = `${HOME_SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
            sessionStorage.setItem(key, "true");
            setWalletSynced(true);
          }
        }
      } catch (error) {
        console.error("Home: Error syncing user data:", error);
      }
    };

    // Delay execution to avoid immediate API call
    const timeout = setTimeout(syncUserData, 1500);
    return () => clearTimeout(timeout);
  }, [isLoggedIn, user, wallet, walletSynced]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* small nav so users can find the mint page */}
      <nav className="p-4 border-b">
        <Link href="/mint" className="text-sm font-medium">
          Mint Music NFT
        </Link>
      </nav>

      <main className="flex-1">
        <SwitchTransition mode="out-in">
          <CSSTransition
            key={isLoggedIn ? "dashboard" : "landing"}
            nodeRef={nodeRef}
            timeout={400}
            classNames="page-transition"
            unmountOnExit
          >
            <div ref={nodeRef}>
              {isLoggedIn ? (
                <Dashboard />
              ) : (
                <LandingPage isLoading={isLoading} />
              )}
            </div>
          </CSSTransition>
        </SwitchTransition>
      </main>
    </div>
  );
}
