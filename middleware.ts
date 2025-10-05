import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function disables certificate verification in development
// WARNING: This is only for development, DO NOT use in production
export function setupNodeEnvForDevelopment() {
  if (process.env.NODE_ENV === 'development') {
    // Disable strict SSL only in development
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn(
      '⚠️ SSL certificate verification disabled for development. DO NOT use in production!'
    );
  }
}

// This middleware runs on every request
export function middleware(request: NextRequest) {
  // Call the setup function on every request to ensure it's set
  setupNodeEnvForDevelopment();
  return NextResponse.next();
}
