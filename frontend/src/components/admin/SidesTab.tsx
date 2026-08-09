import { useState } from 'react';
import { toast } from '../../lib/toast';
import { createSide, updateSide, deleteSide } from '../../lib/admin';
import { formatPrice } from '../../lib/api';

type SideDraft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
};

function emptyDraft(): SideDraft {
  return { name: '', description: '', price: '', isAvailable: true };
}

function sideToDraft(side: any): SideDraft {
  return {
    id: side.id,
    name: side.name ?? '',
    description: side.description ?? '',
    price: side.priceKobo ? (side.priceKobo / 100).toFixed(2) : '',
    isAvailable: side.isAvailable !== false,
  };
}

function koboFromNaira(value: string): number {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) throw new Error('Price must be a valid positive number.');
  return Math.round(n * 100);
}

export function SidesTab({ sides, onRefresh }: { sides: any[]; onRefresh: () => void }) {
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [draft, setDraft] = useState<SideDraft>(emptyDraft());

  const closeForm = () => {
    setMode('closed');
    setDraft(emptyDraft());
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const name = draft.name.trim();
      if (!name) {
        toast.error('Side name is required.');
        return;
      }
      const priceKobo = koboFromNaira(draft.price);
      const body = {
        name,
        description: draft.description.trim() || null,
        priceKobo,
        isAvailable: draft.isAvailable,
      };
      if (draft.id) {
        await updateSide(draft.id, body);
        toast.success('Side updated.');
      } else {
        await createSide(body);
        toast.success('Side added.');
      }
      closeForm();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save side.');
    }
  }

  async function handleToggle(side: any) {
    try {
      await updateSide(side.id, { isAvailable: !side.isAvailable });
      onRefresh();
      toast.success('Availability updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update availability.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSide(id);
      onRefresh();
      toast.success('Side deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete side.');
    }
  }

  const startCreate = () => {
    setDraft(emptyDraft());
    setMode('create');
  };

  const startEdit = (side: any) => {
    setDraft(sideToDraft(side));
    setMode('edit');
  };

  const isFormOpen = mode !== 'closed';

  return (
    <div>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-white'>Sides</h2>
          <p className='text-sm text-white/60'>Extras customers can add to an order.</p>
        </div>
        <button
          onClick={isFormOpen ? closeForm : startCreate}
          className='rounded-full bg-white px-6 py-2 font-bold text-black'
        >
          {isFormOpen ? 'Close' : 'Add side'}
        </button>
      </div>

      <div className='mt-6 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4'>
        <p className='text-sm text-blue-100'>
          <strong>How this works:</strong> Sides are add-ons like extra meat, plantain, or a drink.
          Enter the price in Nigerian Naira. You can turn a side off at any time so it no longer
          appears at checkout.
        </p>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-6'>
          <h3 className='text-lg font-bold text-white'>{draft.id ? 'Edit side' : 'Add side'}</h3>

          <label className='mt-5 block'>
            <span className='text-sm font-medium text-white/90'>Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder='e.g. Extra Grilled Chicken'
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
          </label>

          <label className='mt-5 block'>
            <span className='text-sm font-medium text-white/90'>Description</span>
            <input
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder='Optional short description'
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
          </label>

          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Price (NGN)</span>
              <input
                type='number'
                step='0.01'
                min='0'
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                placeholder='0.00'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
            </label>

            <label className='flex items-end gap-2 pb-2 text-sm text-white/80'>
              <input
                type='checkbox'
                checked={draft.isAvailable}
                onChange={(e) => setDraft((d) => ({ ...d, isAvailable: e.target.checked }))}
                className='h-4 w-4'
              />
              Available for customers
            </label>
          </div>

          <div className='mt-6 flex gap-3'>
            <button type='submit' className='rounded-full bg-white px-6 py-2 font-bold text-black'>
              {draft.id ? 'Update side' : 'Save side'}
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

      {sides.length === 0 && (
        <div className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70'>
          No sides yet. Add one to let customers add extras to their order.
        </div>
      )}

      <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {sides.map((side) => (
          <div
            key={side.id}
            className='flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4'
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h3 className='text-lg font-bold text-white'>{side.name}</h3>
                {side.description && <p className='text-sm text-white/60'>{side.description}</p>}
                <p className='mt-1 text-sm font-bold text-white/90'>{formatPrice(side.priceKobo)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                  side.isAvailable
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {side.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              <button
                onClick={() => startEdit(side)}
                className='rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10'
              >
                Edit
              </button>
              <button
                onClick={() => handleToggle(side)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  side.isAvailable
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {side.isAvailable ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleDelete(side.id)}
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
