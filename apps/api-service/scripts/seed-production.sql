-- Production Seed Script for Sentient Engine
-- Run with: docker exec sentient_postgres psql -U postgres -d sentient -f /seed-production.sql
-- Or copy and paste into psql

-- Create Client (Paragon Escape Games)
INSERT INTO "Client" (id, name, created_at)
VALUES (
  gen_random_uuid()::text,
  'Paragon Escape Games',
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Get the client ID for subsequent inserts
DO $$
DECLARE
  v_client_id TEXT;
  v_venue_id TEXT;
BEGIN
  -- Get client ID
  SELECT id INTO v_client_id FROM "Client" WHERE name = 'Paragon Escape Games';

  -- Create Venue (Paragon-Mesa)
  INSERT INTO "Venue" (id, "clientId", name, created_at)
  VALUES (
    gen_random_uuid()::text,
    v_client_id,
    'Paragon-Mesa',
    NOW()
  )
  ON CONFLICT ("clientId", name) DO NOTHING;

  -- Get venue ID
  SELECT id INTO v_venue_id FROM "Venue" WHERE "clientId" = v_client_id AND name = 'Paragon-Mesa';

  -- Create Rooms
  INSERT INTO "Room" (id, "clientId", "venueId", name, created_at)
  VALUES
    (gen_random_uuid()::text, v_client_id, v_venue_id, 'Pharaohs', NOW()),
    (gen_random_uuid()::text, v_client_id, v_venue_id, 'Clockwork', NOW()),
    (gen_random_uuid()::text, v_client_id, v_venue_id, 'Quantum', NOW()),
    (gen_random_uuid()::text, v_client_id, v_venue_id, 'Haunting', NOW()),
    (gen_random_uuid()::text, v_client_id, v_venue_id, 'Infrastructure', NOW())
  ON CONFLICT ("venueId", name) DO NOTHING;

  -- Create Admin User
  -- Password hash is for 'password' using bcryptjs
  INSERT INTO "User" (id, "clientId", email, password_hash, role, created_at)
  VALUES (
    gen_random_uuid()::text,
    v_client_id,
    'admin@paragon.local',
    '$2a$10$WFfq614P9lCsfE.yHtglUO3mbarJs7.7cfnbaz/.YYp2WKHr.qDaK',
    'OWNER',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

  RAISE NOTICE 'Seed complete!';
  RAISE NOTICE 'Client: Paragon Escape Games';
  RAISE NOTICE 'Venue: Paragon-Mesa';
  RAISE NOTICE 'Rooms: Pharaohs, Clockwork, Quantum, Haunting, Infrastructure';
  RAISE NOTICE 'Admin user: admin@paragon.local (password: password)';
END $$;

-- Verify the seed worked
SELECT 'Clients:' as info;
SELECT id, name FROM "Client";

SELECT 'Venues:' as info;
SELECT id, name FROM "Venue";

SELECT 'Rooms:' as info;
SELECT id, name FROM "Room";

SELECT 'Users:' as info;
SELECT id, email, role FROM "User";
