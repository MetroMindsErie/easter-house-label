"use client";

import { useRef, useEffect, useState } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { LandingPage } from "@/components/landing-page";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { Dashboard } from "@/components/dashboard";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

// Global session storage keys
const HOME_SESSION_STORAGE_KEY = "crossmint_home_wallet_synced";
const MINT_TRANSITION_KEY = "easter_house_mint_in_progress";

export default function Home() {
  const { wallet, status: walletStatus } = useWallet();
  const { status: authStatus, user } = useAuth();
  const nodeRef = useRef(null);
  const [walletSynced, setWalletSynced] = useState(false);
  const syncAttemptMade = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPostMintLoading, setIsPostMintLoading] = useState(false);

  // Check if we're redirecting from a successful mint
  const fromMint = searchParams.get('from') === 'mint';
  const mintSuccess = searchParams.get('success') === 'true';

  // Check mint transition state on first render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we're in the middle of a mint transition
      const mintInProgress = sessionStorage.getItem(MINT_TRANSITION_KEY);
      if (mintInProgress === 'true') {
        setIsPostMintLoading(true);
      }
    }
  }, []);

  const isLoggedIn = wallet != null && authStatus === "logged-in";
  const isLoading =
    walletStatus === "in-progress" || 
    authStatus === "initializing" || 
    isPostMintLoading;

  // Handle redirect from mint page with loading state
  useEffect(() => {
    if (fromMint && mintSuccess) {
      // Set the transition state in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(MINT_TRANSITION_KEY, 'true');
      }
      setIsPostMintLoading(true);
      
      // Simulate loading time to refresh data after mint
      const loadingTimer = setTimeout(() => {
        setIsPostMintLoading(false);
        // Clean up URL parameters and transition state after loading
        router.replace('/');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(MINT_TRANSITION_KEY);
        }
      }, 2500); // Slightly longer loading time to ensure data is ready
      
      return () => clearTimeout(loadingTimer);
    }
  }, [fromMint, mintSuccess, router]);

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

  // Navigation to mint page with transition state
  const handleMintClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only if not already loading
    if (!isPostMintLoading) {
      // Set loading state before navigation
      setIsPostMintLoading(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(MINT_TRANSITION_KEY, 'true');
      }
      router.push('/mint');
    } else {
      e.preventDefault();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Enhanced navigation with prominent mint button and proper logo */}
      <nav className="p-4 border-b border-indigo-100 bg-white shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 relative overflow-hidden">
            <Image
              src="/easter-house-logo.png"
              alt="Easter House Music Group"
              fill
              style={{
                objectFit: 'contain',
              }}
              className="rounded-full"
            />
          </div>
          <span className="text-indigo-900 font-medium">
            Easter House Music Group
          </span>
        </div>
        <div className={`transition-opacity duration-300 ${isPostMintLoading ? 'opacity-50' : 'opacity-100'}`}>
          {isPostMintLoading ? (
            <div className="text-indigo-600 flex items-center gap-2 px-6 py-3">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Updating Collection...</span>
            </div>
          ) : (
            <Link
              href="/mint"
              onClick={handleMintClick}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105 hover:translate-y-[-2px]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
              </svg>
              Mint Exclusive Music NFT
            </Link>
          )}
        </div>
      </nav>

      <main className="flex-1 bg-white">
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
                <Dashboard isLoading={isPostMintLoading} />
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
