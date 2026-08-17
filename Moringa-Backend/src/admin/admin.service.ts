import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

interface AdminOrderItem {
  id: number;
  quantity: number;
  product?: {
    name: string;
  };
}

interface AdminOrder {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
  };
  items: AdminOrderItem[];
}

interface AdminOrderActivity {
  id: number;
  detail: string | null;
  createdAt: Date;
  order: AdminOrder;
}

interface IssueDetail {
  title: string;
  status: string;
  type: string;
  description: string;
}

export interface RecentOrder {
  id: number;
  orderNumber: string;
  orderTitle: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface RecentIssue {
  id: number;
  title: string;
  status: string;
  type: string;
  description: string;
  createdAt: Date;
  order: {
    id: number;
    orderNumber: string;
    orderTitle: string;
  };
}

export interface AdminOverview {
  productCount: number;
  openOrderCount: number;
  cancelledOrderCount: number;
  issueCount: number;
  blogCount: number;
  codCollected: number;
  onlineCollected: number;
  recentOrders: RecentOrder[];
  recentIssues: RecentIssue[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<AdminOverview> {
    const [
      productCount,
      openOrderCount,
      cancelledOrderCount,
      issueCount,
      blogCount,
      codCollected,
      onlineCollected,
      recentOrdersRaw,
      recentIssuesRaw,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.CANCELLED],
          },
        },
      }),
      this.prisma.orderActivity.count({
        where: { title: 'Order issue' },
      }),
      this.prisma.blogPost.count(),
      this.prisma.order.aggregate({
        where: {
          paymentMethod: 'cod',
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.OUT_FOR_DELIVERY,
              OrderStatus.DELIVERED,
              OrderStatus.CANCELLED,
            ],
          },
        },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: {
          paymentMethod: {
            not: 'cod',
          },
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.OUT_FOR_DELIVERY,
              OrderStatus.DELIVERED,
              OrderStatus.CANCELLED,
            ],
          },
        },
        _sum: { total: true },
      }),
      this.prisma.order.findMany({
        where: {
          user: { role: 'USER' },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.orderActivity.findMany({
        where: { title: 'Order issue' },
        include: {
          order: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const codTotal = codCollected._sum.total ?? 0;
    const onlineTotal = onlineCollected._sum.total ?? 0;

    const recentOrders: RecentOrder[] = recentOrdersRaw.map(
      (order: AdminOrder) => {
        const items = order.items;
        const [firstItem, ...restItems] = items;
        const orderTitle = restItems.length
          ? `${firstItem?.product?.name || 'Moringa item'} + ${restItems.length} more item${restItems.length > 1 ? 's' : ''}`
          : firstItem?.product?.name || 'Moringa order';

        return {
          id: order.id,
          orderNumber: `MOR-${String(10000000 + order.id)}`,
          orderTitle,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          user: order.user,
        };
      },
    );

    const recentIssues: RecentIssue[] = recentIssuesRaw
      .map((activity: AdminOrderActivity) => {
        const detail = activity.detail;
        if (!detail || !detail.startsWith('__ISSUE__')) return null;
        try {
          const issueDetail = JSON.parse(
            detail.slice('__ISSUE__'.length),
          ) as IssueDetail;
          const order = activity.order;
          const items = order.items;
          const [firstItem, ...restItems] = items;
          const orderTitle = restItems.length
            ? `${firstItem?.product?.name || 'Moringa item'} + ${restItems.length} more item${restItems.length > 1 ? 's' : ''}`
            : firstItem?.product?.name || 'Moringa order';

          return {
            id: activity.id,
            title: issueDetail.title,
            status: issueDetail.status,
            type: issueDetail.type,
            description: issueDetail.description,
            createdAt: activity.createdAt,
            order: {
              id: order.id,
              orderNumber: `MOR-${String(10000000 + order.id)}`,
              orderTitle,
            },
          };
        } catch {
          return null;
        }
      })
      .filter(
        (issue: RecentIssue | null): issue is RecentIssue => issue !== null,
      );

    return {
      productCount,
      openOrderCount,
      cancelledOrderCount,
      issueCount,
      blogCount,
      codCollected: codTotal,
      onlineCollected: onlineTotal,
      recentOrders,
      recentIssues,
    };
  }
}
