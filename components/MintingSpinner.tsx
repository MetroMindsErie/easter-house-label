"use client";

import React, { useEffect } from "react";
import styles from "@/styles/MintingSpinner.module.css";

interface MintingSpinnerProps {
  isVisible: boolean;
}

export function MintingSpinner({ isVisible }: MintingSpinnerProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <div className={styles.blockchainSpinner}>
          <div className={styles.node}></div>
          <div className={`${styles.node} ${styles.node2}`}></div>
          <div className={`${styles.node} ${styles.node3}`}></div>
          <div className={`${styles.node} ${styles.node4}`}></div>
          <div className={`${styles.node} ${styles.node5}`}></div>
          <div className={`${styles.node} ${styles.node6}`}></div>
          <div className={styles.hexagon}></div>
        </div>
        <p className="text-white text-xl font-medium mt-8 animate-pulse">
          Minting your NFT...
        </p>
        <p className="text-gray-300 mt-2">
          This may take up to a minute
        </p>
      </div>
    </div>
  );
}
