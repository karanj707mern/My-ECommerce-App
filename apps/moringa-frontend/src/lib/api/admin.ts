import { apiRequest } from "./http";

export interface AdminRecentOrder {
  id: number;
  orderNumber: string;
  orderTitle: string;
  status: string;
  total: number;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AdminRecentIssue {
  id: number;
  title: string;
  status: string;
  type: string;
  description: string;
  createdAt: string;
  order: {
    id: number;
    orderNumber: string;
    orderTitle: string;
  };
}

export interface AdminOverview {
  productCount: number;
  openOrderCount: number;
  issueCount: number;
  blogCount: number;
  codCollected: number;
  onlineCollected: number;
  recentOrders: AdminRecentOrder[];
  recentIssues: AdminRecentIssue[];
}

export function getAdminOverview() {
  return apiRequest<AdminOverview>("/admin/overview");
}
