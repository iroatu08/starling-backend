import type { BookingItem, Package, Destination } from '@prisma/client';

const FALLBACK_KEY = '__unknown_destination__';

export interface EmailLineRow {
  title: string;
  quantity: number;
  /** Unit price shown for transparency (matches cart line unit price). */
  unitPriceNgn: number;
  lineTotalNgn: number;
}

export interface EmailDestinationGroup {
  destinationKey: string;
  destinationName: string;
  country?: string;
  lines: EmailLineRow[];
  subtotalNgn: number;
}

export type BookingItemWithRelations = BookingItem & {
  package?: (Package & { destination?: Destination | null }) | null;
  destination?: Destination | null;
};

function resolveBookingItemDestination(
  item: BookingItemWithRelations,
): { key: string; name: string; country?: string } {
  const isBundle = Boolean(item.bundleSnapshot && item.destinationId);
  if (isBundle && item.destination) {
    return {
      key: item.destination.id,
      name: item.destination.name,
      country: item.destination.country,
    };
  }
  if (isBundle && item.destinationId) {
    return { key: item.destinationId, name: 'Destination bundle' };
  }
  const pkgDest = item.package?.destination;
  if (pkgDest) {
    return {
      key: pkgDest.id,
      name: pkgDest.name,
      country: pkgDest.country,
    };
  }
  return { key: FALLBACK_KEY, name: 'Other' };
}

function bookingItemLineTitle(item: BookingItemWithRelations): string {
  const isBundle = Boolean(item.bundleSnapshot && item.destinationId);
  if (isBundle) {
    return `${item.destination?.name ?? 'Destination'} bundle`;
  }
  return item.package?.title ?? item.destination?.name ?? 'Booking item';
}

function lineTotalNgn(item: BookingItemWithRelations): number {
  return Number(item.unitPriceNgn) * item.quantity;
}

/**
 * Groups booking line items by destination for emails and PDF receipts.
 *
 * @param items - Booking items with package/destination relations where applicable
 */
export function buildDestinationGroupsForEmail(items: BookingItemWithRelations[]): EmailDestinationGroup[] {
  const map = new Map<string, EmailDestinationGroup>();
  for (const item of items) {
    const meta = resolveBookingItemDestination(item);
    const row: EmailLineRow = {
      title: bookingItemLineTitle(item),
      quantity: item.quantity,
      unitPriceNgn: Number(item.unitPriceNgn),
      lineTotalNgn: lineTotalNgn(item),
    };
    const existing = map.get(meta.key);
    const add = row.lineTotalNgn;
    if (existing) {
      existing.lines.push(row);
      existing.subtotalNgn += add;
    } else {
      map.set(meta.key, {
        destinationKey: meta.key,
        destinationName: meta.name,
        country: meta.country,
        lines: [row],
        subtotalNgn: add,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.destinationName.localeCompare(b.destinationName, undefined, { sensitivity: 'base' }),
  );
}

/**
 * Short comma-separated list of destination names for compact email copy.
 *
 * @param groups - Result of {@link buildDestinationGroupsForEmail}
 */
export function buildDestinationsSummary(groups: EmailDestinationGroup[]): string {
  const labels = groups.map((g) => (g.country ? `${g.destinationName} (${g.country})` : g.destinationName));
  return [...new Set(labels)].join(', ');
}
