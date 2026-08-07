import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminStore } from '../stores/superAdminStore';
import { saApi } from '../utils/saApi';

export default function SALogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useSuperAdminStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, superAdmin } = await saApi.login(email, password);
      setAuth(token, superAdmin);
      navigate('/system-health/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Disguised as system health check */}
        <div className="text-center mb-8">
          <h1 className="text-xl text-gray-400 font-mono">System Health Monitor</h1>
          <p className="text-gray-600 text-sm mt-2">Authorized access only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-xl">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Access ID</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter access ID"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">Access Key</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter access key"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-3 px-4 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Authenticate'}
          </button>
        </form>

        <p className="text-center text-gray-700 text-xs mt-4">
          v1.0.0 | Internal Use Only
        </p>
      </div>
    </div>
  );
}
