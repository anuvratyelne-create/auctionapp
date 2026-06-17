import { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Shield,
  Wrench
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../utils/adminApi';

interface Setting {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

type SettingsData = Record<string, Setting[]>;

function SettingCard({
  setting,
  onSave
}: {
  setting: Setting;
  onSave: (key: string, value: any) => Promise<void>;
}) {
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(setting.key, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const isBoolean = value === 'true' || value === 'false' || typeof value === 'boolean';
  const isNumber = !isNaN(Number(value)) && !isBoolean;

  const formatLabel = (key: string): string => {
    return key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
      <div className="flex-1">
        <p className="text-white font-medium">{formatLabel(setting.key)}</p>
        {setting.description && (
          <p className="text-sm text-slate-500 mt-1">{setting.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isBoolean ? (
          <button
            onClick={() => {
              const newValue = value === 'true' || value === true ? 'false' : 'true';
              setValue(newValue);
            }}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              value === 'true' || value === true
                ? 'bg-emerald-500'
                : 'bg-slate-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                value === 'true' || value === true ? 'translate-x-6' : ''
              }`}
            />
          </button>
        ) : (
          <input
            type={isNumber ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(isNumber ? Number(e.target.value) : e.target.value)}
            className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-right focus:outline-none focus:border-rose-500"
          />
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`p-2 rounded-lg transition-colors ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={18} />
          ) : (
            <Save size={18} />
          )}
        </button>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  settings,
  onSave
}: {
  title: string;
  icon: any;
  settings: Setting[];
  onSave: (key: string, value: any) => Promise<void>;
}) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {settings.map(setting => (
          <SettingCard key={setting.key} setting={setting} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminApi.getSettings();
      setSettings(data);

      // Extract maintenance settings
      const maintenanceSettings = data.maintenance || [];
      const modesSetting = maintenanceSettings.find(s => s.key === 'maintenance_mode');
      const messageSetting = maintenanceSettings.find(s => s.key === 'maintenance_message');

      setMaintenanceMode(modesSetting?.value === 'true' || modesSetting?.value === true);
      setMaintenanceMessage(
        typeof messageSetting?.value === 'string'
          ? messageSetting.value.replace(/^"|"$/g, '')
          : 'System is under maintenance. Please try again later.'
      );
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: any) => {
    await adminApi.updateSetting(key, value);
    await loadSettings();
  };

  const handleToggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      await adminApi.toggleMaintenance(!maintenanceMode, maintenanceMessage);
      setMaintenanceMode(!maintenanceMode);
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const sectionConfig: Record<string, { title: string; icon: any }> = {
    defaults: { title: 'Default Values', icon: DollarSign },
    features: { title: 'Feature Flags', icon: Shield },
    maintenance: { title: 'Maintenance', icon: Wrench },
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-slate-400 mt-1">Configure system-wide defaults and feature flags</p>
      </div>

      {/* Maintenance Mode Banner */}
      {maintenanceMode && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-400 font-medium">Maintenance Mode is Active</p>
            <p className="text-sm text-slate-400 mt-1">Users will see the maintenance message when accessing the app.</p>
          </div>
        </div>
      )}

      {/* Maintenance Mode Control */}
      <div className="mb-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Maintenance Message
            </label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              placeholder="Message to display during maintenance..."
            />
          </div>
          <button
            onClick={handleToggleMaintenance}
            disabled={togglingMaintenance}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors ${
              maintenanceMode
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            } disabled:opacity-50`}
          >
            {togglingMaintenance ? (
              <Loader2 size={18} className="animate-spin" />
            ) : maintenanceMode ? (
              <>
                <CheckCircle size={18} />
                Disable Maintenance Mode
              </>
            ) : (
              <>
                <AlertTriangle size={18} />
                Enable Maintenance Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(settings)
          .filter(([category]) => category !== 'maintenance')
          .map(([category, categorySettings]) => {
            const config = sectionConfig[category] || { title: category, icon: Settings };
            return (
              <SettingsSection
                key={category}
                title={config.title}
                icon={config.icon}
                settings={categorySettings}
                onSave={handleSaveSetting}
              />
            );
          })}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-slate-500 mt-0.5" />
          <div>
            <p className="text-sm text-slate-400">
              Changes to settings take effect immediately. Some settings may require users to refresh their browsers.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Default values are applied to new tournaments only. Existing tournaments are not affected.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
