export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center p-6">
      <div className="bg-background w-full max-w-md rounded-lg border p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
