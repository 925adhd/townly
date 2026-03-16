// Supabase Edge Function — handles Stripe webhook events
// Deploy: supabase functions deploy stripe-webhook
//
// Required env vars:
//   STRIPE_SECRET_KEY=sk_live_...
//   STRIPE_WEBHOOK_SECRET=whsec_...  (from Stripe Dashboard → Webhooks)
//
// Stripe event to subscribe to: checkout.session.completed

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  // Verify the event came from Stripe — rejects forged or replayed webhooks
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only process sessions that are actually paid
    if (session.payment_status !== 'paid') {
      return new Response('OK', { status: 200 });
    }

    // Require tenantId from session metadata — set at checkout creation time.
    // This scopes the DB update to the correct county and prevents cross-tenant
    // payment status manipulation even if a session ID were ever guessed.
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) {
      console.error('Webhook received session without tenantId in metadata:', session.id);
      // Do not return 500 (would cause Stripe to retry indefinitely for old sessions).
      return new Response('OK', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Flip the booking from pending → paid, scoped to the correct tenant.
    const { error } = await supabase
      .from('paid_submissions')
      .update({ payment_status: 'paid' })
      .eq('stripe_session_id', session.id)
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'pending');

    if (error) {
      console.error('Failed to update payment_status:', error.message);
      // Return 500 so Stripe retries the webhook
      return new Response('DB update failed', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
});
