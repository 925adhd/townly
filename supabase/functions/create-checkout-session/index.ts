// Supabase Edge Function — creates a Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout-session
//
// Required env var in Supabase Dashboard → Settings → Edge Functions:
//   STRIPE_SECRET_KEY=sk_live_...   (or sk_test_... for testing)

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, successUrl, cancelUrl } = await req.json() as {
      type: 'spotlight' | 'featured';
      successUrl: string;
      cancelUrl: string;
    };

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
      metadata: { type, userId: user.id },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
