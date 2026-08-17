import { OrderStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type LegacyOrder = Awaited<ReturnType<typeof prisma.order.findFirstOrThrow>>;

function inferOrderStatus(order: {
  status: OrderStatus;
  paidAt: Date | null;
  shippedAt: Date | null;
  outForDeliveryAt: Date | null;
  deliveredAt: Date | null;
}) {
  if (order.status === OrderStatus.CANCELLED) {
    return OrderStatus.CANCELLED;
  }

  if (order.deliveredAt) {
    return OrderStatus.DELIVERED;
  }

  if (order.outForDeliveryAt) {
    return OrderStatus.OUT_FOR_DELIVERY;
  }

  if (order.shippedAt) {
    return OrderStatus.SHIPPED;
  }

  if (order.paidAt) {
    return OrderStatus.PAID;
  }

  return order.status;
}

function getStatusActivityTitle(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PAID:
      return 'Payment confirmed';
    case OrderStatus.SHIPPED:
      return 'Order shipped';
    case OrderStatus.OUT_FOR_DELIVERY:
      return 'Out for delivery';
    case OrderStatus.DELIVERED:
      return 'Delivered';
    case OrderStatus.CANCELLED:
      return 'Order cancelled';
    default:
      return 'Order placed';
  }
}

function buildMissingActivities(
  order: LegacyOrder & {
    items: Array<{ price: number; quantity: number }>;
    activities: Array<{
      status: OrderStatus;
      createdAt: Date;
    }>;
  },
) {
  const seenStatuses = new Set(
    order.activities.map((activity) => activity.status),
  );
  const activityCreates: Array<{
    status: OrderStatus;
    title: string;
    detail: string;
    createdAt: Date;
  }> = [];

  const maybeAdd = (
    status: OrderStatus,
    createdAt: Date | null | undefined,
    detail: string,
  ) => {
    if (!createdAt || seenStatuses.has(status)) {
      return;
    }

    activityCreates.push({
      status,
      title: getStatusActivityTitle(status),
      detail,
      createdAt,
    });
    seenStatuses.add(status);
  };

  maybeAdd(
    OrderStatus.PENDING,
    order.createdAt,
    'Order received and queued for processing.',
  );
  maybeAdd(
    OrderStatus.PAID,
    order.paidAt,
    'Payment was confirmed for this order.',
  );
  maybeAdd(OrderStatus.SHIPPED, order.shippedAt, 'The order was shipped.');
  maybeAdd(
    OrderStatus.OUT_FOR_DELIVERY,
    order.outForDeliveryAt,
    'The order is out for delivery.',
  );
  maybeAdd(
    OrderStatus.DELIVERED,
    order.deliveredAt,
    'The order was delivered successfully.',
  );

  if (
    order.status === OrderStatus.CANCELLED &&
    !seenStatuses.has(OrderStatus.CANCELLED)
  ) {
    activityCreates.push({
      status: OrderStatus.CANCELLED,
      title: getStatusActivityTitle(OrderStatus.CANCELLED),
      detail: 'The order was cancelled.',
      createdAt:
        order.activities[order.activities.length - 1]?.createdAt ??
        order.createdAt,
    });
  }

  return activityCreates;
}

function computeOrderPatch(
  order: LegacyOrder & {
    items: Array<{ price: number; quantity: number }>;
    activities: Array<{
      status: OrderStatus;
      createdAt: Date;
    }>;
  },
) {
  const nextStatus = inferOrderStatus(order);
  const computedSubtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const data: Record<string, unknown> = {};

  if (order.status !== nextStatus) {
    data.status = nextStatus;
  }

  if (!order.shippingType?.trim()) {
    data.shippingType = 'standard';
  }

  if ((order.subtotal ?? 0) <= 0 && computedSubtotal > 0) {
    data.subtotal = computedSubtotal;
  }

  if (order.shippingAmount === null || order.shippingAmount === undefined) {
    data.shippingAmount = 0;
  }

  if (order.handlingAmount === null || order.handlingAmount === undefined) {
    data.handlingAmount = 0;
  }

  if (order.taxAmount === null || order.taxAmount === undefined) {
    data.taxAmount = 0;
  }

  if (order.codAmount === null || order.codAmount === undefined) {
    data.codAmount = 0;
  }

  const missingActivities = buildMissingActivities(order);

  return {
    data,
    missingActivities,
  };
}

async function main() {
  const shouldApply = process.argv.includes('--apply');

  const orders = await prisma.order.findMany({
    include: {
      items: {
        select: {
          price: true,
          quantity: true,
        },
      },
      activities: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  const patches = orders
    .map((order) => ({
      order,
      patch: computeOrderPatch(order),
    }))
    .filter(
      ({ patch }) =>
        Object.keys(patch.data).length > 0 ||
        patch.missingActivities.length > 0,
    );

  const orderUpdateCount = patches.filter(
    ({ patch }) => Object.keys(patch.data).length > 0,
  ).length;
  const activityInsertCount = patches.reduce(
    (sum, { patch }) => sum + patch.missingActivities.length,
    0,
  );

  console.log(
    `[legacy-orders] ${shouldApply ? 'Apply' : 'Dry run'} mode on ${orders.length} orders`,
  );
  console.log(
    `[legacy-orders] ${patches.length} orders need fixes, ${orderUpdateCount} order rows to update, ${activityInsertCount} activities to insert`,
  );

  if (patches.length > 0) {
    console.log(
      `[legacy-orders] Sample order ids: ${patches
        .slice(0, 20)
        .map(({ order }) => order.id)
        .join(', ')}`,
    );
  }

  if (!shouldApply) {
    console.log(
      '[legacy-orders] No changes written. Re-run with --apply to update the database.',
    );
    return;
  }

  for (const { order, patch } of patches) {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(patch.data).length > 0) {
        await tx.order.update({
          where: { id: order.id },
          data: patch.data,
        });
      }

      if (patch.missingActivities.length > 0) {
        await tx.orderActivity.createMany({
          data: patch.missingActivities.map((activity) => ({
            orderId: order.id,
            status: activity.status,
            title: activity.title,
            detail: activity.detail,
            createdAt: activity.createdAt,
          })),
        });
      }
    });
  }

  console.log('[legacy-orders] Backfill completed successfully.');
}

main()
  .catch((error) => {
    console.error('[legacy-orders] Backfill failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
