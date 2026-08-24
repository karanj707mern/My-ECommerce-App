import { component$ } from "@builder.io/qwik";
import { formatMediumDateTime, formatRupees } from "../../lib/formatters";
import {
  statusDotTone,
  formatShippingType,
  formatPaymentMethod,
} from "../../lib/orders";

export interface OrderDetailsProps {
  order: Record<string, unknown>;
}

export const OrderDetails = component$<OrderDetailsProps>(({ order }) => {
  const items = (order.items as Record<string, unknown>[]) || [];
  return (
    <div class="mt-6 space-y-3 border-t border-[var(--border-color)] pt-5">
      {items.map((item) => (
        <div
          key={String(item.id)}
          class="flex flex-wrap items-start justify-between gap-3 text-sm text-[var(--text-secondary)]"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium text-[var(--text-primary)]">
              {(item.product as Record<string, unknown>)?.name as string}
            </p>
            <p>
              Qty {String(item.quantity)} x{" "}
              {formatRupees(item.price as number)}
            </p>
          </div>
          <p class="font-medium text-[var(--text-primary)] sm:text-right">
            {formatRupees(
              Number(item.price ?? 0) * Number(item.quantity ?? 0),
            )}
          </p>
        </div>
      ))}
    </div>
  );
});

export const OrderBreakdown = component$<OrderDetailsProps>(({ order }) => {
  return (
    <div class="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
      <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Order breakdown
      </p>
      <div class="mt-3 space-y-2">
        <div class="flex items-center justify-between">
          <span>Payment method</span>
          <span class="font-medium text-[var(--text-primary)]">
            {formatPaymentMethod(order)}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span>Shipping method</span>
          <span class="font-medium text-[var(--text-primary)]">
            {formatShippingType(order.shippingType as string)}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatRupees(order.subtotal as number)}</span>
        </div>
        {Number(order.discountAmount) > 0 ? (
          <div class="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span>Promo discount</span>
            <span>-{formatRupees(order.discountAmount as number)}</span>
          </div>
        ) : null}
        <div class="flex items-center justify-between">
          <span>Shipping</span>
          <span>{formatRupees(order.shippingAmount as number)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Handling</span>
          <span>{formatRupees(order.handlingAmount as number)}</span>
        </div>
        {Number(order.codAmount) > 0 ? (
          <div class="flex items-center justify-between">
            <span>Cash on delivery fee</span>
            <span>{formatRupees(order.codAmount as number)}</span>
          </div>
        ) : null}
        <div class="flex items-center justify-between">
          <span>Tax</span>
          <span>{formatRupees(order.taxAmount as number)}</span>
        </div>
        {order.appliedPromoCode ? (
          <div class="flex items-center justify-between">
            <span>Promo code</span>
            <span>{order.appliedPromoCode as string}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export const TrackingActivity = component$<OrderDetailsProps>(({ order }) => {
  const activities = (order.activities as Record<string, unknown>[]) || [];
  return (
    <div class="mt-6 border-t border-[var(--border-color)] pt-5">
      <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Tracking activity
      </p>
      <div class="mt-4 space-y-4">
        {activities.map((activity, index) => (
          <div key={String(activity.id)} class="flex gap-4">
            <div class="flex flex-col items-center">
              <div
                class={`h-3.5 w-3.5 rounded-full ${statusDotTone(activity.status as string)}`}
              />
              {index < activities.length - 1 ? (
                <div class="mt-1 h-full w-px bg-[var(--bg-muted)]" />
              ) : null}
            </div>
            <div class="pb-2">
              <p class="text-sm font-medium text-[var(--text-primary)]">
                {activity.title as string}
              </p>
              <p class="mt-1 text-sm text-[var(--text-muted)]">
                {formatMediumDateTime(activity.createdAt as string)}
              </p>
              {activity.detail ? (
                <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {activity.detail as string}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const OrderDeliveryDetails = component$<OrderDetailsProps>(
  ({ order }) => {
    return (
      <div class="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
        <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
          Delivery details
        </p>
        {order.courierName ? (
          <p class="mt-3">Courier: {order.courierName as string}</p>
        ) : null}
        {order.trackingNumber ? (
          <p class="mt-2">Tracking number: {order.trackingNumber as string}</p>
        ) : null}
        {order.estimatedDeliveryAt ? (
          <p class="mt-2">
            Estimated delivery:{" "}
            {formatMediumDateTime(order.estimatedDeliveryAt as string)}
          </p>
        ) : null}
        {order.adminNotes ? (
          <p class="mt-2">
            <span class="font-semibold text-[var(--text-primary)]">
              Admin note:
            </span>{" "}
            {order.adminNotes as string}
          </p>
        ) : null}
      </div>
    );
  },
);

export const OrderShippingAddress = component$<OrderDetailsProps>(
  ({ order }) => {
    return (
      <div class="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
        <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
          Shipping address
        </p>
        {order.recipientName ? (
          <p class="mt-3">{order.recipientName as string}</p>
        ) : null}
        {order.phoneNumber ? (
          <p class="mt-1">{order.phoneNumber as string}</p>
        ) : null}
        {order.addressLine1 ? (
          <p class="mt-1">{order.addressLine1 as string}</p>
        ) : null}
        {order.addressLine2 ? (
          <p class="mt-1">{order.addressLine2 as string}</p>
        ) : null}
        <p class="mt-1">
          {[order.city, order.state, order.postalCode, order.country]
            .filter(Boolean)
            .join(", ")}
        </p>
      </div>
    );
  },
);
