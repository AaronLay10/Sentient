import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Seeding local data...');

  // Simple password hash for development (in production, use bcrypt)
  const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // 'password'

  const client = await prisma.client.upsert({
    where: { name: 'Demo Client' },
    update: {},
    create: { name: 'Demo Client' }
  });

  const venue = await prisma.venue.upsert({
    where: { clientId_name: { clientId: client.id, name: 'Main Venue' } },
    update: {},
    create: {
      clientId: client.id,
      name: 'Main Venue'
    }
  });

  const roomA = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Room A' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Room A'
    }
  });

  const roomB = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Room B' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Room B'
    }
  });

  const roomC = await prisma.room.upsert({
    where: { venueId_name: { venueId: venue.id, name: 'Room C' } },
    update: {},
    create: {
      clientId: client.id,
      venueId: venue.id,
      name: 'Room C'
    }
  });

  await prisma.user.upsert({
    where: { email: 'owner@demo.local' },
    update: { password_hash: passwordHash },
    create: {
      clientId: client.id,
      email: 'owner@demo.local',
      password_hash: passwordHash,
      role: UserRole.OWNER
    }
  });

  // Seed Controllers
  // Note: Status will be computed based on last_seen in the API layer
  // - last_seen within 30s = online
  // - last_seen > 30s ago = offline
  // - last_seen = null = waiting
  const now = new Date();
  const thirtySecondsAgo = new Date(now.getTime() - 30000);
  const twoMinutesAgo = new Date(now.getTime() - 120000);

  const controllers = [
    // Online controllers (recent last_seen - will show GREEN)
    { id: 'alpha_ctrl', name: 'Alpha Controller', type: 'RPI', lastSeen: now, room: roomA.id },
    { id: 'bravo_ctrl', name: 'Bravo Controller', type: 'ESP32', lastSeen: now, room: roomA.id },
    { id: 'charlie_ctrl', name: 'Charlie Controller', type: 'RPI', lastSeen: now, room: roomB.id },
    { id: 'delta_ctrl', name: 'Delta Controller', type: 'ESP32', lastSeen: now, room: roomB.id },
    { id: 'echo_ctrl', name: 'Echo Controller', type: 'ARDUINO', lastSeen: now, room: roomC.id },
    { id: 'foxtrot_ctrl', name: 'Foxtrot Controller', type: 'RPI', lastSeen: now, room: roomC.id },
    { id: 'mike_ctrl', name: 'Mike Controller', type: 'RPI', lastSeen: now, room: roomA.id },
    { id: 'november_ctrl', name: 'November Controller', type: 'ARDUINO', lastSeen: now, room: roomB.id },
    { id: 'oscar_ctrl', name: 'Oscar Controller', type: 'ESP32', lastSeen: now, room: roomC.id },
    { id: 'papa_ctrl', name: 'Papa Controller', type: 'RPI', lastSeen: now, room: roomA.id },
    { id: 'romeo_ctrl', name: 'Romeo Controller', type: 'ESP32', lastSeen: now, room: roomC.id },
    { id: 'tango_ctrl', name: 'Tango Controller', type: 'ARDUINO', lastSeen: now, room: roomB.id },
    { id: 'victor_ctrl', name: 'Victor Controller', type: 'RPI', lastSeen: now, room: roomA.id },
    { id: 'xray_ctrl', name: 'X-ray Controller', type: 'ESP32', lastSeen: now, room: roomC.id },
    { id: 'zulu_ctrl', name: 'Zulu Controller', type: 'ARDUINO', lastSeen: now, room: roomB.id },

    // Offline controllers (old last_seen - will show RED)
    { id: 'golf_ctrl', name: 'Golf Controller', type: 'ESP32', lastSeen: twoMinutesAgo, room: roomA.id },
    { id: 'hotel_ctrl', name: 'Hotel Controller', type: 'RPI', lastSeen: twoMinutesAgo, room: roomB.id },
    { id: 'quebec_ctrl', name: 'Quebec Controller', type: 'ARDUINO', lastSeen: twoMinutesAgo, room: roomB.id },
    { id: 'uniform_ctrl', name: 'Uniform Controller', type: 'ESP32', lastSeen: twoMinutesAgo, room: roomC.id },
    { id: 'whiskey_ctrl', name: 'Whiskey Controller', type: 'ARDUINO', lastSeen: twoMinutesAgo, room: roomB.id },

    // Waiting controllers (no last_seen - will show GREY)
    { id: 'india_ctrl', name: 'India Controller', type: 'ARDUINO', lastSeen: null, room: roomC.id },
    { id: 'juliet_ctrl', name: 'Juliet Controller', type: 'ESP32', lastSeen: null, room: roomA.id },
    { id: 'kilo_ctrl', name: 'Kilo Controller', type: 'RPI', lastSeen: null, room: roomB.id },
    { id: 'lima_ctrl', name: 'Lima Controller', type: 'ESP32', lastSeen: null, room: roomC.id },
    { id: 'sierra_ctrl', name: 'Sierra Controller', type: 'RPI', lastSeen: null, room: roomA.id },
    { id: 'yankee_ctrl', name: 'Yankee Controller', type: 'RPI', lastSeen: null, room: roomA.id },
  ];

  for (const controller of controllers) {
    await prisma.controller.upsert({
      where: { id: controller.id },
      update: {
        last_seen: controller.lastSeen,
      },
      create: {
        id: controller.id,
        clientId: client.id,
        roomId: controller.room,
        friendly_name: controller.name,
        controller_type: controller.type,
        last_seen: controller.lastSeen,
        device_count: Math.floor(Math.random() * 8) + 1, // Random device count 1-8
      }
    });
  }

  console.log(`Seeded ${controllers.length} controllers`);

  // Seed some devices for the online controllers
  const deviceTypes = ['sensor', 'actuator', 'hybrid'];
  const deviceCategories = ['input', 'output', 'bidirectional'];
  const deviceNames = [
    'Temperature Sensor', 'Motion Detector', 'Door Lock', 'Light Switch',
    'Pressure Sensor', 'Relay Module', 'LCD Display', 'Keypad',
    'Smoke Detector', 'Camera', 'Speaker', 'Microphone',
    'LED Strip', 'Servo Motor', 'RFID Reader', 'Buzzer'
  ];

  let deviceIndex = 0;
  for (const controller of controllers.slice(0, 15)) { // Only for online controllers
    const deviceCount = Math.floor(Math.random() * 4) + 2; // 2-5 devices per controller

    for (let i = 0; i < deviceCount; i++) {
      const deviceName = deviceNames[deviceIndex % deviceNames.length];
      const deviceId = `${controller.id}_device_${i + 1}`;

      await prisma.device.upsert({
        where: { id: deviceId },
        update: {},
        create: {
          id: deviceId,
          controllerId: controller.id,
          clientId: client.id,
          roomId: controller.room,
          friendly_name: `${controller.name} - ${deviceName}`,
          device_type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
          device_category: deviceCategories[Math.floor(Math.random() * deviceCategories.length)],
        }
      });

      deviceIndex++;
    }
  }

  console.log(`Seeded ${deviceIndex} devices`);
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
