function AdminSupportLoading() {
  return (
    <div className="flex min-h-[300px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-emerald-600" />
        <p className="text-sm text-[var(--text-secondary)]">
          Loading support tickets...
        </p>
      </div>
    </div>
  );
}

export default AdminSupportLoading;
