"use client";

import { useState } from "react";
import {
  createOrder,
  createCheckoutSession,
  verifyPayment,
} from "@/lib/api/order";
import { useToast } from "@/hooks/useToast";
import { loadRazorpayScript } from "./useCartLogic";

export interface PaymentResult {
  success: boolean;
  error?: string;
}

export function useRazorpayPayment() {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const processCheckout = async (
    orderPayload: Record<string, unknown>,
    currentUser: Record<string, unknown> | null,
    router: {
      push: (url: string) => void;
    },
  ): Promise<PaymentResult> => {
    let session: Record<string, unknown> | null = null;
    let checkoutOpened = false;
    let paymentCompleted = false;

    try {
      setLoading(true);
      if (orderPayload.paymentMethod === "cod") {
        const order = (await createOrder(orderPayload)) as Record<
          string,
          unknown
        >;
        toast.showToast({
          severity: "success",
          summary: "Order placed",
          detail: `${order.orderTitle} placed successfully. Order number ${order.orderNumber}.`,
          life: 4000,
        });
        setTimeout(() => {
          router.push(
            "/orders?orderMessage=" +
              encodeURIComponent(
                `${order.orderTitle} placed successfully. Order number ${order.orderNumber}.`,
              ),
          );
        }, 100);
        return { success: true };
      }

      session = (await createCheckoutSession(orderPayload)) as Record<
        string,
        unknown
      >;

      await loadRazorpayScript();

      if (!session?.key || !session?.razorpayOrderId) {
        throw new Error("Razorpay checkout details were incomplete.");
      }

      const options = {
        key: session.key as string,
        amount: session.amount as number,
        currency: session.currency as string,
        order_id: session.razorpayOrderId as string,
        name: "Moringa Store",
        description: "Secure order payment",
        notes: {
          orderNumber: session.orderNumber,
        },
        handler: async function (response: Record<string, string>) {
          try {
            const checkoutSession = session as Record<string, unknown>;
            await verifyPayment({
              orderId: checkoutSession.orderId as string,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push(
              `/orders?payment=success&orderId=${checkoutSession.orderId as string}&orderNumber=${encodeURIComponent(checkoutSession.orderNumber as string)}`,
            );
            paymentCompleted = true;
          } catch (err) {
            return { success: false, error: (err as Error).message };
          }
        },
        prefill: {
          name:
            (orderPayload.recipientName as string) ||
            (currentUser?.name as string) ||
            "",
          email: currentUser?.email as string,
          contact: orderPayload.phoneNumber as string,
        },
        modal: {
          ondismiss: async () => {
            if (paymentCompleted) {
              return;
            }

            try {
              const { cancelOrder } = await import("@/lib/api/order");
              await cancelOrder(session!.orderId as string | number);
              toast.showToast({
                severity: "warning",
                summary: "Payment cancelled",
                detail: "Payment was cancelled. Your cart is still available.",
                life: 4000,
              });
            } catch (dismissError) {
              return { success: false, error: (dismissError as Error).message };
            }
          },
        },
        theme: {
          color: "#0f5132",
        },
      };

      const RazorpayConstructor = (
        window as unknown as {
          Razorpay: new (options: unknown) => {
            on: (
              event: string,
              handler: (response: Record<string, unknown>) => void,
            ) => void;
            open: () => void;
          };
        }
      ).Razorpay;
      const rzp = new RazorpayConstructor(options);
      rzp.on("payment.failed", async (response: Record<string, unknown>) => {
        const failureDescription =
          (response?.error as Record<string, string>)?.description ||
          (response?.error as Record<string, string>)?.reason ||
          "Payment failed before it could be completed.";

        try {
          if ((session as Record<string, unknown> | null)?.orderId) {
            const { cancelOrder } = await import("@/lib/api/order");
            await cancelOrder(
              (session as Record<string, unknown>).orderId as string | number,
            );
          }
        } catch {
          // Ignore cleanup failures
        }

        return { success: false, error: failureDescription };
      });
      checkoutOpened = true;
      rzp.open();
      return { success: true };
    } catch (err) {
      if (session?.orderId && !checkoutOpened) {
        try {
          const { cancelOrder } = await import("@/lib/api/order");
          await cancelOrder(session.orderId as string | number);
        } catch {
          // Ignore cleanup failures
        }
      }
      if ((err as Error & { status: number }).status === 401) {
        return { success: false, error: "UNAUTHORIZED" };
      }
      return {
        success: false,
        error: (err as Error).message || "Could not place your order.",
      };
    } finally {
      setLoading(false);
    }
  };

  return { processCheckout, loading };
}
