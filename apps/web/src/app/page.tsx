export default function HomePage() {
  return (
    <main style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Scholix</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Scholix portal scaffold is running. Next: authentication, SIS, CBT, results.
      </p>
      <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>API Health</div>
        <code>GET /api/health</code>
      </div>
    </main>
  );
}
