import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Special client ID for Sentient staff (hidden from normal client lists)
const SENTIENT_CLIENT_NAME = '__SENTIENT__';

async function run() {
  console.log('Seeding database...');

  // bcrypt hash for 'password' - generated with bcryptjs
  const passwordHash = '$2a$10$WFfq614P9lCsfE.yHtglUO3mbarJs7.7cfnbaz/.YYp2WKHr.qDaK'; // 'password'

  // Create the Sentient internal client (for Sentient admin users)
  const sentientClient = await prisma.client.upsert({
    where: { name: SENTIENT_CLIENT_NAME },
    update: {},
    create: { name: SENTIENT_CLIENT_NAME }
  });

  // Create Sentient admin user (dev/test)
  await prisma.user.upsert({
    where: { email: 'admin@sentient.local' },
    update: { password_hash: passwordHash, role: UserRole.SENTIENT_ADMIN },
    create: {
      clientId: sentientClient.id,
      email: 'admin@sentient.local',
      password_hash: passwordHash,
      role: UserRole.SENTIENT_ADMIN
    }
  });

  // Create Aaron Layton - Ultimate Admin for Sentient
  const aaronPasswordHash = '$2a$10$ggw9bFC37qMOL3Qdf5DZQOaoPyyR7PDIYID6Pa2YAkDyX2U2QM85y'; // T@t0nk@-93
  await prisma.user.upsert({
    where: { email: 'aaron@sentientengine.ai' },
    update: { password_hash: aaronPasswordHash, role: UserRole.SENTIENT_ADMIN },
    create: {
      clientId: sentientClient.id,
      email: 'aaron@sentientengine.ai',
      password_hash: aaronPasswordHash,
      role: UserRole.SENTIENT_ADMIN
    }
  });

  console.log('Seeded Sentient admins:');
  console.log('  - admin@sentient.local (password: password)');
  console.log('  - aaron@sentientengine.ai');
  console.log('');

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
