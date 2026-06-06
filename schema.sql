-- SQL Schema for Sunniside Cornerstone Church Database

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    description TEXT,
    location VARCHAR(255),
    image_data TEXT,
    recurring_type VARCHAR(50),
    recurring_details TEXT
);

-- 2. Create Prayer Requests Table
CREATE TABLE IF NOT EXISTS prayer_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    request_text TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrations (run if database tables already exist)
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_type VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_details TEXT;

-- 3. Create Gallery Images Table
CREATE TABLE IF NOT EXISTS gallery_images (
    id SERIAL PRIMARY KEY,
    section_name VARCHAR(255) NOT NULL,
    image_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);