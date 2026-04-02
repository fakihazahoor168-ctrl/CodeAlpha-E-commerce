const API_URL = 'http://localhost:3000/api';

// --- State Management ---
const state = {
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null
};

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateCartCount();
}

function updateCartCount() {
    const count = state.cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}

// --- Routing System ---
const routes = {
    'home': renderHome,
    'product-detail': renderProductDetail,
    'cart': renderCart,
    'login': renderLogin,
    'register': renderRegister,
    'orders': renderOrders
};

function navigateTo(route, params = {}) {
    window.history.pushState({ route, params }, '', `/${route === 'home' ? '' : route}`);
    loadRoute(route, params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadRoute(route, params = {}) {
    const contentDiv = document.getElementById('app-content');
    contentDiv.innerHTML = ''; // Clear current

    const template = document.getElementById(`tmpl-${route}`);
    if (template) {
        contentDiv.appendChild(template.content.cloneNode(true));
        // Ensure nav state
        setupNavigation();
        
        // Call route handler
        if (routes[route]) {
            routes[route](params);
        }
    } else if (route === 'product-detail') {
        // Special case for dynamic route
        contentDiv.appendChild(document.getElementById('tmpl-product-detail').content.cloneNode(true));
        setupNavigation();
        renderProductDetail(params);
    } else {
         navigateTo('home');
    }
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.route) {
        loadRoute(e.state.route, e.state.params);
    } else {
        // Parse URL
        handleUrlRoute();
    }
});

function handleUrlRoute() {
    const path = window.location.pathname.substring(1);
    if (!path) {
        loadRoute('home');
    } else if (path === 'cart' || path === 'login' || path === 'register' || path === 'orders') {
        loadRoute(path);
    } else if (path.startsWith('product/')) {
        const id = path.split('/')[1];
        loadRoute('product-detail', { id });
    } else {
        loadRoute('home');
    }
}

// --- UI Helpers ---
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right: 8px; color: #6366f1;"></i> ${message}`;
    toast.classList.add('show');
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function updateAuthUI() {
    const authBtn = document.getElementById('authNavBtn');
    const authText = document.getElementById('authText');
    const ordersBtn = document.getElementById('ordersNavBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (state.user) {
        authText.textContent = state.user.name;
        authBtn.href = "#";
        authBtn.onclick = (e) => e.preventDefault();
        ordersBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
    } else {
        authText.textContent = 'Login';
        authBtn.href = "/login";
        authBtn.dataset.route = "login";
        authBtn.onclick = null;
        ordersBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
    setupNavigation();
}

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        // remove old listeners to prevent duplicates
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', (e) => {
            const route = newLink.dataset.route;
            if (route) {
                e.preventDefault();
                navigateTo(route);
            }
        });
    });
}

// --- Route Handlers ---

async function renderHome() {
    const grid = document.getElementById('productGrid');
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        
        grid.innerHTML = '';
        data.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-img-wrapper" onclick="window.app.goToProduct(${product.id})">
                    <img src="${product.image}" alt="${product.name}" class="product-img">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <button class="btn add-to-cart-btn" onclick="window.app.addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image}')">
                        Add to Cart
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        document.querySelector('.scroll-to-products')?.addEventListener('click', () => {
            document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth' });
        });
        
        // Initialize Hero Slider
        if(window.app && window.app.initSlider) {
            window.app.initSlider();
        }

    } catch (error) {
        grid.innerHTML = '<p>Error loading products.</p>';
        console.error(error);
    }
}

async function renderProductDetail(params) {
    const container = document.getElementById('productDetailContainer');
    if (!params || !params.id) return navigateTo('home');

    try {
        const res = await fetch(`${API_URL}/products/${params.id}`);
        const data = await res.json();
        
        if (!data.product) throw new Error('Product not found');
        const p = data.product;

        container.innerHTML = `
            <div class="product-layout">
                <div>
                    <img src="${p.image}" alt="${p.name}" class="product-img-lg">
                </div>
                <div>
                    <h1 class="p-title">${p.name}</h1>
                    <div class="p-price">$${p.price.toFixed(2)}</div>
                    <p class="p-desc">${p.description}</p>
                    <button class="btn btn-primary" style="padding: 1rem 2rem; font-size: 1.1rem; width: 100%" 
                        onclick="window.app.addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}')">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<h2>Product not found</h2>';
    }
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (state.cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty. <a href="/" class="nav-link" data-route="home">Continue shopping</a></p>';
        setupNavigation();
        subtotalEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.onclick = null;
        return;
    }

    let total = 0;
    container.innerHTML = '';
    
    state.cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="c-img">
            <div class="c-info">
                <div class="c-name">${item.name}</div>
                <div class="c-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="c-qty">
                <button class="qty-btn" onclick="window.app.updateQty(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="window.app.updateQty(${index}, 1)">+</button>
            </div>
            <div class="c-price" style="font-weight: 600; min-width: 80px; text-align: right;">
                $${(item.price * item.quantity).toFixed(2)}
            </div>
            <button class="remove-btn" onclick="window.app.removeFromCart(${index})" title="Remove">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(el);
    });

    subtotalEl.textContent = `$${total.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;
    
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = '1';
    checkoutBtn.onclick = handleCheckout;
}

function renderLogin() {
    if (state.user) return navigateTo('home');
    
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('loginError');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                state.user = data.user;
                state.token = data.token;
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                updateAuthUI();
                showToast('Logged in successfully!');
                navigateTo('home');
            } else {
                errorMsg.textContent = data.error || 'Login failed';
            }
        } catch (err) {
            errorMsg.textContent = 'Network error occurred.';
        }
    };
}

function renderRegister() {
    if (state.user) return navigateTo('home');

    const form = document.getElementById('registerForm');
    const errorMsg = document.getElementById('regError');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast('Registration successful! Please login.');
                navigateTo('login');
            } else {
                errorMsg.textContent = data.error || 'Registration failed';
            }
        } catch (err) {
            errorMsg.textContent = 'Network error occurred.';
        }
    };
}

async function renderOrders() {
    if (!state.user) return navigateTo('login');
    const container = document.getElementById('ordersContainer');
    
    try {
        const res = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            handleLogout();
            return;
        }
        
        const data = await res.json();
        
        if (data.orders.length === 0) {
            container.innerHTML = '<p>You have no orders yet.</p>';
            return;
        }

        container.innerHTML = '';
        data.orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            const el = document.createElement('div');
            el.className = 'order-card';
            el.innerHTML = `
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-date">${date}</div>
                    </div>
                    <div>
                        <span class="order-status">${order.status}</span>
                    </div>
                </div>
                <div class="order-total">Total: $${order.total.toFixed(2)}</div>
            `;
            container.appendChild(el);
        });

    } catch (err) {
        container.innerHTML = '<p>Failed to load orders.</p>';
    }
}

// --- Actions ---

async function handleCheckout() {
    if (!state.user) {
        showToast('Please login to checkout.');
        navigateTo('login');
        return;
    }
    
    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const items = state.cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price }));

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ items, total })
        });
        
        if (res.ok) {
            state.cart = [];
            saveCart();
            showToast('Order placed successfully!');
            navigateTo('orders');
        } else if (res.status === 401 || res.status === 403) {
            showToast('Session expired. Please login again.');
            handleLogout();
        } else {
            showToast('Failed to place order.');
        }
    } catch (err) {
        showToast('Network error during checkout.');
    }
}

function handleLogout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    updateAuthUI();
    navigateTo('home');
    showToast('Logged out');
}

// Global exposure for inline handlers
window.app = {
    currentSlide: 0,
    slideInterval: null,
    initSlider: () => {
        const slides = document.querySelectorAll('.slide');
        if(slides.length === 0) return;
        clearInterval(window.app.slideInterval);
        window.app.currentSlide = 0;
        window.app.updateSliderUI();
        window.app.slideInterval = setInterval(() => { window.app.nextSlide(); }, 5000);
    },
    updateSliderUI: () => {
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');
        slides.forEach((s, i) => s.classList.toggle('active', i === window.app.currentSlide));
        dots.forEach((d, i) => d.classList.toggle('active', i === window.app.currentSlide));
    },
    nextSlide: () => {
        const slides = document.querySelectorAll('.slide');
        if(slides.length === 0) return;
        window.app.currentSlide = (window.app.currentSlide + 1) % slides.length;
        window.app.updateSliderUI();
        window.app.resetInterval();
    },
    prevSlide: () => {
        const slides = document.querySelectorAll('.slide');
        if(slides.length === 0) return;
        window.app.currentSlide = (window.app.currentSlide - 1 + slides.length) % slides.length;
        window.app.updateSliderUI();
        window.app.resetInterval();
    },
    goToSlide: (index) => {
        window.app.currentSlide = index;
        window.app.updateSliderUI();
        window.app.resetInterval();
    },
    resetInterval: () => {
        clearInterval(window.app.slideInterval);
        window.app.slideInterval = setInterval(() => { window.app.nextSlide(); }, 5000);
    },
    goToProduct: (id) => {
        window.history.pushState({ route: 'product-detail', params: { id } }, '', `/product/${id}`);
        loadRoute('product-detail', { id });
    },
    addToCart: (id, name, price, image) => {
        const existing = state.cart.find(i => i.id === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            state.cart.push({ id, name, price, image, quantity: 1 });
        }
        saveCart();
        showToast('Added to cart');
    },
    updateQty: (index, delta) => {
        const item = state.cart[index];
        item.quantity += delta;
        if (item.quantity <= 0) {
            state.cart.splice(index, 1);
        }
        saveCart();
        renderCart(); // re-render
    },
    removeFromCart: (index) => {
        state.cart.splice(index, 1);
        saveCart();
        renderCart();
    }
};

// --- Initialization ---
document.getElementById('logoutBtn').addEventListener('click', handleLogout);

window.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateCartCount();
    handleUrlRoute();
});
