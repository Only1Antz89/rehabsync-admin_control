import { PlatformAdminsManager } from './PlatformAdminsManager';

export const dynamic = 'force-dynamic';

export default function PlatformAdminsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Platform Admins</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Who can sign in to the Admin Centre. Super-admins get everything here plus SSO into the
          Sales Centre and Ads Centre; support accounts have no console access yet.
        </p>
      </div>
      <PlatformAdminsManager />
    </div>
  );
}
