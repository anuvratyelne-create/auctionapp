import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { PLAYER_CATEGORIES } from '../config/playerRoles';
import { supabaseClient, STORAGE_BUCKET, getPublicUrl, isStorageAvailable } from '../config/supabase';
import { User, Hash, Camera, Briefcase, CheckCircle, AlertCircle, Loader2, Upload, Link as LinkIcon, X } from 'lucide-react';

interface TournamentInfo {
  tournament: {
    id: string;
    name: string;
    logo_url?: string;
  };
  categories: { id: string; name: string; base_price: number }[];
}

export default function PlayerRegister() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);

  // Form state - simplified (no category/price - admin will set)
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [roleCategory, setRoleCategory] = useState('');
  const [role, setRole] = useState('');

  // Photo upload state
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>(isStorageAvailable() ? 'upload' : 'url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shareCode) {
      loadTournamentInfo();
    }
  }, [shareCode]);

  const loadTournamentInfo = async () => {
    try {
      const data = await api.getRegistrationInfo(shareCode!) as TournamentInfo;
      setTournamentInfo(data);
    } catch (err: any) {
      setError(err.message || 'Tournament not found or registration is closed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!supabaseClient) {
      setUploadError('Upload not available. Please use URL instead.');
      setPhotoMode('url');
      return;
    }

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `player-photos/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error: uploadErr } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      const publicUrl = getPublicUrl(data.path);
      setPhotoUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handlePhotoUpload(files[0]);
    }
  };

  const removePhoto = () => {
    setPhotoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!role) {
      setError('Please select your role');
      return;
    }

    setSubmitting(true);

    try {
      await api.registerPlayer(shareCode!, {
        name: name.trim(),
        jersey_number: jerseyNumber.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
        role: role,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  // Get roles for selected category
  const selectedRoleCategory = PLAYER_CATEGORIES.find(c => c.id === roleCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={40} className="text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error && !tournamentInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Registration Unavailable</h1>
          <p className="text-slate-400">{error}</p>
          <Link
            to="/"
            className="inline-block mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h1>
          <p className="text-slate-400 mb-2">
            Your registration is pending approval.
          </p>
          <p className="text-slate-500 text-sm">
            The auction manager will review and approve your entry. You'll be added to the auction pool once approved.
          </p>

          <button
            onClick={() => {
              setSuccess(false);
              setName('');
              setJerseyNumber('');
              setPhotoUrl('');
              setRoleCategory('');
              setRole('');
              setUploadError('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="mt-8 px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Register Another Player
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Tournament Header */}
        <div className="text-center mb-8">
          {tournamentInfo?.tournament.logo_url && (
            <img
              src={tournamentInfo.tournament.logo_url}
              alt={tournamentInfo.tournament.name}
              className="h-20 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-white">
            {tournamentInfo?.tournament.name}
          </h1>
          <p className="text-primary-400 uppercase tracking-wider text-sm mt-1">
            Player Registration
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              Register your details below. The auction manager will review and assign your category/base price.
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <User size={16} />
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              required
            />
          </div>

          {/* Jersey Number */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <Hash size={16} />
              Jersey Number
            </label>
            <input
              type="text"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="e.g., 7, 10, 99"
              maxLength={10}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          {/* Role Type */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <Briefcase size={16} />
              Role Type <span className="text-red-400">*</span>
            </label>
            <select
              value={roleCategory}
              onChange={(e) => {
                setRoleCategory(e.target.value);
                setRole(''); // Reset specific role when category changes
              }}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors"
              required
            >
              <option value="">Select role type</option>
              {PLAYER_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Role */}
          {roleCategory && (
            <div className="mb-5">
              <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                <Briefcase size={16} />
                Specific Role <span className="text-red-400">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors"
                required
              >
                <option value="">Select your specific role</option>
                {selectedRoleCategory?.roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.shortLabel})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Photo Upload/URL */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
              <Camera size={16} />
              Your Photo
            </label>

            {/* Photo already uploaded/provided - show preview */}
            {photoUrl ? (
              <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover border border-slate-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="%23374151" width="80" height="80"/><text x="40" y="40" text-anchor="middle" dy=".3em" fill="%239CA3AF" font-size="10">Error</text></svg>';
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm text-white">Photo uploaded</p>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{photoUrl.split('/').pop()}</p>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <>
                {/* Toggle between Upload and URL */}
                {isStorageAvailable() && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPhotoMode('upload')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        photoMode === 'upload'
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Upload size={16} />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('url')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        photoMode === 'url'
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <LinkIcon size={16} />
                      URL
                    </button>
                  </div>
                )}

                {photoMode === 'upload' && isStorageAvailable() ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        cursor-pointer border-2 border-dashed rounded-lg p-6 text-center
                        transition-all duration-200
                        ${uploading
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-slate-600 hover:border-primary-500 hover:bg-slate-700/30'
                        }
                      `}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 size={32} className="text-primary-400 animate-spin mb-2" />
                          <p className="text-sm text-white">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-slate-700/50 rounded-lg mb-3">
                            <Upload size={28} className="text-slate-400" />
                          </div>
                          <p className="text-sm text-white mb-1">Tap to select your photo</p>
                          <p className="text-xs text-slate-500">JPEG, PNG, GIF or WebP up to 5MB</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                )}

                {uploadError && (
                  <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <p className="text-slate-500 text-xs mt-2">
                  Optional: Upload your photo or provide a direct image URL
                </p>
              </>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-lg hover:from-primary-500 hover:to-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Registration'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Your registration will be reviewed by the auction manager.
        </p>
      </div>
    </div>
  );
}
