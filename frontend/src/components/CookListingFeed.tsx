import CookListingHero from './CookListingHero';
import { Loader2 } from 'lucide-react';
import type { CookListing } from '../lib/listings';

interface Props {
  listings: CookListing[];
  loading?: boolean;
}

export default function CookListingFeed({ listings, loading }: Props) {
  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-white/70' />
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className='flex h-screen w-full items-center justify-center px-6 text-center'>
        <p className='max-w-md text-lg text-white/70'>No food around here yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className='w-full'>
      {listings.map((listing, index) => (
        <CookListingHero key={`cook-listing-${index}`} listing={listing} />
      ))}
    </div>
  );
}
