// Supabase Edge Function — creates a Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout-session
//
// Required env var in Supabase Dashboard → Settings → Edge Functions:
//   STRIPE_SECRET_KEY=sk_live_...   (or sk_test_... for testing)

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Restrict CORS to your own domain so arbitrary sites can't trigger checkouts.
// Add 'http://localhost:5173' here only while doing local dev if needed.
const ALLOWED_ORIGINS = ['https://townly.us', 'https://www.townly.us'];

// Whitelist of valid tenant IDs — must match the TENANTS object in tenants.ts.
// Add new counties here when launching.
const VALID_TENANT_IDS = new Set(['grayson']);

function corsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/** Validate that a URL belongs to our own origin — prevents open-redirect phishing. */
function isAllowedRedirectUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return ALLOWED_ORIGINS.includes(u.origin);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const { type, successUrl, cancelUrl, tenantId } = await req.json() as {
      type: 'spotlight' | 'featured';
      successUrl: string;
      cancelUrl: string;
      tenantId: string;
    };

    // Validate tenantId — prevents arbitrary strings from being stored in Stripe metadata.
    if (!tenantId || !VALID_TENANT_IDS.has(tenantId)) {
      return new Response(JSON.stringify({ error: 'Invalid tenant.' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Validate redirect URLs — must point back to our own domain.
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid redirect URL.' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Check member status server-side — cannot be spoofed by client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: memberProvider } = await serviceClient
      .from('providers')
      .select('id')
      .eq('claimed_by', user.id)
      .eq('listing_tier', 'featured')
      .limit(1)
      .maybeSingle();
    const isMember = !!memberProvider;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const regularAmount = type === 'spotlight' ? 2500 : 500;
    const memberAmount  = type === 'spotlight' ? 2000 : 400;
    const amount = isMember ? memberAmount : regularAmount;
    const label = type === 'spotlight'
      ? `Weekly Spotlight Post — Townly (one-time, 1 week)${isMember ? ' · Member Rate' : ''}`
      : `Featured Post — Townly (one-time, 1 week)${isMember ? ' · Member Rate' : ''}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: label },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      payment_intent_data: { receipt_email: user.email },
      metadata: { type, userId: user.id, tenantId },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
});
