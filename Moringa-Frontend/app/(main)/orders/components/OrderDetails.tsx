"use client";

import { formatMediumDateTime, formatRupees } from "@/lib/formatters";
import {
  statusDotTone,
  formatShippingType,
  formatPaymentMethod,
} from "../lib/orders";
import type { Order } from "../hooks/useOrdersLogic";

export interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  return (
    <div className="mt-6 space-y-3 border-t border-[var(--border-color)] pt-5">
      {(order.items as Record<string, unknown>[]).map((item) => (
        <div
          key={item.id as string | number}
          className="flex flex-wrap items-start justify-between gap-3 text-sm text-[var(--text-secondary)]"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--text-primary)]">
              {(item.product as Record<string, unknown>)?.name as string}
            </p>
            <p>
              Qty {item.quantity as number} x{" "}
              {formatRupees(item.price as number)}
            </p>
          </div>
          <p className="font-medium text-[var(--text-primary)] sm:text-right">
            {formatRupees(
              Number(item.price as number) * (item.quantity as number),
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

export function OrderBreakdown({ order }: OrderDetailsProps) {
  return (
    <div className="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
      <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Order breakdown
      </p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span>Payment method</span>
          <span className="font-medium text-[var(--text-primary)]">
            {formatPaymentMethod(order as unknown as Record<string, unknown>)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Shipping method</span>
          <span className="font-medium text-[var(--text-primary)]">
            {formatShippingType(order.shippingType as string)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatRupees(order.subtotal as number)}</span>
        </div>
        {Number(order.discountAmount) > 0 ? (
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span>Promo discount</span>
            <span>-{formatRupees(order.discountAmount as number)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span>{formatRupees(order.shippingAmount as number)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Handling</span>
          <span>{formatRupees(order.handlingAmount as number)}</span>
        </div>
        {Number(order.codAmount) > 0 ? (
          <div className="flex items-center justify-between">
            <span>Cash on delivery fee</span>
            <span>{formatRupees(order.codAmount as number)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>Tax</span>
          <span>{formatRupees(order.taxAmount as number)}</span>
        </div>
        {order.appliedPromoCode ? (
          <div className="flex items-center justify-between">
            <span>Promo code</span>
            <span>{order.appliedPromoCode as string}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TrackingActivity({ order }: OrderDetailsProps) {
  return (
    <div className="mt-6 border-t border-[var(--border-color)] pt-5">
      <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Tracking activity
      </p>
      <div className="mt-4 space-y-4">
        {(order.activities as Record<string, unknown>[]).map(
          (activity, index) => (
            <div key={activity.id as string | number} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`h-3.5 w-3.5 rounded-full ${statusDotTone(activity.status as string)}`}
                />
                {index <
                (order.activities as Record<string, unknown>[]).length - 1 ? (
                  <div className="mt-1 h-full w-px bg-[var(--bg-muted)]" />
                ) : null}
              </div>
              <div className="pb-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {activity.title as string}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {formatMediumDateTime(activity.createdAt as string)}
                </p>
                {activity.detail ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {activity.detail as string}
                  </p>
                ) : null}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function OrderDeliveryDetails({ order }: OrderDetailsProps) {
  return (
    <div className="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
      <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Delivery details
      </p>
      {order.courierName ? (
        <p className="mt-3">Courier: {order.courierName as string}</p>
      ) : null}
      {order.trackingNumber ? (
        <p className="mt-2">
          Tracking number: {order.trackingNumber as string}
        </p>
      ) : null}
      {order.estimatedDeliveryAt ? (
        <p className="mt-2">
          Estimated delivery:{" "}
          {formatMediumDateTime(order.estimatedDeliveryAt as string)}
        </p>
      ) : null}
      {order.adminNotes ? (
        <p className="mt-2">
          <span className="font-semibold text-[var(--text-primary)]">
            Admin note:
          </span>{" "}
          {order.adminNotes as string}
        </p>
      ) : null}
    </div>
  );
}

export function OrderShippingAddress({ order }: OrderDetailsProps) {
  return (
    <div className="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
      <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Shipping address
      </p>
      {order.recipientName ? (
        <p className="mt-3">{order.recipientName as string}</p>
      ) : null}
      {order.phoneNumber ? (
        <p className="mt-1">{order.phoneNumber as string}</p>
      ) : null}
      {order.addressLine1 ? (
        <p className="mt-1">{order.addressLine1 as string}</p>
      ) : null}
      {order.addressLine2 ? (
        <p className="mt-1">{order.addressLine2 as string}</p>
      ) : null}
      <p className="mt-1">
        {[order.city, order.state, order.postalCode, order.country]
          .filter(Boolean)
          .join(", ")}
      </p>
    </div>
  );
}
