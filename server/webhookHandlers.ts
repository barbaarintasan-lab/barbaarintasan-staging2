import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { sendPurchaseConfirmationEmail } from './email';
import { activateGold } from './ai/access-guard';
import Stripe from 'stripe';

async function getWebhookSecret(): Promise<string> {
  // Check for environment variable
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret) {
    console.log('[STRIPE WEBHOOK] Using STRIPE_WEBHOOK_SECRET from environment (length:', secret.length, ')');
    return secret;
  }
  
  console.warn('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not set - will process without verification');
  return '';
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = await getWebhookSecret();
    
    let event: Stripe.Event;
    
    console.log('[STRIPE WEBHOOK] Webhook secret available:', webhookSecret ? 'YES (length: ' + webhookSecret.length + ')' : 'NO');
    console.log('[STRIPE WEBHOOK] Signature header:', signature.substring(0, 50) + '...');
    
    if (!webhookSecret) {
      console.error('[STRIPE WEBHOOK] No webhook secret configured - rejecting webhook');
      throw new Error('Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET environment variable.');
    }

    try {
      console.log('[STRIPE WEBHOOK] Verifying signature with secret...');
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      console.log('[STRIPE WEBHOOK] Signature verified successfully!');
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed: ' + err.message);
    }

    console.log(`[STRIPE WEBHOOK] Received event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      try {
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        console.log('[STRIPE WEBHOOK] handleCheckoutCompleted finished successfully');
      } catch (checkoutError: any) {
        console.error('[STRIPE WEBHOOK] handleCheckoutCompleted failed:', checkoutError.message);
        console.error('[STRIPE WEBHOOK] Stack:', checkoutError.stack);
        // Don't throw - we want to return 200 to Stripe to prevent retries
      }
    }

    // Skip Stripe sync processing to avoid secondary signature verification failure
    console.log('[STRIPE WEBHOOK] Skipping sync.processWebhook (not needed for checkout)');
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('[STRIPE WEBHOOK] ====== PROCESSING CHECKOUT SESSION ======');
    console.log('[STRIPE WEBHOOK] Session ID:', session.id);
    console.log('[STRIPE WEBHOOK] Customer email from session:', session.customer_email);
    console.log('[STRIPE WEBHOOK] Customer details:', JSON.stringify(session.customer_details, null, 2));
    console.log('[STRIPE WEBHOOK] Amount total:', session.amount_total);
    console.log('[STRIPE WEBHOOK] Currency:', session.currency);
    console.log('[STRIPE WEBHOOK] Mode:', session.mode);
    console.log('[STRIPE WEBHOOK] Payment status:', session.payment_status);

    const customerEmail = session.customer_email || session.customer_details?.email;
    if (!customerEmail) {
      console.error('[STRIPE WEBHOOK] No customer email found in session');
      return;
    }

    const parent = await storage.getParentByEmail(customerEmail);
    if (!parent) {
      console.error(`[STRIPE WEBHOOK] No parent found with email: ${customerEmail}`);
      return;
    }

    const amountPaid = (session.amount_total || 0) / 100;
    console.log(`[STRIPE WEBHOOK] Amount paid: $${amountPaid}`);

    if (session.metadata?.type === "ai_gold_membership") {
      console.log(`[STRIPE WEBHOOK] Processing AI Gold Membership for parent ${parent.id}`);
      await activateGold(parent.id);
      console.log(`[STRIPE WEBHOOK] AI Gold Membership activated for parent ${parent.id}`);

      if (session.customer) {
        await storage.updateParent(parent.id, {
          stripeCustomerId: session.customer as string,
        });
      }

      try {
        await sendPurchaseConfirmationEmail(
          customerEmail,
          parent.name || 'Macmiil',
          'Xubinimada Dahabiga ah — AI Caawiye',
          'yearly',
          amountPaid,
          'ai-gold'
        );
      } catch (emailError) {
        console.error('[STRIPE WEBHOOK] Failed to send Gold confirmation email:', emailError);
      }
      return;
    }

    // Ignore test payments (under $20)
    if (amountPaid < 20) {
      console.log(`[STRIPE WEBHOOK] Ignoring test payment of $${amountPaid} - no access granted`);
      return;
    }

    let planType: 'monthly' | 'yearly' | 'one-time';
    let accessEnd: Date | null = null;
    const now = new Date();

    if (amountPaid >= 110 && amountPaid <= 120) {
      planType = 'yearly';
      accessEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else if (amountPaid >= 25 && amountPaid <= 35) {
      planType = 'monthly';
      accessEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (amountPaid >= 95 && amountPaid <= 105) {
      planType = 'one-time';
      accessEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months
    } else {
      console.warn(`[STRIPE WEBHOOK] Unknown payment amount: $${amountPaid} - ignoring (no plan matches)`);
      return;
    }

    const allAccessCourse = await storage.getCourseByCourseId("all-access");
    if (!allAccessCourse) {
      console.error('[STRIPE WEBHOOK] No all-access course found');
      return;
    }

    const existingEnrollments = await storage.getEnrollmentsByParentId(parent.id);
    const existingEnrollment = existingEnrollments.find(
      e => e.courseId === allAccessCourse.id && e.status === 'active'
    );
    
    if (existingEnrollment) {
      console.log(`[STRIPE WEBHOOK] Renewing existing enrollment for parent ${parent.id}`);
      const newAccessEnd = accessEnd 
        ? new Date(Math.max(
            existingEnrollment.accessEnd?.getTime() || now.getTime(),
            accessEnd.getTime()
          ))
        : null;
      
      await storage.renewEnrollment(existingEnrollment.id, planType, newAccessEnd);
    } else {
      console.log(`[STRIPE WEBHOOK] Creating new enrollment for parent ${parent.id}`);
      await storage.createEnrollment({
        parentId: parent.id,
        courseId: allAccessCourse.id,
        planType,
        accessEnd,
        amountPaid: amountPaid.toString(),
        status: 'active'
      });
    }

    if (session.subscription) {
      await storage.updateParent(parent.id, {
        stripeSubscriptionId: session.subscription as string
      });
    }

    if (session.customer) {
      await storage.updateParent(parent.id, {
        stripeCustomerId: session.customer as string
      });
    }

    console.log(`[STRIPE WEBHOOK] Successfully granted ${planType} access to parent ${parent.id}`);

    // Create payment submission record for admin visibility
    try {
      await storage.createPaymentSubmission({
        courseId: allAccessCourse.id,
        customerName: parent.name || customerEmail,
        customerPhone: parent.phone || 'Stripe',
        customerEmail: customerEmail,
        paymentMethodId: null, // No manual payment method for Stripe
        planType: planType === 'one-time' ? 'onetime' : planType,
        amount: Math.round(amountPaid),
        referenceCode: session.id,
        status: 'approved', // Auto-approved since payment was successful
        notes: `Auto-approved Stripe payment - Session: ${session.id}`,
        paymentSource: 'stripe',
        stripeSessionId: session.id,
      });
      console.log(`[STRIPE WEBHOOK] Payment submission record created for admin visibility`);
    } catch (paymentError) {
      console.error('[STRIPE WEBHOOK] Failed to create payment submission record:', paymentError);
    }

    try {
      await sendPurchaseConfirmationEmail(
        customerEmail,
        parent.name || 'Macmiil',
        'Dhammaan Koorsayaasha (All-Access)',
        planType,
        amountPaid,
        'all-access'
      );
      console.log(`[STRIPE WEBHOOK] Confirmation email sent to ${customerEmail}`);
    } catch (emailError) {
      console.error('[STRIPE WEBHOOK] Failed to send confirmation email:', emailError);
    }
  }
}
