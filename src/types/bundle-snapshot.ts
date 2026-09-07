export interface BundlePackageSnapshot {
  id: string;
  name: string;
  type: string;
  description: string | null;
  priceNgn: number;
  priceUsd: number;
  isRemovable: boolean;
}

export interface CartBundleSnapshot {
  packagesSnapshot: BundlePackageSnapshot[];
  keptPackageIds: string[];
  removedPackageIds: string[];
  originalTotalNgn: number;
  originalTotalUsd: number;
  customizedTotalNgn: number;
  customizedTotalUsd: number;
}

export interface BookingBundleSnapshot extends CartBundleSnapshot {
  savingsNgn: number;
  savingsUsd: number;
}
