import OrdersManager from "@/components/admin/OrdersManager";

export default function AdminOrdersPage() {
  return (
    <div className="admin-card">
      <div className="flex min-h-[80px] items-center justify-between mb-4">
        <h2 className="text-lg font-bold mb-4">Orders</h2>
      </div>
      <OrdersManager />
    </div>
  );
}
