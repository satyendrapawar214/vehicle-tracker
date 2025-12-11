-- Users
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL
);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  id serial PRIMARY KEY,
  name text,
  api_key text UNIQUE NOT NULL
);

-- Positions (history)
CREATE TABLE IF NOT EXISTS positions (
  id serial PRIMARY KEY,
  device_id integer REFERENCES devices(id) ON DELETE SET NULL,
  vehicle_id text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  speed double precision,
  heading double precision,
  ts timestamptz NOT NULL DEFAULT now()
);

-- Latest snapshot
CREATE TABLE IF NOT EXISTS latest_positions (
  vehicle_id text PRIMARY KEY,
  device_id integer,
  lat double precision,
  lon double precision,
  speed double precision,
  ts timestamptz
);

-- Geofences
CREATE TABLE IF NOT EXISTS geofences (
  id serial PRIMARY KEY,
  name text,
  polygon text
);
