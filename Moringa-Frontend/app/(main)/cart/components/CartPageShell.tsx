import AdminRedirect from "@/components/admin/AdminRedirect";

export interface CartPageShellProps {
  children: React.ReactNode;
}

export function CartPageShell({ children }: CartPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <AdminRedirect />
      <main>{children}</main>
    </div>
  );
}
