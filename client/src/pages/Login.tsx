import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { Mail, Lock, LogIn, Sparkles, Trophy, Users, Zap, Eye, EyeOff, X, KeyRound, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    // Check localStorage directly for faster check
    try {
      const stored = localStorage.getItem('auction-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token && parsed?.state?.isAuthenticated) {
          navigate('/manage', { replace: true });
          return;
        }
      }
    } catch (e) {}

    // Also check zustand state
    if (isAuthenticated) {
      navigate('/manage', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(identifier, password) as any;
      api.setToken(response.token);
      setAuth(response.user, response.tournament, response.token, response.tournaments || []);
      navigate('/manage');
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIdentifier('demo');
    setPassword('demo123');
    setError('');
    setLoading(true);

    try {
      const response = await api.login('demo', 'demo123') as any;
      api.setToken(response.token);
      setAuth(response.user, response.tournament, response.token, response.tournaments || []);
      navigate('/manage');
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Demo login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!resetEmail || !currentPassword || !newPassword) {
      setResetError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters');
      return;
    }

    if (currentPassword === newPassword) {
      setResetError('New password must be different from current password');
      return;
    }

    setResetLoading(true);
    try {
      await api.resetPassword(resetEmail, currentPassword, newPassword);
      setResetMessage('Password changed successfully! You can now login.');
      setResetEmail('');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage('');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to change password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-16">
        <div className="max-w-lg">
          {/* Logo - Clickable to go back to landing */}
          <Link to="/" className="flex items-center gap-4 mb-8 group">
            <img
              src="/logo.png"
              alt="Game Auction"
              className="w-auto object-contain transition-transform group-hover:scale-105"
              style={{ height: '22.5rem', filter: 'drop-shadow(0 0 40px rgba(6, 182, 212, 0.5))' }}
            />
          </Link>

          {/* Tagline */}
          <h2 className="text-5xl font-black text-white leading-tight mb-6">
            Run Your Auction
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Like a Pro
            </span>
          </h2>

          <p className="text-xl text-slate-400 mb-12 leading-relaxed">
            The ultimate platform for managing sports player auctions. Real-time bidding,
            live updates, and professional broadcasting tools.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard
              icon={<Zap size={20} />}
              title="Real-time Bidding"
              description="Instant updates across all devices"
              color="amber"
            />
            <FeatureCard
              icon={<Users size={20} />}
              title="Team Management"
              description="Track budgets & player counts"
              color="blue"
            />
            <FeatureCard
              icon={<Trophy size={20} />}
              title="Live Broadcasting"
              description="OBS overlay integration"
              color="purple"
            />
            <FeatureCard
              icon={<Sparkles size={20} />}
              title="Premium Themes"
              description="Stadium & animated backgrounds"
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo - Clickable to go back to landing */}
          <Link to="/" className="lg:hidden text-center mb-8 block">
            <img
              src="/logo.png"
              alt="Game Auction"
              className="w-auto object-contain mx-auto mb-2"
              style={{ height: '10rem', filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.5))' }}
            />
          </Link>

          {/* Login Card */}
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-xl" />

            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                <p className="text-slate-400 mt-2">Sign in to your auction dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email or Mobile
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                    <div className="relative">
                      <Mail
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors"
                      />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-slate-800 transition-all"
                        placeholder="Enter email or mobile number"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                    <div className="relative">
                      <Lock
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-slate-800 transition-all"
                        placeholder="Enter password"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <LogIn size={20} />
                    {loading ? 'Signing in...' : 'Sign In'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900/80 text-slate-500">or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="mt-4 w-full bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-800/30 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600 flex items-center justify-center gap-2 group"
                >
                  <Sparkles size={18} className="text-amber-400 group-hover:animate-pulse" />
                  Try Demo Account
                </button>
              </div>

              <p className="mt-8 text-center text-slate-400 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

          {/* Back to Home Link */}
          <Link
            to="/"
            className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back to Home</span>
          </Link>

          {/* Footer */}
          <p className="mt-4 text-center text-slate-600 text-xs">
            © 2024 Player Auction Pro. All rights reserved.
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
          50% { transform: translateY(-10px) translateX(-10px); opacity: 0.3; }
          75% { transform: translateY(-30px) translateX(5px); opacity: 0.4; }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
      `}</style>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
                setCurrentPassword('');
                setNewPassword('');
                setResetError('');
                setResetMessage('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Change Password</h3>
              <p className="text-slate-400 mt-2">Verify your identity with current password</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {resetError}
                </div>
              )}
              {resetMessage && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm">
                  {resetMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-xl transition-all"
              >
                {resetLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'amber' | 'blue' | 'purple' | 'green';
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorClasses = {
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-4 backdrop-blur-sm`}>
      <div className={`w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center mb-3 ${colorClasses[color].split(' ').pop()}`}>
        {icon}
      </div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}
