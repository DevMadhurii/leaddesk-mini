const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== SQLite Database =====
const db = new sqlite3.Database('./leaddesk.db');

// Create tables
db.run(`
    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        budgetRange TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'NEW',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`);

console.log('✅ SQLite Database connected!');

// ===== Helper Functions =====
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// ===== API ROUTES =====

// 1. Submit Lead
app.post('/api/leads', async (req, res) => {
    try {
        const { name, email, budgetRange, message } = req.body;
        
        const errors = [];
        if (!name || name.length < 2) errors.push('Name must be at least 2 characters');
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Valid email is required');
        if (!budgetRange) errors.push('Budget range is required');
        if (!message || message.length < 10) errors.push('Message must be at least 10 characters');
        
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const result = await runQuery(
            'INSERT INTO leads (name, email, budgetRange, message) VALUES (?, ?, ?, ?)',
            [name, email, budgetRange, message]
        );
        
        res.status(201).json({ id: result.lastID, name, email, budgetRange, message });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Get Leads (with search)
app.get('/api/leads', async (req, res) => {
    try {
        const { q } = req.query;
        let sql = 'SELECT * FROM leads';
        let params = [];
        
        if (q) {
            sql += ' WHERE name LIKE ? OR email LIKE ? OR message LIKE ?';
            const search = `%${q}%`;
            params = [search, search, search];
        }
        
        sql += ' ORDER BY createdAt DESC';
        const leads = await getQuery(sql, params);
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Update Status
app.put('/api/leads/:id/status', async (req, res) => {
    try {
        const { status } = req.query;
        if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        await runQuery('UPDATE leads SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email },
            'MY_SECRET_KEY_12345',
            { expiresIn: '7d' }
        );
        res.json({ token, email: user.email });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. Setup Admin
app.get('/api/setup', async (req, res) => {
    try {
        const users = await getQuery('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
        
        if (users.length > 0) {
            return res.json({ message: 'Admin already exists! Login: admin@example.com / admin123' });
        }
        
        const hashed = await bcrypt.hash('admin123', 10);
        await runQuery('INSERT INTO users (email, password) VALUES (?, ?)', ['admin@example.com', hashed]);
        res.json({ message: '✅ Admin created! Login: admin@example.com / admin123' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== SERVE HTML =====
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ===== START =====
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Public Form: http://localhost:${PORT}/`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/login.html`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`⚙️  Setup Admin: http://localhost:${PORT}/api/setup`);
});