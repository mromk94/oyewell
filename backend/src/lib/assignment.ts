import { DeliveryType } from '@prisma/client';
import { prisma } from '../prisma.js';
import { geocodeAddress } from './delivery.js';
import { distanceMeters, isLocationFresh } from './location.js';

export function isRiderEligibleForType(
  rider: { neighborhoodApproval: string; professionalApproval: string; isApproved: boolean; isActive: boolean; available: boolean },
  type: DeliveryType,
): boolean {
  if (!rider.isApproved || !rider.isActive || !rider.available) return false;
  if (type === DeliveryType.PROFESSIONAL) return rider.professionalApproval === 'APPROVED';
  return rider.neighborhoodApproval === 'APPROVED';
}

export async function findEligibleRiders(orderId: string, maxRadiusMeters?: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { deliveryZone: true },
  });
  if (!order || !order.deliveryType || !order.deliveryZoneId) return [];

  const type = order.deliveryType || DeliveryType.NEIGHBORHOOD;
  const orderCoords = await geocodeAddress(order.address);

  const riders = await prisma.rider.findMany({
    where: {
      isApproved: true,
      isActive: true,
      available: true,
      ...(type === DeliveryType.PROFESSIONAL ? { professionalApproval: 'APPROVED' } : { neighborhoodApproval: 'APPROVED' }),
    },
    include: { location: true, user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
  });

  return riders
    .filter((rider) => {
      // Online does not mean available: require an active rider with fresh location
      if (!rider.isActive || !rider.available) return false;
      if (rider.operationalStatus !== 'ONLINE') return false;
      if (!rider.location || !isLocationFresh(rider.location.updatedAt)) return false;
      return true;
    })
    .map((rider) => {
      let dist = Infinity;
      if (rider.location && orderCoords) {
        dist = distanceMeters({ lat: rider.location.latitude, lng: rider.location.longitude }, orderCoords);
      }
      return { ...rider, distanceMeters: dist };
    })
    .filter((rider) => rider.distanceMeters <= (maxRadiusMeters || rider.serviceRadiusMeters || 5000))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

const RINGS = [1000, 3000, 5000, 10000];

export async function dispatchOrder(orderId: string, emit: (riderId: string, ring: number) => void, maxRadiusMeters?: number) {
  const eligible = await findEligibleRiders(orderId, maxRadiusMeters);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.deliveryType) return [];

  for (const ring of RINGS) {
    const ringRiders = eligible.filter((r) => r.distanceMeters <= ring);
    if (ringRiders.length === 0) continue;
    for (const rider of ringRiders) {
      emit(rider.id, ring);
    }
    break;
  }

  return eligible;
}
