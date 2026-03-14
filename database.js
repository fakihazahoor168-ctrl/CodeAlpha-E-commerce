const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price REAL,
            image TEXT
        )`, (err) => {
            if (!err) {
                // Seed initial products if empty
                db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                    if (row && row.count === 0) {
                        const stmt = db.prepare("INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)");
                        stmt.run("Premium Wireless Headphones", "Experience immersive sound with our industry-leading noise cancelling headphones.", 299.99, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop");
                        stmt.run("Minimalist Smartwatch", "Stay connected in style with this elegant, feature-rich smartwatch.", 199.50, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop");
                        stmt.run("Ergonomic Mechanical Keyboard", "Boost your productivity with tactile feedback and programmable keys.", 149.00, "https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=800&auto=format&fit=crop");
                        stmt.run("Ultra-Slim Laptop Stand", "Improve your posture with this premium aluminum laptop stand.", 45.00, "https://images.unsplash.com/photo-1621255740708-2e0084f6dcc3?q=80&w=800&auto=format&fit=crop");
                        stmt.run("Noise-Isolating Earbuds", "Compact earbuds with deep bass and an all-day comfortable fit.", 89.99, "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=800&auto=format&fit=crop");
                        stmt.run("Portable Power Bank 20000mAh", "Never run out of battery again with this high-capacity, fast-charging power bank.", 59.90, "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=800&auto=format&fit=crop");
                        stmt.finalize();
                    }
                });
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            total REAL,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            price REAL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);
    }
});

module.exports = db;
