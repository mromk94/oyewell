import { useState } from 'react';
import { toast } from '../../lib/toast';
import { createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from '../../lib/admin';

type MethodConfig = {
  secretKey?: string;
  encryptionKey?: string;
  webhookSecret?: string;
  callbackUrl?: string;
  testMode?: boolean;
  accountName?: string;
  bankName?: string;
  instructions?: string;
  network?: string;
};

type MethodDraft = {
  id?: string;
  name: string;
  provider: string;
  publicKey: string;
  enabled: boolean;
  config: MethodConfig;
};

type FieldDef = {
  key: keyof MethodConfig;
  label: string;
  type?: 'text' | 'password' | 'checkbox' | 'textarea';
  hint?: string;
};

const PROVIDERS = [
  { value: 'MOCK', label: 'MOCK - Test / fake payments' },
  { value: 'PAYSTACK', label: 'Paystack - Nigeria cards & transfers' },
  { value: 'FLUTTERWAVE', label: 'Flutterwave - Africa payments' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer - Manual verification' },
  { value: 'CRYPTO', label: 'Crypto - Manual verification' },
];

function publicKeyLabel(provider: string): string {
  if (provider === 'BANK_TRANSFER') return 'Account number';
  if (provider === 'CRYPTO') return 'Wallet address';
  return 'Public key';
}

function providerFields(provider: string): FieldDef[] {
  if (provider === 'BANK_TRANSFER') {
    return [
      { key: 'bankName', label: 'Bank name', hint: 'e.g. GTBank' },
      { key: 'accountName', label: 'Account name', hint: 'Name on the account' },
      { key: 'instructions', label: 'Instructions', type: 'textarea', hint: 'Any extra steps for the customer' },
    ];
  }
  if (provider === 'CRYPTO') {
    return [
      { key: 'network', label: 'Network', hint: 'e.g. USDT TRC20, BTC' },
      { key: 'instructions', label: 'Instructions', type: 'textarea', hint: 'Any extra steps for the customer' },
    ];
  }
  const card: FieldDef[] = [
    { key: 'secretKey', label: 'Secret key', type: 'password', hint: 'For production, set this in server environment variables instead.' },
    { key: 'webhookSecret', label: 'Webhook secret', hint: 'Used to verify webhooks from the provider.' },
    { key: 'callbackUrl', label: 'Callback / redirect URL', hint: 'Where customers return after payment.' },
  ];
  if (provider === 'FLUTTERWAVE') {
    card.unshift({ key: 'encryptionKey', label: 'Encryption key', hint: 'Flutterwave encryption key.' });
  }
  card.push({ key: 'testMode', label: 'Test / sandbox mode', type: 'checkbox', hint: 'Keep ON until you are ready for live transactions.' });
  return card;
}

function emptyConfig(): MethodConfig {
  return { testMode: true };
}

function emptyDraft(): MethodDraft {
  return { name: '', provider: 'MOCK', publicKey: '', enabled: false, config: emptyConfig() };
}

function methodToDraft(method: any): MethodDraft {
  const rawConfig = (method.config as MethodConfig) ?? {};
  return {
    id: method.id,
    name: method.name ?? '',
    provider: method.provider ?? 'MOCK',
    publicKey: method.publicKey ?? '',
    enabled: method.enabled === true,
    config: {
      secretKey: rawConfig.secretKey ?? '',
      encryptionKey: rawConfig.encryptionKey ?? '',
      webhookSecret: rawConfig.webhookSecret ?? '',
      callbackUrl: rawConfig.callbackUrl ?? '',
      testMode: rawConfig.testMode !== false,
      accountName: rawConfig.accountName ?? '',
      bankName: rawConfig.bankName ?? '',
      instructions: rawConfig.instructions ?? '',
      network: rawConfig.network ?? '',
    },
  };
}

function buildConfig(draft: MethodDraft): MethodConfig {
  const cfg: MethodConfig = {};
  const fields = providerFields(draft.provider);
  for (const f of fields) {
    const value = draft.config[f.key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) (cfg as any)[f.key] = trimmed;
    } else if (typeof value === 'boolean') {
      (cfg as any)[f.key] = value;
    }
  }
  return cfg;
}

export function PaymentsTab({ methods, onRefresh }: { methods: any[]; onRefresh: () => void }) {
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [draft, setDraft] = useState<MethodDraft>(emptyDraft());

  const closeForm = () => {
    setMode('closed');
    setDraft(emptyDraft());
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const name = draft.name.trim();
      const publicKey = draft.publicKey.trim();
      if (!name) {
        toast.error('Display name is required.');
        return;
      }
      if (draft.provider !== 'MOCK' && !publicKey) {
        toast.error(`${publicKeyLabel(draft.provider)} is required.`);
        return;
      }
      const body = {
        name,
        provider: draft.provider,
        publicKey: publicKey || undefined,
        enabled: draft.enabled,
        config: buildConfig(draft),
      };
      if (draft.id) {
        await updatePaymentMethod(draft.id, body);
        toast.success('Payment method updated.');
      } else {
        await createPaymentMethod(body);
        toast.success('Payment method added.');
      }
      closeForm();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save payment method.');
    }
  }

  async function handleToggle(method: any) {
    try {
      await updatePaymentMethod(method.id, { enabled: !method.enabled });
      onRefresh();
      toast.success('Status updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not toggle method.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePaymentMethod(id);
      onRefresh();
      toast.success('Payment method deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete method.');
    }
  }

  const startCreate = () => {
    setDraft(emptyDraft());
    setMode('create');
  };

  const startEdit = (method: any) => {
    setDraft(methodToDraft(method));
    setMode('edit');
  };

  const isFormOpen = mode !== 'closed';
  const fields = providerFields(draft.provider);
  const realProvider = draft.provider !== 'MOCK';
  const pkLabel = publicKeyLabel(draft.provider);

  const setConfigField = <K extends keyof MethodConfig>(key: K, value: MethodConfig[K]) => {
    setDraft((d) => ({ ...d, config: { ...d.config, [key]: value } }));
  };

  const stats = {
    total: methods.length,
    enabled: methods.filter((m) => m.enabled).length,
    disabled: methods.filter((m) => !m.enabled).length,
    mock: methods.filter((m) => m.provider === 'MOCK').length,
    real: methods.filter((m) => m.provider !== 'MOCK').length,
  };

  return (
    <div>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-white'>Payment Command Center</h2>
          <p className='text-sm text-white/60'>Set up the ways customers can pay.</p>
        </div>
        <button
          onClick={isFormOpen ? closeForm : startCreate}
          className='rounded-full bg-white px-6 py-2 font-bold text-black'
        >
          {isFormOpen ? 'Close' : 'Add method'}
        </button>
      </div>

      <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Enabled', value: stats.enabled, color: 'text-emerald-300' },
          { label: 'Disabled', value: stats.disabled, color: 'text-red-300' },
          { label: 'Live', value: stats.real, color: 'text-cyan-300' },
          { label: 'Mock', value: stats.mock, color: 'text-yellow-300' },
        ].map((s) => (
          <div key={s.label} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
            <p className='text-2xl font-black text-white'>{s.value}</p>
            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className='mt-6 space-y-4'>
        <div className='rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4'>
          <p className='text-sm text-blue-100'>
            <strong>Real-world setup:</strong> Manual methods (Bank transfer and Crypto) require the
            customer to pay outside the app and upload proof. Card providers need a public key for the
            widget and a secret key on the server. Secret keys should never be sent to the browser in
            production.
          </p>
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-sm font-bold text-white/80'>Provider setup guide</p>
          <ul className='mt-2 list-inside list-disc space-y-1 text-sm text-white/70'>
            <li>MOCK = test payments. No real money is moved.</li>
            <li>Paystack = public key + server secret key + webhook secret + test/live mode.</li>
            <li>Flutterwave = public key + server secret key + encryption key + webhook secret + test/live mode.</li>
            <li>Bank transfer = account number, bank name, account name, and optional instructions.</li>
            <li>Crypto = wallet address, network, and instructions.</li>
          </ul>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-6'>
          <h3 className='text-lg font-bold text-white'>{draft.id ? 'Edit payment method' : 'Add payment method'}</h3>

          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Display name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder='e.g. Pay with Card'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <span className='mt-1 block text-xs text-white/50'>Customers see this at checkout.</span>
            </label>

            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Provider</span>
              <select
                value={draft.provider}
                onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value, config: emptyConfig() }))}
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {realProvider && (
            <label className='mt-5 block'>
              <span className='text-sm font-medium text-white/90'>{pkLabel}</span>
              <input
                value={draft.publicKey}
                onChange={(e) => setDraft((d) => ({ ...d, publicKey: e.target.value }))}
                placeholder={draft.provider === 'BANK_TRANSFER' ? '0123456789' : draft.provider === 'CRYPTO' ? '0x... or wallet address' : 'pk_test_... or pk_live_...'}
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
            </label>
          )}

          {fields.length > 0 && (
            <div className='mt-5 grid gap-5 sm:grid-cols-2'>
              {fields.map((field) => (
                <label key={field.key} className='block'>
                  <span className='text-sm font-medium text-white/90'>{field.label}</span>
                  {field.type === 'checkbox' ? (
                    <span className='mt-1 flex items-center gap-2 text-sm text-white/80'>
                      <input
                        type='checkbox'
                        checked={!!draft.config[field.key]}
                        onChange={(e) => setConfigField(field.key, e.target.checked)}
                        className='h-4 w-4'
                      />
                      {String(draft.config[field.key])}
                    </span>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={String(draft.config[field.key] ?? '')}
                      onChange={(e) => setConfigField(field.key, e.target.value)}
                      rows={3}
                      placeholder={field.hint}
                      className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                    />
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={String(draft.config[field.key] ?? '')}
                      onChange={(e) => setConfigField(field.key, e.target.value)}
                      placeholder={field.hint}
                      className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          <label className='mt-4 flex items-center gap-2 text-sm text-white/80'>
            <input
              type='checkbox'
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className='h-4 w-4'
            />
            Enabled for customers
          </label>

          <div className='mt-6 flex gap-3'>
            <button type='submit' className='rounded-full bg-white px-6 py-2 font-bold text-black'>
              {draft.id ? 'Update method' : 'Save method'}
            </button>
            <button
              type='button'
              onClick={closeForm}
              className='rounded-full border border-white/20 px-6 py-2 text-white'
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {methods.length === 0 && (
        <div className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70'>
          No payment methods configured yet. Add one to start accepting orders.
        </div>
      )}

      <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {methods.map((method) => (
          <div
            key={method.id}
            className='flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4'
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h3 className='text-lg font-bold text-white'>{method.name}</h3>
                <p className='text-sm text-white/60'>{method.provider}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                  method.enabled
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {method.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {method.publicKey && (
              <p className='mt-2 break-all text-xs text-white/50'>
                {method.publicKey.slice(0, 20)}...{method.publicKey.slice(-8)}
              </p>
            )}

            <div className='mt-4 flex flex-wrap gap-2'>
              <button
                onClick={() => startEdit(method)}
                className='rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10'
              >
                Edit
              </button>
              <button
                onClick={() => handleToggle(method)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  method.enabled
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {method.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleDelete(method.id)}
                className='ml-auto rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/30'
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
