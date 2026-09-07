import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError } from '../../utils/app-error';
import { CartBundleSnapshot } from '../../types/bundle-snapshot';
import type { z } from 'zod';
import type { addCartItemSchema, updateCartItemSchema } from './schemas';

type AddCartItemInput = z.infer<typeof addCartItemSchema>;
type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

const CART_ITEM_INCLUDE = {
  items: {
    include: {
      package: { include: { destination: true } },
      destination: true,
    },
  },
} as const;

export async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId }, include: CART_ITEM_INCLUDE });
  if (!cart) {
    await prisma.cart.create({ data: { userId } });
    cart = await prisma.cart.findUnique({ where: { userId }, include: CART_ITEM_INCLUDE });
  }
  return cart!;
}

function normalizeCurrency(value: number): number {
  return Number(value.toFixed(2));
}

async function buildBundleSnapshot(
  destinationId: string,
  keptPackageIds: string[],
  removedPackageIds: string[],
): Promise<CartBundleSnapshot> {
  const destination = await prisma.destination.findFirst({
    where: { id: destinationId, isActive: true },
    include: { packages: true },
  });
  if (!destination) throw new NotFoundError('Destination not found or inactive');
  if (destination.packages.length === 0) throw new BadRequestError('Destination has no packages');

  const packageIdSet = new Set(destination.packages.map((pkg) => pkg.id));
  const checkedIds = [...keptPackageIds, ...removedPackageIds];
  const allBelongToDestination = checkedIds.every((id) => packageIdSet.has(id));
  if (!allBelongToDestination) {
    throw new BadRequestError('All selected package ids must belong to this destination');
  }

  const hasDuplicateIds = new Set(checkedIds).size !== checkedIds.length;
  if (hasDuplicateIds) {
    throw new BadRequestError('Package ids cannot be duplicated across kept and removed');
  }

  const completeSelection = checkedIds.length === destination.packages.length;
  if (!completeSelection) {
    throw new BadRequestError('keptPackageIds and removedPackageIds must cover all destination packages');
  }

  const nonRemovablePackages = destination.packages.filter((pkg) => !pkg.isRemovable);
  const missingRequiredPackage = nonRemovablePackages.find((pkg) => !keptPackageIds.includes(pkg.id));
  if (missingRequiredPackage) {
    throw new BadRequestError(`Package "${missingRequiredPackage.title}" is required and cannot be removed`);
  }

  const originalTotalNgn = destination.packages.reduce((sum, pkg) => sum + Number(pkg.priceNgn), 0);
  const originalTotalUsd = destination.packages.reduce((sum, pkg) => sum + Number(pkg.priceUsd), 0);
  const keptPackages = destination.packages.filter((pkg) => keptPackageIds.includes(pkg.id));
  const customizedTotalNgn = keptPackages.reduce((sum, pkg) => sum + Number(pkg.priceNgn), 0);
  const customizedTotalUsd = keptPackages.reduce((sum, pkg) => sum + Number(pkg.priceUsd), 0);

  return {
    packagesSnapshot: destination.packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.title,
      type: pkg.packageType,
      description: pkg.description ?? null,
      priceNgn: normalizeCurrency(Number(pkg.priceNgn)),
      priceUsd: normalizeCurrency(Number(pkg.priceUsd)),
      isRemovable: pkg.isRemovable,
    })),
    keptPackageIds,
    removedPackageIds,
    originalTotalNgn: normalizeCurrency(originalTotalNgn),
    originalTotalUsd: normalizeCurrency(originalTotalUsd),
    customizedTotalNgn: normalizeCurrency(customizedTotalNgn),
    customizedTotalUsd: normalizeCurrency(customizedTotalUsd),
  };
}

export async function addItem(userId: string, dto: AddCartItemInput) {
  const cart = await getOrCreateCart(userId);

  if (dto.destinationId) {
    const keptPackageIds = dto.keptPackageIds ?? [];
    const removedPackageIds = dto.removedPackageIds ?? [];
    const snapshot = await buildBundleSnapshot(dto.destinationId, keptPackageIds, removedPackageIds);
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        destinationId: dto.destinationId,
        packageId: null,
        quantity: 1,
        unitPriceNgn: snapshot.customizedTotalNgn,
        bundleSnapshot: snapshot as object,
      },
    });
    return getOrCreateCart(userId);
  }

  if (!dto.packageId) throw new BadRequestError('packageId or destinationId is required');
  const pkg = await prisma.package.findUnique({ where: { id: dto.packageId } });
  if (!pkg) throw new NotFoundError('Package not found');

  const existingItem = cart.items.find((entry) => entry.packageId === dto.packageId && !entry.destinationId);
  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + (dto.quantity || 1) },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        packageId: dto.packageId,
        destinationId: null,
        quantity: dto.quantity || 1,
        unitPriceNgn: pkg.priceNgn,
        bundleSnapshot: undefined,
      },
    });
  }
  return getOrCreateCart(userId);
}

export async function updateItem(userId: string, itemId: string, dto: UpdateCartItemInput) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError('Cart item not found');

  if (item.destinationId) {
    if (!dto.keptPackageIds || !dto.removedPackageIds) {
      throw new BadRequestError('keptPackageIds and removedPackageIds are required for bundle cart items');
    }
    const snapshot = await buildBundleSnapshot(item.destinationId, dto.keptPackageIds, dto.removedPackageIds);
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: 1, unitPriceNgn: snapshot.customizedTotalNgn, bundleSnapshot: snapshot as object },
    });
    return getOrCreateCart(userId);
  }

  if (!dto.quantity) throw new BadRequestError('quantity is required');
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
  return getOrCreateCart(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError('Cart item not found');
  await prisma.cartItem.delete({ where: { id: itemId } });
  return getOrCreateCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getOrCreateCart(userId);
}
