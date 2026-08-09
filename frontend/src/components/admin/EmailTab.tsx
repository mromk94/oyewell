import { useEffect, useState } from 'react';
import { Mail, Send, Save, Loader2 } from 'lucide-react';
import { fetchEmailConfig, updateEmailConfig, sendTestEmail } from '../../lib/admin';

export default function EmailTab() {
  const [form, setForm] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    from: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const { config: c } = await fetchEmailConfig();
      if (c) {
        setForm({
          host: c.host ?? '',
          port: String(c.port ?? 587),
          secure: Boolean(c.secure),
          user: c.user ?? '',
          pass: c.pass ?? '',
          from: c.from ?? '',
          enabled: Boolean(c.enabled),
        });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateEmailConfig({
        ...form,
        port: Number(form.port),
      });
      setMessage('Email settings saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testAddress) return;
    setTesting(true);
    setMessage(null);
    try {
      const result = await sendTestEmail(testAddress, 'OYE Well test email', 'This is a test email from OYE Well.');
      setMessage(result.message ?? 'Test email sent.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send test');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <p className='text-white/60'>Loading...</p>;

  return (
    <div className='max-w-2xl'>
      <h2 className='text-2xl font-black text-white'>Email service</h2>
      <p className='mt-1 text-white/60'>
        Configure SMTP to send order status notifications to customers.
      </p>

      {message && <p className='mt-4 text-sm text-white/80'>{message}</p>}

      <form onSubmit={handleSave} className='mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <label className='text-sm text-white/60'>SMTP host</label>
            <input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder='smtp.example.com'
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
            />
          </div>
          <div>
            <label className='text-sm text-white/60'>Port</label>
            <input
              type='number'
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
            />
          </div>
          <div>
            <label className='text-sm text-white/60'>Username</label>
            <input
              value={form.user}
              onChange={(e) => setForm({ ...form, user: e.target.value })}
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
            />
          </div>
          <div>
            <label className='text-sm text-white/60'>Password</label>
            <input
              type='password'
              value={form.pass}
              onChange={(e) => setForm({ ...form, pass: e.target.value })}
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
            />
          </div>
          <div className='sm:col-span-2'>
            <label className='text-sm text-white/60'>From address</label>
            <input
              type='email'
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              placeholder='orders@oyewell.com'
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
            />
          </div>
        </div>

        <label className='flex items-center gap-2 text-white/80'>
          <input
            type='checkbox'
            checked={form.secure}
            onChange={(e) => setForm({ ...form, secure: e.target.checked })}
            className='h-4 w-4 rounded border-white/20'
          />
          Use SSL/TLS
        </label>

        <label className='flex items-center gap-2 text-white/80'>
          <input
            type='checkbox'
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className='h-4 w-4 rounded border-white/20'
          />
          Enable email notifications
        </label>

        <button
          disabled={saving}
          type='submit'
          className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 font-bold text-black disabled:opacity-50 sm:w-auto sm:px-8'
        >
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />} Save
        </button>
      </form>

      <div className='mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
        <h3 className='flex items-center gap-2 font-bold text-white'>
          <Mail className='h-5 w-5' /> Send test
        </h3>
        <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
          <input
            type='email'
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            placeholder='admin@example.com'
            className='flex-1 rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
          />
          <button
            disabled={testing || !testAddress}
            onClick={handleTest}
            className='inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20 disabled:opacity-50'
          >
            {testing ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />} Test
          </button>
        </div>
      </div>
    </div>
  );
}
