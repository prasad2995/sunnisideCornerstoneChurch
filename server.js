const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Connection
const connectionString = 'postgresql://neondb_owner:npg_SjMo7p4tWdQV@ep-super-mouse-ab7uyr5w-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const pool = new Pool({
  connectionString: connectionString,
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Auto-initialize Database Tables
const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        event_date TIMESTAMP NOT NULL,
        description TEXT,
        location VARCHAR(255)
      )
    `);

    // Create prayer_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prayer_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        request_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  } finally {
    if (client) client.release();
  }
};

initDb();

// Hardcoded Admin Credentials
const ADMIN_USER = 'admin@sunnisidecornerstonechurch.org.uk';
const ADMIN_PASS = 'Admin123';

// Simple check authorization middleware (using standard basic auth headers or custom query/headers)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = Buffer.from(token, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid credentials' });
  }
};

// Route for /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Routes

// 1. Authenticate Admin
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
});

// 2. Events Endpoints
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY event_date ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching events' });
  }
});

app.post('/api/events', authenticate, async (req, res) => {
  const { title, event_date, description, location } = req.body;
  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and event date are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO events (title, event_date, description, location) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, event_date, description, location]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating event' });
  }
});

app.delete('/api/events/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error deleting event' });
  }
});

// 3. Prayer Requests Endpoints
app.post('/api/prayer-requests', async (req, res) => {
  const { name, phone, address, request_text } = req.body;
  if (!name || !request_text) {
    return res.status(400).json({ error: 'Name and Prayer request text are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO prayer_requests (name, phone, address, request_text) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, address, request_text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error submitting prayer request' });
  }
});

app.get('/api/prayer-requests', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prayer_requests ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching prayer requests' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
