import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Seeding Paragon Escape Games data...');

  // bcrypt hash for 'password' - generated with bcryptjs
  const passwordHash = '$2a$10$WFfq614P9lCsfE.yHtglUO3mbarJs7.7cfnbaz/.YYp2WKHr.qDaK'; // 'password'

  // Create the actual client
  const client = await prisma.client.upsert({
    where: { name: 'Paragon Escape Games' },
    update: {},
    create: { name: 'Paragon Escape Games' }
  });

  // Create the actual venue
  const venue = await prisma.venue.upsert({
    where: { clientId_name: { clientId: client.id, name: 'Paragon-Mesa' } },
    update: {},
    create: {
      clientId: client.id,
      name: 'Paragon-Mesa'
    }
  });

  // Create the actual themed escape rooms
  const pharaohs = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Pharaohs' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Pharaohs'
    }
  });

  const clockwork = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Clockwork' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Clockwork'
    }
  });

  const quantum = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Quantum' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Quantum'
    }
  });

  const haunting = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Haunting' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Haunting'
    }
  });

  // Infrastructure room for shared/system controllers
  const infrastructure = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Infrastructure' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Infrastructure'
    }
  });

  // Create admin user for the system
  await prisma.user.upsert({
    where: { email: 'admin@paragon.local' },
    update: { password_hash: passwordHash },
    create: {
      clientId: client.id,
      email: 'admin@paragon.local',
      password_hash: passwordHash,
      role: UserRole.OWNER
    }
  });

  console.log('Seeded client: Paragon Escape Games');
  console.log('Seeded venue: Paragon-Mesa');
  console.log('Seeded rooms: Pharaohs, Clockwork, Quantum, Haunting, Infrastructure');
  console.log('Seeded admin user: admin@paragon.local (password: password)');
  console.log('');
  console.log('Controllers and devices will be auto-registered via MQTT when they come online.');
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
