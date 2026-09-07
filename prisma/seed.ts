import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole, PackageType } from '@prisma/client';
import { EXPERIENCE_DESTINATION_SEEDS } from './experience-seeds';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('✅ Database connected');

    // ── Clear existing transactional/content data ───────────────────────────
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "payments",
        "refund_requests",
        "booking_travelers",
        "booking_items",
        "bookings",
        "cart_items",
        "carts",
        "destination_reviews",
        "gallery",
        "packages",
        "destinations"
      RESTART IDENTITY CASCADE
    `);
    console.log('✅ Existing destination/cart/booking data cleared');

    // ── Create admin user ──────────────────────────────────
    const adminExists = await prisma.user.findUnique({ where: { email: 'admin@starlings.com' } });
    if (!adminExists) {
      await prisma.user.create({
        data: {
          email: 'admin@starlings.com',
          passwordHash: await bcrypt.hash('Admin1234!', 12),
          firstName: 'Super',
          lastName: 'Admin',
          role: UserRole.admin,
          isVerified: true,
          isActive: true,
        },
      });
      console.log('✅ Admin user created: admin@starlings.com / Admin1234!');
    }

    // ── Create demo user ────────────────────────────────────
    const demoExists = await prisma.user.findUnique({ where: { email: 'demo@starlings.com' } });
    if (!demoExists) {
      await prisma.user.create({
        data: {
          email: 'demo@starlings.com',
          passwordHash: await bcrypt.hash('Demo1234!', 12),
          firstName: 'Demo',
          lastName: 'User',
          role: UserRole.user,
          isVerified: true,
          isActive: true,
        },
      });
      console.log('✅ Demo user created: demo@starlings.com / Demo1234!');
    }

    // ── Create destinations with new package model ─────────────────────────
    for (const seedDestination of EXPERIENCE_DESTINATION_SEEDS) {
      const destination = await prisma.destination.create({
        data: {
          name: seedDestination.name,
          country: seedDestination.country,
          description: seedDestination.description,
          heroImageUrl: seedDestination.heroImageUrl,
          priceFromNgn: seedDestination.priceFromNgn,
          priceFromUsd: seedDestination.priceFromUsd,
          isFeatured: seedDestination.isFeatured,
          isActive: true,
          latitude: seedDestination.latitude,
          longitude: seedDestination.longitude,
        },
      });
      console.log(`✅ Destination created: ${destination.name}`);

      await prisma.package.createMany({
        data: seedDestination.packages.map((pkg) => ({
          destinationId: destination.id,
          title: pkg.name,
          packageType: pkg.type,
          description: pkg.description,
          priceNgn: pkg.priceNgn,
          priceUsd: pkg.priceUsd,
          isRemovable: pkg.isRemovable,
          includesVisa: pkg.type === PackageType.visa_processing,
          includesFlight: false,
          includesHotel: pkg.type === PackageType.hotel_reservation,
          includesActivities: pkg.type === PackageType.custom,
          durationDays: 1,
          maxCapacity: 1,
        })),
      });
      console.log(`  ↳ ${seedDestination.packages.length} packages seeded`);

      console.log('  ↳ Gallery images: upload via Admin Gallery (Cloudinary)');

      for (const review of seedDestination.reviews) {
        await prisma.destinationReview.create({
          data: {
            destinationId: destination.id,
            userId: null,
            authorName: review.authorName,
            rating: review.rating,
            body: review.body,
          },
        });
      }
      console.log(`  ↳ ${seedDestination.reviews.length} reviews seeded`);
    }

    console.log('\n🎉 Seed complete!');
    console.log('Admin: admin@starlings.com / Admin1234!');
    console.log('Demo:  demo@starlings.com  / Demo1234!');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
