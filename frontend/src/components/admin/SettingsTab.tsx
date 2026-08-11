import { useEffect, useState } from 'react';
import { Map, Store, CheckCircle, Loader2 } from 'lucide-react';
import { updateSettings } from '../../lib/admin';
import { toast } from '../../lib/toast';

type SubTab = 'restaurant' | 'map';

const TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'restaurant', label: 'Restaurant', icon: Store },
  { id: 'map', label: 'Map & Geocoding', icon: Map },
];

export default function SettingsTab({ settings, onRefresh }: { settings: any; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('restaurant');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(settings?.name ?? '');
  const [phone, setPhone] = useState(settings?.contactPhone ?? '');
  const [email, setEmail] = useState(settings?.contactEmail ?? '');
  const [lat, setLat] = useState(settings?.latitude != null ? String(settings.latitude) : '');
  const [lng, setLng] = useState(settings?.longitude != null ? String(settings.longitude) : '');
  const [mapSettings, setMapSettings] = useState<any>(settings?.mapSettings ?? {});

  useEffect(() => {
    setName(settings?.name ?? '');
    setPhone(settings?.contactPhone ?? '');
    setEmail(settings?.contactEmail ?? '');
    setLat(settings?.latitude != null ? String(settings.latitude) : '');
    setLng(settings?.longitude != null ? String(settings.longitude) : '');
    setMapSettings(settings?.mapSettings ?? {});
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        name,
        contactPhone: phone,
        contactEmail: email,
        latitude: lat,
        longitude: lng,
        mapSettings,
      });
      onRefresh();
      toast.success('Settings saved and applied');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const provider = (mapSettings?.provider as string) || 'MOCK';

  function setMap(key: string, value: string) {
    setMapSettings({ ...mapSettings, [key]: value });
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold text-white'>Settings</h2>

      <div className='flex flex-wrap gap-2'>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              subTab === id ? 'bg-emerald-500 text-black' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <Icon className='h-4 w-4' /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className='space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6'>
        {subTab === 'restaurant' && (
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>Restaurant details</h3>
            <input
              placeholder='Restaurant name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
            <input
              placeholder='Contact phone'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
            <input
              placeholder='Contact email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
            <div className='grid grid-cols-2 gap-4'>
              <input
                placeholder='Default latitude'
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <input
                placeholder='Default longitude'
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
            </div>
          </div>
        )}

        {subTab === 'map' && (
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>Map &amp; Geocoding</h3>
            <p className='text-sm text-white/60'>
              Provider and tokens are applied immediately after saving. Use MOCK for local development without API keys.
            </p>
            <select
              value={provider}
              onChange={(e) => setMap('provider', e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            >
              <option value='MOCK' className='bg-brand-900'>MOCK (synthetic coordinates)</option>
              <option value='GOOGLE' className='bg-brand-900'>Google Maps</option>
              <option value='MAPBOX' className='bg-brand-900'>Mapbox</option>
            </select>
            {provider === 'GOOGLE' && (
              <input
                type='password'
                placeholder='Google Maps API key'
                value={mapSettings?.googleMapsApiKey ?? ''}
                onChange={(e) => setMap('googleMapsApiKey', e.target.value)}
                className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
            )}
            {provider === 'MAPBOX' && (
              <>
                <input
                  type='password'
                  placeholder='Mapbox server token'
                  value={mapSettings?.mapboxToken ?? ''}
                  onChange={(e) => setMap('mapboxToken', e.target.value)}
                  className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                />
                <input
                  type='password'
                  placeholder='Mapbox public token (for frontend tiles)'
                  value={mapSettings?.publicMapToken ?? ''}
                  onChange={(e) => setMap('publicMapToken', e.target.value)}
                  className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                />
              </>
            )}
          </div>
        )}

        <button
          type='submit'
          disabled={saving}
          className='inline-flex items-center gap-2 rounded-full bg-white px-6 py-2 font-bold text-black disabled:opacity-50'
        >
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle className='h-4 w-4' />}
          Save settings
        </button>
      </form>
    </div>
  );
}
