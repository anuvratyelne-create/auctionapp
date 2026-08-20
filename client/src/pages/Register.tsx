import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { Mail, Lock, UserPlus, User, MapPin, Building, ChevronDown, Eye, EyeOff, ArrowLeft } from 'lucide-react';

// Indian states list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep'
];

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    state: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
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

    if (isAuthenticated) {
      navigate('/manage', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  const { setAuth } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.signup({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        state: formData.state,
        city: formData.city,
      }) as any;

      api.setToken(response.token);
      setAuth(response.user, response.tournament, response.token, response.tournaments || []);
      navigate('/manage');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cricket Stadium Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067')`,
        }}
      />

      {/* Dark Overlay with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-slate-900/85 to-purple-950/90" />

      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-pink-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Scan Lines Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24">
          <div className="max-w-xl">
            {/* Logo with Glow - Clickable to go back to landing */}
            <Link to="/" className="flex items-center gap-5 mb-12 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl blur-xl opacity-40 animate-pulse" />
                <img
                  src="/logo.png"
                  alt="Game Auction"
                  className="relative w-auto object-contain transition-transform group-hover:scale-105"
                  style={{ height: '22.5rem', filter: 'drop-shadow(0 0 50px rgba(6, 182, 212, 0.5))' }}
                />
              </div>
            </Link>

            {/* Hero Text with Glow */}
            <div className="relative mb-10">
              <h2 className="text-6xl xl:text-7xl font-black leading-[1.1]">
                <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">Join the</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 drop-shadow-[0_0_40px_rgba(168,85,247,0.5)]">
                  Cricket
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400">
                  Revolution
                </span>
              </h2>
            </div>

            <p className="text-xl text-slate-300/90 mb-12 leading-relaxed max-w-lg">
              The ultimate platform for IPL-style player auctions. Real-time bidding,
              live broadcasting, and premium stadium themes.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard value="50+" label="Auctions" color="cyan" />
              <StatCard value="200+" label="Teams" color="purple" />
              <StatCard value="1.5K+" label="Players" color="pink" />
            </div>

            {/* Trust Badges */}
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-900 flex items-center justify-center text-lg">
                    {['🏏', '🎯', '🏆', '⚡'][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-400">
                <span className="text-white font-bold">25+</span> tournaments hosted
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo - Clickable to go back to landing */}
            <Link to="/" className="lg:hidden text-center mb-8 block">
              <img
                src="/logo.png"
                alt="Game Auction"
                className="w-auto object-contain mx-auto"
                style={{ height: '10rem', filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.5))' }}
              />
            </Link>

            {/* Form Card - Glassmorphism */}
            <div className="relative group">
              {/* Animated Border */}
              <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-gradient-xy" />

              <div className="relative bg-black/60 backdrop-blur-2xl rounded-3xl p-8 border border-white/10">
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                  <p className="text-slate-400">Start your auction journey today</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3 backdrop-blur-sm">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      {error}
                    </div>
                  )}

                  {/* Name & Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <GlassInput
                      label="Full Name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      icon={<User size={18} />}
                    />
                    <GlassInput
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@email.com"
                      icon={<Mail size={18} />}
                    />
                  </div>

                  {/* Mobile & Password */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Mobile</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 bg-white/5 border border-white/10 border-r-0 rounded-l-xl text-cyan-400 text-sm font-medium">
                          +91
                        </span>
                        <input
                          type="tel"
                          name="mobile"
                          value={formData.mobile}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-r-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
                          placeholder="9876543210"
                          required
                        />
                      </div>
                    </div>
                    <GlassInput
                      label="Password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      icon={<Lock size={18} />}
                    />
                  </div>

                  {/* State & City */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-10 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all appearance-none cursor-pointer"
                          required
                        >
                          <option value="" className="bg-slate-900">Select</option>
                          {INDIAN_STATES.map(state => (
                            <option key={state} value={state} className="bg-slate-900">{state}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <GlassInput
                      label="City"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Mumbai"
                      icon={<Building size={18} />}
                    />
                  </div>

                  {/* Confirm Password */}
                  <GlassInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Lock size={18} />}
                  />

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      I agree to the <a href="#" className="text-cyan-400 hover:underline">Terms</a> and <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a>
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                      <UserPlus size={22} />
                      {loading ? 'Creating...' : 'Get Started Free'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
                  </button>
                </form>

                {/* Sign In */}
                <div className="mt-8 text-center">
                  <p className="text-slate-400">
                    Already registered?{' '}
                    <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                      Sign In →
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Back to Home Link */}
            <Link
              to="/"
              className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back to Home</span>
            </Link>

            {/* Bottom Text */}
            <p className="mt-4 text-center text-slate-500 text-sm">
              Trusted by cricket leagues across India
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }

        @keyframes shimmer {
          0% { background-position: -250% -250%; }
          100% { background-position: 250% 250%; }
        }
        .animate-shimmer { animation: shimmer 3s linear infinite; }
      `}</style>
    </div>
  );
}

// Glass Input Component
function GlassInput({ label, name, type, value, onChange, placeholder, icon }: {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full bg-white/5 border border-white/10 rounded-xl pl-11 ${isPassword ? 'pr-11' : 'pr-4'} py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all`}
          placeholder={placeholder}
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ value, label, color }: { value: string; label: string; color: 'cyan' | 'purple' | 'pink' }) {
  const colors = {
    cyan: {
      bg: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
      border: 'border-cyan-500/30 hover:border-cyan-400/50',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/20 hover:shadow-cyan-500/40',
    },
    purple: {
      bg: 'from-purple-500/10 via-purple-500/5 to-transparent',
      border: 'border-purple-500/30 hover:border-purple-400/50',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20 hover:shadow-purple-500/40',
    },
    pink: {
      bg: 'from-pink-500/10 via-pink-500/5 to-transparent',
      border: 'border-pink-500/30 hover:border-pink-400/50',
      text: 'text-pink-400',
      glow: 'shadow-pink-500/20 hover:shadow-pink-500/40',
    },
  };

  return (
    <div className={`relative group bg-gradient-to-br ${colors[color].bg} border ${colors[color].border} rounded-2xl p-5 text-center backdrop-blur-md transition-all duration-300 hover:scale-105 shadow-lg ${colors[color].glow}`}>
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors[color].bg} opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10`} />

      <div className={`text-4xl font-black ${colors[color].text} drop-shadow-[0_0_10px_currentColor]`}>
        {value}
      </div>
      <div className="text-slate-300 text-sm mt-2 font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}
