import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  console.log('Seeding local data...');

  const passwordHash = await bcrypt.hash('password', 10);

  const tenant = await prisma.tenant.upsert({
    where: { name: 'Demo Tenant' },
    update: {},
    create: { name: 'Demo Tenant' }
  });

  const venue = await prisma.venue.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Main Venue' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Main Venue'
    }
  });

  await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Room A' } },
    update: {},
    create: {
      tenantId: tenant.id,
      venueId: venue.id,
      name: 'Room A'
    }
  });

  await prisma.user.upsert({
    where: { email: 'owner@demo.local' },
    update: { password_hash: passwordHash },
    create: {
      tenantId: tenant.id,
      email: 'owner@demo.local',
      password_hash: passwordHash,
      role: UserRole.OWNER
    }
  });

  console.log('Seed complete.');
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
