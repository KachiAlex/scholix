import { AuthGateway } from '@/components/AuthGateway';

export default function PortalPage({
  searchParams,
}: {
  searchParams?: { mode?: string };
}) {
  const mode = searchParams?.mode === 'register' ? 'register' : 'login';

  return (
    <main
      style={{
        padding: '4rem clamp(1.5rem, 5vw, 5rem)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto' }}>
        <AuthGateway initialMode={mode} />
      </div>
    </main>
  );
}
