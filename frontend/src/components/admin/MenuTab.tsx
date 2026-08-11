import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from '../../lib/toast';
import { createFood, updateFood, archiveFood, uploadAdminMedia } from '../../lib/admin';
import { formatPrice } from '../../lib/api';

type OptionDraft = {
  label: string;
  value: string;
  price: string;
  stock: string;
  isAvailable: boolean;
};

type MediaItem = {
  type: 'IMAGE' | 'VIDEO';
  url: string;
};

type FoodDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  heroImage: string;
  imageName: string;
  galleryImages: string[];
  videos: string[];
  orderingMode: string;
  options: OptionDraft[];
};

function emptyOption(): OptionDraft {
  return { label: '', value: '', price: '', stock: '', isAvailable: true };
}

function emptyDraft(): FoodDraft {
  return {
    name: '',
    slug: '',
    description: '',
    heroImage: '',
    imageName: '',
    galleryImages: [],
    videos: [],
    orderingMode: 'PLATE',
    options: [emptyOption()],
  };
}

function foodToDraft(food: any): FoodDraft {
  return {
    id: food.id,
    name: food.name ?? '',
    slug: food.slug ?? '',
    description: food.description ?? '',
    heroImage: food.heroImage ?? '',
    imageName: '',
    galleryImages: food.galleryImages ?? [],
    videos: food.videos ?? [],
    orderingMode: food.orderingMode ?? 'PLATE',
    options: (food.options ?? []).map((o: any) => ({
      label: o.label ?? '',
      value: o.value ?? '',
      price: o.priceKobo ? (o.priceKobo / 100).toFixed(2) : '',
      stock: o.stock === null || o.stock === undefined ? '' : String(o.stock),
      isAvailable: o.isAvailable !== false,
    })),
  };
}

function cleanSlug(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function readImageFile(file: File, onReady: (url: string, name: string) => void) {
  if (file.size > 1_500_000) {
    toast.warning('Image is too large. Use a smaller file or a web URL.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => onReady((ev.target?.result as string) ?? '', file.name);
  reader.readAsDataURL(file);
}

function MediaSlider({ media }: { media: MediaItem[] }) {
  const [index, setIndex] = useState(0);
  if (!media.length) return null;
  const active = media[index];
  return (
    <div className='relative aspect-video overflow-hidden rounded-2xl bg-black'>
      {active.type === 'VIDEO' ? (
        <video src={active.url} poster='' autoPlay muted loop playsInline className='h-full w-full object-cover' />
      ) : (
        <img src={active.url} alt='' loading='lazy' className='h-full w-full object-cover' />
      )}
      {media.length > 1 && (
        <div className='absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-2'>
          {media.map((_, i) => (
            <button
              key={i}
              type='button'
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-emerald-400' : 'w-2 bg-white/40'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function optionsToPayload(options: OptionDraft[]) {
  return options
    .filter((o) => o.label.trim() && o.price.trim())
    .map((o) => {
      const price = Number(o.price);
      if (Number.isNaN(price) || price < 0) throw new Error(`Option ${o.label || ''} has an invalid price`);
      return {
        label: o.label.trim(),
        value: o.value.trim() || null,
        priceKobo: Math.round(price * 100),
        stock: o.stock.trim() === '' ? null : Number(o.stock),
        isAvailable: o.isAvailable,
      };
    });
}

export function MenuTab({ foods, onRefresh }: { foods: any[]; onRefresh: () => void }) {
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [draft, setDraft] = useState<FoodDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const setField = <K extends keyof FoodDraft>(field: K, value: FoodDraft[K]) => {
    setDraft((d) => ({ ...d, [field]: value } as FoodDraft));
  };

  const setOption = (i: number, patch: Partial<OptionDraft>) => {
    setDraft((d) => {
      const next = [...d.options];
      next[i] = { ...next[i], ...patch };
      return { ...d, options: next };
    });
  };

  const removeOption = (i: number) => {
    setDraft((d) => ({ ...d, options: d.options.filter((_, idx) => idx !== i) }));
  };

  const addOption = () => {
    setDraft((d) => ({ ...d, options: [...d.options, emptyOption()] }));
  };

  const startCreate = () => {
    setDraft(emptyDraft());
    setMode('create');
  };

  const startEdit = (food: any) => {
    setDraft(foodToDraft(food));
    setMode('edit');
  };

  const closeForm = () => {
    setMode('closed');
    setDraft(emptyDraft());
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const name = draft.name.trim();
      const slug = cleanSlug(draft.slug);
      if (!name || !slug) {
        toast.error('Food name and slug are required.');
        return;
      }
      const payloadOptions = optionsToPayload(draft.options);
      if (payloadOptions.length === 0) {
        toast.error('Add at least one option with a price.');
        return;
      }
      const body = {
        name,
        slug,
        description: draft.description.trim() || null,
        heroImage: draft.heroImage || null,
        galleryImages: draft.galleryImages.filter(Boolean),
        videos: draft.videos.filter(Boolean),
        orderingMode: draft.orderingMode,
        options: payloadOptions,
      };
      if (draft.id) {
        await updateFood(draft.id, body);
        toast.success('Food updated.');
      } else {
        await createFood(body);
        toast.success('Food created.');
      }
      closeForm();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save food.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(food: any, field: string) {
    setWorkingId(food.id);
    try {
      const next =
        field === 'status'
          ? food.status === 'PUBLISHED'
            ? 'DRAFT'
            : 'PUBLISHED'
          : !food[field];
      await updateFood(food.id, { [field]: next });
      onRefresh();
      toast.success('Updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setWorkingId(null);
    }
  }

  async function handleArchive(id: string) {
    setWorkingId(id);
    try {
      await archiveFood(id);
      onRefresh();
      toast.success('Food removed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove food.');
    } finally {
      setWorkingId(null);
    }
  }

  const isFormOpen = mode !== 'closed';

  return (
    <div>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-white'>Menu</h2>
          <p className='text-sm text-white/60'>Manage dishes and the portions customers can order.</p>
        </div>
        <button
          onClick={isFormOpen ? closeForm : startCreate}
          className='rounded-full bg-white px-6 py-2 font-bold text-black'
        >
          {isFormOpen ? 'Close' : 'Add food'}
        </button>
      </div>

      <div className='mt-6 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4'>
        <p className='text-sm text-blue-100'>
          <strong>How this works:</strong> A food is the dish (e.g. Jollof Rice). Each food needs at least one
          option that customers pick from, such as Half Portion or Full Portion. Price is entered in Nigerian Naira.
          Leaving stock blank means unlimited availability. Delete a food to remove it from the menu while keeping
          old order records safe.
        </p>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-6'>
          <h3 className='text-lg font-bold text-white'>{draft.id ? 'Edit food' : 'Create new food'}</h3>

          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Food name</span>
              <input
                value={draft.name}
                onChange={(e) => {
                  setField('name', e.target.value);
                  if (!draft.id) setField('slug', cleanSlug(e.target.value));
                }}
                placeholder='e.g. Jollof Rice'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
            </label>

            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Slug (URL name)</span>
              <input
                value={draft.slug}
                onChange={(e) => setField('slug', cleanSlug(e.target.value))}
                placeholder='e.g. jollof-rice'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <span className='mt-1 block text-xs text-white/50'>No spaces. Must be unique.</span>
            </label>
          </div>

          <label className='mt-5 block'>
            <span className='text-sm font-medium text-white/90'>Description</span>
            <textarea
              value={draft.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder='Short description that appears on the menu and food page'
              className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
          </label>

          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Ordering mode</span>
              <select
                value={draft.orderingMode}
                onChange={(e) => setField('orderingMode', e.target.value)}
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              >
                <option value='PLATE'>Plate (e.g. rice by plate)</option>
                <option value='PORTION'>Portion (e.g. soup by portion)</option>
                <option value='PIECE'>Piece (e.g. meat by piece)</option>
              </select>
            </label>

            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Hero image URL</span>
              <input
                value={draft.heroImage}
                onChange={(e) => setField('heroImage', e.target.value)}
                placeholder='https://example.com/image.jpg'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <span className='mt-1 block text-xs text-white/50'>Or upload an image below.</span>
            </label>
          </div>

          <label className='mt-5 block'>
            <span className='text-sm font-medium text-white/90'>Upload hero image</span>
            <input
              type='file'
              accept='image/*'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                readImageFile(file, (url, name) => {
                  setField('heroImage', url);
                  setField('imageName', name);
                });
              }}
              className='mt-1 block w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black'
            />
            {draft.imageName && <span className='mt-1 block text-xs text-white/60'>{draft.imageName}</span>}
          </label>

          <div className='mt-5 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4'>
            <h4 className='text-sm font-medium text-white/90'>Gallery & videos</h4>
            <MediaSlider
              media={[
                ...(draft.heroImage ? [{ type: 'IMAGE' as const, url: draft.heroImage }] : []),
                ...draft.galleryImages.map((url) => ({ type: 'IMAGE' as const, url })),
                ...draft.videos.map((url) => ({ type: 'VIDEO' as const, url })),
              ]}
            />

            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Gallery image URLs</span>
              <textarea
                value={draft.galleryImages.join('\n')}
                onChange={(e) =>
                  setField(
                    'galleryImages',
                    e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder='https://example.com/photo1.jpg'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                rows={3}
              />
            </label>

            <label className='block'>
              <span className='text-sm font-medium text-white/90'>Video URLs</span>
              <textarea
                value={draft.videos.join('\n')}
                onChange={(e) =>
                  setField(
                    'videos',
                    e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder='https://example.com/video1.mp4'
                className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                rows={2}
              />
            </label>

            <label className='flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-white/70 hover:bg-white/10'>
              <Upload className='h-5 w-5' />
              <span className='mt-2 text-sm'>Upload images or videos</span>
              <input
                type='file'
                accept='image/*,video/*'
                multiple
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newImages: string[] = [];
                  const newVideos: string[] = [];
                  for (const file of Array.from(files)) {
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                    });
                    const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
                    const res = await uploadAdminMedia(dataUrl, type);
                    if (type === 'VIDEO') newVideos.push(res.url);
                    else newImages.push(res.url);
                  }
                  setDraft((d) => ({
                    ...d,
                    galleryImages: [...d.galleryImages, ...newImages],
                    videos: [...d.videos, ...newVideos],
                  }));
                  e.target.value = '';
                }}
                className='hidden'
              />
            </label>
          </div>

          <div className='mt-6'>
            <div className='flex items-baseline justify-between'>
              <span className='text-sm font-medium text-white/90'>Options (portions / sizes)</span>
              <span className='text-xs text-white/50'>Customers choose one of these when ordering.</span>
            </div>
            <div className='mt-3 space-y-3'>
              {draft.options.map((o, i) => (
                <div key={i} className='grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-12'>
                  <div className='sm:col-span-3'>
                    <span className='text-xs text-white/60'>Label</span>
                    <input
                      value={o.label}
                      onChange={(e) => setOption(i, { label: e.target.value })}
                      placeholder='e.g. Full Plate'
                      className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-2 text-sm text-white'
                    />
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-xs text-white/60'>Code</span>
                    <input
                      value={o.value}
                      onChange={(e) => setOption(i, { value: e.target.value })}
                      placeholder='optional'
                      className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-2 text-sm text-white'
                    />
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-xs text-white/60'>Price (NGN)</span>
                    <input
                      type='number'
                      step='0.01'
                      min='0'
                      value={o.price}
                      onChange={(e) => setOption(i, { price: e.target.value })}
                      placeholder='0.00'
                      className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-2 text-sm text-white'
                    />
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-xs text-white/60'>Stock</span>
                    <input
                      type='number'
                      min='0'
                      value={o.stock}
                      onChange={(e) => setOption(i, { stock: e.target.value })}
                      placeholder='unlimited'
                      className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-2 text-sm text-white'
                    />
                  </div>
                  <div className='flex items-end gap-2 sm:col-span-2'>
                    <label className='flex items-center gap-2 text-sm text-white/80'>
                      <input
                        type='checkbox'
                        checked={o.isAvailable}
                        onChange={(e) => setOption(i, { isAvailable: e.target.checked })}
                        className='h-4 w-4'
                      />
                      Available
                    </label>
                  </div>
                  <div className='flex items-end sm:col-span-1'>
                    <button
                      type='button'
                      onClick={() => removeOption(i)}
                      className='w-full rounded-2xl border border-red-400/30 px-3 py-2 text-sm text-red-300'
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type='button'
              onClick={addOption}
              className='mt-3 rounded-full border border-white/20 px-4 py-2 text-sm text-white'
            >
              Add another option
            </button>
          </div>

          <div className='mt-6 flex gap-3'>
            <button
              type='submit'
              disabled={saving}
              className='rounded-full bg-white px-6 py-2 font-bold text-black disabled:opacity-60'
            >
              {saving ? 'Saving…' : draft.id ? 'Update food' : 'Save food'}
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

      {foods.length === 0 && (
        <div className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70'>
          No foods yet. Click Add food to create the first one.
        </div>
      )}

      <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {foods.map((food) => (
          <div
            key={food.id}
            className='flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5'
          >
            <div className='h-40 bg-white/5'>
              {food.heroImage ? (
                <img
                  src={food.heroImage}
                  alt=''
                  loading='lazy'
                  decoding='async'
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full items-center justify-center text-sm text-white/30'>
                  No image
                </div>
              )}
            </div>

            <div className='flex flex-1 flex-col p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-lg font-bold text-white'>{food.name}</h3>
                  <p className='text-sm text-white/60'>{food.orderingMode}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                    food.status === 'PUBLISHED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {food.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                </span>
              </div>

              {food.description && (
                <p className='mt-2 line-clamp-2 text-sm text-white/70'>{food.description}</p>
              )}

              <div className='mt-4 flex flex-wrap gap-2'>
                {food.options?.length === 0 && (
                  <span className='text-sm text-red-300'>No options added</span>
                )}
                {food.options?.map((o: any) => (
                  <span
                    key={o.id}
                    className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80'
                  >
                    {o.label} {formatPrice(o.priceKobo)}
                  </span>
                ))}
              </div>

              {(() => {
                const isWorking = workingId === food.id;
                return (
                  <div className='mt-auto flex flex-wrap gap-2 pt-4'>
                    <button
                      onClick={() => startEdit(food)}
                      disabled={isWorking}
                      className='rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50'
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(food, 'isAvailable')}
                      disabled={isWorking}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                        food.isAvailable
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {food.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      onClick={() => handleToggle(food, 'featured')}
                      disabled={isWorking}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                        food.featured
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'border border-white/20 text-white/70'
                      }`}
                    >
                      {food.featured ? 'Featured' : 'Feature'}
                    </button>
                    <button
                      onClick={() => handleToggle(food, 'status')}
                      disabled={isWorking}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                        food.status === 'PUBLISHED'
                          ? 'bg-white text-black'
                          : 'border border-white/20 text-white/70'
                      }`}
                    >
                      {food.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleArchive(food.id)}
                      disabled={isWorking}
                      className='ml-auto rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50'
                    >
                      {isWorking ? 'Working…' : 'Delete'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
