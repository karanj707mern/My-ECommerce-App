import { component$, Slot } from "@builder.io/qwik";
import AdminLayout from "../../components/admin/AdminLayout";

// Shared chrome for all /admin/* pages: guard + sidebar + header.
export default component$(() => {
  return (
    <AdminLayout>
      <Slot />
    </AdminLayout>
  );
});
