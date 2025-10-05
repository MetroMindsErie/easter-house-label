import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check environment variables
    const envChecks = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      MOCK_MINT_ENABLED: process.env.CROSSMINT_MOCK_MINT === "true",
      NODE_TLS_REJECT: process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ? "disabled" : "enabled",
      // Don't expose actual API keys, just check if they exist
      HAS_CROSSMINT_API_KEY: !!process.env.NEXT_PUBLIC_CROSSMINT_API_KEY,
      HAS_CROSSMINT_CLIENT_KEY: !!process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_KEY,
    };

    // Test a fetch to Crossmint API (just a HEAD request to check connection)
    type CrossmintApiCheck = {
      success: boolean;
      error?: string | null;
      code?: string | null;
      status?: number;
      statusText?: string;
    };

    let crossmintApiCheck: CrossmintApiCheck = { success: false, error: null };
    try {
      const resp = await fetch('https://api.crossmint.com/health', { 
        method: 'HEAD',
        // Short timeout to not block response
        signal: AbortSignal.timeout(5000) 
      });
      crossmintApiCheck = { 
        success: resp.ok, 
        status: resp.status,
        statusText: resp.statusText
      };
    } catch (err: any) {
      crossmintApiCheck = { 
        success: false, 
        error: err.message || String(err),
        code: err?.cause?.code || null
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envChecks,
      crossmintApiCheck,
      nodeVersion: process.version,
      note: "This endpoint helps diagnose environment configuration issues"
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
