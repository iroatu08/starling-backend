"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDestinationGroupsForEmail = buildDestinationGroupsForEmail;
exports.buildDestinationsSummary = buildDestinationsSummary;
const FALLBACK_KEY = '__unknown_destination__';
function resolveBookingItemDestination(item) {
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
function bookingItemLineTitle(item) {
    const isBundle = Boolean(item.bundleSnapshot && item.destinationId);
    if (isBundle) {
        return `${item.destination?.name ?? 'Destination'} bundle`;
    }
    return item.package?.title ?? item.destination?.name ?? 'Booking item';
}
function lineTotalNgn(item) {
    return Number(item.unitPriceNgn) * item.quantity;
}
/**
 * Groups booking line items by destination for emails and PDF receipts.
 *
 * @param items - Booking items with package/destination relations where applicable
 */
function buildDestinationGroupsForEmail(items) {
    const map = new Map();
    for (const item of items) {
        const meta = resolveBookingItemDestination(item);
        const row = {
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
        }
        else {
            map.set(meta.key, {
                destinationKey: meta.key,
                destinationName: meta.name,
                country: meta.country,
                lines: [row],
                subtotalNgn: add,
            });
        }
    }
    return Array.from(map.values()).sort((a, b) => a.destinationName.localeCompare(b.destinationName, undefined, { sensitivity: 'base' }));
}
/**
 * Short comma-separated list of destination names for compact email copy.
 *
 * @param groups - Result of {@link buildDestinationGroupsForEmail}
 */
function buildDestinationsSummary(groups) {
    const labels = groups.map((g) => (g.country ? `${g.destinationName} (${g.country})` : g.destinationName));
    return [...new Set(labels)].join(', ');
}
//# sourceMappingURL=booking-email-groups.util.js.map