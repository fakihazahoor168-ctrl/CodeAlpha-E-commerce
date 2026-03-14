const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your_super_secret_key_change_in_production';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// User Registration
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'User registered successfully!' });
        });
    } catch {
        res.status(500).json({ error: 'Error hashing password' });
    }
});

// User Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '2h' });
            res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    });
});

// Get Products
app.get('/api/products', (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ products: rows });
    });
});

// Get Single Product
app.get('/api/products/:id', (req, res) => {
    db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) return res.status(404).json({ error: "Product not found" });
        res.json({ product: row });
    });
});

// Place Order
app.post('/api/orders', authenticateToken, (req, res) => {
    const { items, total } = req.body;
    const userId = req.user.id;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "No items in order" });
    }

    db.run(`INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)`, [userId, total, 'Pending'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const orderId = this.lastID;
        const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
        
        items.forEach(item => {
            stmt.run(orderId, item.product_id, item.quantity, item.price);
        });
        
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: "Failed to save order items" });
            res.json({ message: "Order placed successfully!", orderId });
        });
    });
});

// Get User Orders
app.get('/api/orders', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ orders: rows });
    });
});

// Fallback to index.html for SPA feeling
app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
