// Supabase Edge Function — verifies a Stripe Checkout Session is paid
// Deploy: supabase functions deploy verify-stripe-session
//
// Required env var:
//   STRIPE_SECRET_KEY=sk_live_...

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json() as { sessionId: string };
    if (!sessionId?.startsWith('cs_')) {
      return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return new Response(JSON.stringify({
      paid: session.payment_status === 'paid',
      amountTotal: session.amount_total,
      type: session.metadata?.type ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
