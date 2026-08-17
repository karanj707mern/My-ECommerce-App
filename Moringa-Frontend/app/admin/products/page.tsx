import ProductsManager from "@/components/admin/ProductsManager";

export default function AdminProductsPage() {
  return (
    <div className="admin-card">
      <h2 className="text-lg font-bold mb-4">Products</h2>
      <ProductsManager />
    </div>
  );
}
