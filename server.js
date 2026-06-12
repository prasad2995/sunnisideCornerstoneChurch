const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yelaxdgdbhyidztbgekc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YNnMdH2rOXRJeITVkjBhlg_Kuy3A9hd';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching events' });
  }
});

app.post('/api/events', authenticate, async (req, res) => {
  const { title, event_date, description, location, image_data, recurring_type, recurring_details } = req.body;
  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and event date are required' });
  }
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([{ title, event_date, description, location, image_data, recurring_type, recurring_details }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating event' });
  }
});

app.delete('/api/events/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert([{ name, phone, address, request_text }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error submitting prayer request' });
  }
});

app.get('/api/prayer-requests', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('prayer_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching prayer requests' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
