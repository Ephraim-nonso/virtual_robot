import { useAuthContext } from '../context/useAuthContext';

export const AuthMetrics = () => {
  const { status, user } = useAuthContext();

  return (
    <>
      <div className="metric-card">
        <span>Session</span>
        <strong>{status === 'authenticated' ? 'Signed in' : status === 'loading' ? 'Checking' : 'Sign in'}</strong>
      </div>
      <div className="metric-card">
        <span>Role</span>
        <strong>{user?.role ?? '--'}</strong>
      </div>
      <div className="metric-card">
        <span>Telemetry Auth</span>
        <strong>{status === 'authenticated' ? 'Ready' : 'Locked'}</strong>
      </div>
    </>
  );
};
