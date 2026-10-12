// --- Database & Local Storage Setup ---
let currentUser = JSON.parse(localStorage.getItem('hez_user')) || null;
let userAddress = JSON.parse(localStorage.getItem('hez_address')) || null;
let userOrders = JSON.parse(localStorage.getItem('hez_orders')) || [];
let cart = JSON.parse(localStorage.getItem('hez_cart')) || [];

// Secure Cloudflare Worker URL (Credentials protected in Cloudflare Secrets)
const ORDER_API_URL = "https://hezcart-order-bot.ornixteam.workers.dev";

// Merchant Payment Details
const MERCHANT_UPI = "ornixteam@oksbi";
const MERCHANT_NAME = "Hez Cart";

// Product Catalog
const products = [
    {
        id: 1,
        name: "Cyber Runner Street Shoes",
        category: "fashion",
        badge: "BESTSELLER",
        price: 2499,
        description: "Built for daily walking and running support. Breathable mesh upper, cushioned shock-absorbing sole, and reinforced stitching.",
        sizes: ["UK 7", "UK 8", "UK 9", "UK 10"],
        colors: ["Black/Cyan", "All Black", "Neon White"],
        images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80"
        ],
        reviews: [
            { user: "Rahul S.", rating: 5, comment: "Comfortable shoes and good sole grip. Matches the pictures." }
        ]
    },
    {
        id: 2,
        name: "Oversized Minimalist Black Tee",
        category: "fashion",
        badge: "FEATURED",
        price: 899,
        description: "Heavyweight 240 GSM organic cotton fabric with a clean drop-shoulder cut and double-stitched hem.",
        sizes: ["S", "M", "L", "XL"],
        colors: ["Jet Black", "Charcoal Grey"],
        images: [
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80"
        ],
        reviews: []
    },
    {
        id: 3,
        name: "Matte Black Chrono Watch",
        category: "accessories",
        badge: "POPULAR",
        price: 1799,
        description: "Precision quartz movement timepiece with scratch-resistant mineral glass and matte link bracelet.",
        sizes: ["Standard"],
        colors: ["Matte Black", "Rose Gold/Black"],
        images: [
            "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"
        ],
        reviews: []
    },
    {
        id: 4,
        name: "Minimalist Leather Wallet",
        category: "accessories",
        badge: "ESSENTIAL",
        price: 699,
        description: "Genuine leather bifold wallet with integrated RFID-blocking slots for cards and currency.",
        sizes: ["Standard"],
        colors: ["Tan Brown", "Stealth Black"],
        images: [
            "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80"
        ],
        reviews: []
    },
    {
        id: 5,
        name: "RGB Ambient LED Desk Light",
        category: "home",
        badge: "LIGHTING",
        price: 1299,
        description: "Desktop atmosphere illumination bar with customizable solid and dynamic lighting presets.",
        sizes: ["Standard"],
        colors: ["Matte Black"],
        images: [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80"
        ],
        reviews: []
    },
    {
        id: 6,
        name: "Modern Geometric Desk Organizer",
        category: "home",
        badge: "WORKSPACE",
        price: 999,
        description: "Durable multi-compartment desktop caddy for stationary, small electronics, and accessories.",
        sizes: ["Standard"],
        colors: ["Matte White", "Matte Black"],
        images: [
            "https://images.unsplash.com/photo-1595515106967-1ce2e176ff1b?auto=format&fit=crop&w=800&q=80"
        ],
        reviews: []
    }
];

let selectedSize = '';
let selectedColor = '';
let selectedRating = 5;
let pendingOrderTotal = 0;
let currentSlideIndex = 0;
let carouselInterval = null;

// Notification Toast Helper
function showToast(message) {
    const oldToast = document.getElementById('customToast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'customToast';
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#12151b',
        color: '#ffffff',
        border: '1px solid #00f0ff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.7)',
        fontSize: '13px',
        fontWeight: '600',
        zIndex: '9999',
        transition: 'opacity 0.25s ease'
    });
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

// Carousel System
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');

    slides.forEach((slide) => {
        slide.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = parseInt(slide.getAttribute('data-id'), 10);
            showProductDetail(targetId);
        });
    });

    dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const dotIndex = parseInt(dot.getAttribute('data-dot'), 10);
            goToSlide(dotIndex);
        });
    });

    startCarouselTimer();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;

    if (index >= slides.length) currentSlideIndex = 0;
    else if (index < 0) currentSlideIndex = slides.length - 1;
    else currentSlideIndex = index;

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    slides[currentSlideIndex].classList.add('active');
    if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active');

    resetCarouselTimer();
}

function startCarouselTimer() {
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
        goToSlide(currentSlideIndex + 1);
    }, 4500);
}

function resetCarouselTimer() {
    clearInterval(carouselInterval);
    startCarouselTimer();
}

function scrollToCatalog() {
    const catalogElem = document.getElementById('catalogStart');
    if (catalogElem) {
        catalogElem.scrollIntoView({ behavior: 'smooth' });
    }
}

// Input Helpers
function handlePhoneInput(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
}

function handlePinInput(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
}

function validateUtrInput(input) {
    const counterId = input.id === 'qrUtrInput' ? 'qrUtrCounter' : 'upiUtrCounter';
    const counterElem = document.getElementById(counterId);
    if (counterElem) {
        counterElem.textContent = `${input.value.length}/12`;
        counterElem.style.color = input.value.length >= 1 ? 'var(--accent-cyan)' : 'var(--text-dim)';
    }
}

function toggleMenuDropdown(event) {
    event.stopPropagation();
    document.getElementById('navDropdownMenu').classList.toggle('active');
}

window.addEventListener('click', () => {
    const menu = document.getElementById('navDropdownMenu');
    if (menu) menu.classList.remove('active');
});

function showHome() {
    document.getElementById('detailView').classList.remove('active');
    document.getElementById('pageView').classList.remove('active');
    document.getElementById('homeView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Product Details & Reviews
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('homeView').classList.remove('active');
    document.getElementById('pageView').classList.remove('active');
    document.getElementById('detailView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    selectedSize = product.sizes[0];
    selectedColor = product.colors[0];
    selectedRating = 5;

    const avgRating = product.reviews.length > 0 
        ? (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1)
        : 5.0;

    document.getElementById('productDetailContent').innerHTML = `
        <div class="gallery-section">
            <img src="${product.images[0]}" alt="${product.name}" class="main-preview-img" id="mainPreviewImg">
            ${product.images.length > 1 ? `
                <div class="thumbnail-row">
                    ${product.images.map((img, idx) => `
                        <img src="${img}" alt="Thumbnail" class="thumb-img ${idx === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <div class="details-info-section">
            <h2 class="details-title">${product.name}</h2>
            <div class="details-price-badge">
                <span class="details-price">₹${product.price}</span>
                <span class="tax-tag">Inclusive of all taxes</span>
            </div>
            <div class="details-rating">
                ${getStarIcons(avgRating)} <strong>${avgRating}</strong> <span>(${product.reviews.length} reviews)</span>
            </div>
            <p class="details-desc">${product.description}</p>
            
            <div class="variant-group">
                <h4>Select Size</h4>
                <div class="variant-options">
                    ${product.sizes.map((sz, idx) => `
                        <button class="variant-btn ${idx === 0 ? 'selected' : ''}" onclick="selectVariant('size', '${sz}', this)">${sz}</button>
                    `).join('')}
                </div>
            </div>

            <div class="variant-group">
                <h4>Select Color</h4>
                <div class="variant-options">
                    ${product.colors.map((col, idx) => `
                        <button class="variant-btn ${idx === 0 ? 'selected' : ''}" onclick="selectVariant('color', '${col}', this)">${col}</button>
                    `).join('')}
                </div>
            </div>

            <div class="action-buttons-group">
                <button class="cart-action-btn" onclick="addToCartWithOptions(${product.id})">Add to Bag</button>
                <button class="buy-now-btn" onclick="buyNowWithOptions(${product.id})">Buy Now</button>
            </div>

            <div style="margin-top: 15px; border-top: 1px solid var(--border-subtle); padding-top: 15px;">
                <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); margin-bottom: 8px;">Customer Reviews</h4>
                <div style="max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                    ${product.reviews.length === 0 ? '<p style="font-size: 12px; color: var(--text-dim);">No customer reviews available yet.</p>' : 
                        product.reviews.map(r => `
                            <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; font-size: 12px; border: 1px solid var(--border-subtle);">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${r.user}</strong>
                                    <span style="color: #f59e0b;">${getStarIcons(r.rating)}</span>
                                </div>
                                <p style="color: var(--text-muted); margin-top: 3px;">${r.comment}</p>
                            </div>
                        `).join('')}
                </div>
                
                <form onsubmit="submitProductReview(event, ${product.id})">
                    <div class="rating-picker-row">
                        <span class="rating-picker-label">Rating:</span>
                        <div class="star-rating-select" id="starPicker">
                            <i class="fa-solid fa-star active" onclick="setPickRating(1)"></i>
                            <i class="fa-solid fa-star active" onclick="setPickRating(2)"></i>
                            <i class="fa-solid fa-star active" onclick="setPickRating(3)"></i>
                            <i class="fa-solid fa-star active" onclick="setPickRating(4)"></i>
                            <i class="fa-solid fa-star active" onclick="setPickRating(5)"></i>
                        </div>
                    </div>
                    <div class="review-input-flex">
                        <input type="text" id="reviewCommentInput" placeholder="Write your review here..." required>
                        <button type="submit">Submit</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setPickRating(rating) {
    selectedRating = rating;
    const picker = document.getElementById('starPicker');
    if (!picker) return;
    const stars = picker.querySelectorAll('i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function submitProductReview(event, productId) {
    event.preventDefault();
    const input = document.getElementById('reviewCommentInput');
    const comment = input.value.trim();
    if (!comment) return;

    const product = products.find(p => p.id === productId);
    const author = currentUser ? currentUser.name : "Verified Customer";
    
    product.reviews.unshift({
        user: author,
        rating: selectedRating,
        comment: comment
    });

    input.value = '';
    showProductDetail(productId);
    showToast(`Review submitted with a ${selectedRating}-star rating.`);
}

function selectVariant(type, value, element) {
    if (type === 'size') selectedSize = value;
    if (type === 'color') selectedColor = value;
    element.parentElement.querySelectorAll('.variant-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
}

function changeMainImage(url, element) {
    document.getElementById('mainPreviewImg').src = url;
    document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

function getStarIcons(rating) {
    let output = '';
    for (let i = 1; i <= 5; i++) {
        output += i <= Math.floor(rating) ? '<i class="fa-solid fa-star"></i> ' : '<i class="fa-regular fa-star"></i> ';
    }
    return output;
}

// Category & Catalog Filtering
function filterCategory(category, element) {
    showHome();
    if (element) {
        document.querySelectorAll('.brand-card').forEach(b => b.classList.remove('active'));
        element.classList.add('active');
    }
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    renderProductCards(filtered);
}

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    renderProductCards(filtered);
}

function handleMobileSearch() {
    const q = document.getElementById('mobileSearchInput').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    renderProductCards(filtered);
}

function renderProductCards(list) {
    const grid = document.getElementById('productGrid');
    const countDisplay = document.getElementById('catalogCountDisplay');
    if (countDisplay) countDisplay.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 50px;">No products match your search query.</p>`;
        return;
    }
    grid.innerHTML = list.map(item => `
        <div class="product-card" onclick="showProductDetail(${item.id})">
            <div class="product-image-wrap">
                <img src="${item.images[0]}" alt="${item.name}" class="product-image" loading="lazy">
                <span class="product-card-badge">${item.badge || 'NEW'}</span>
            </div>
            <div class="product-info">
                <span class="product-category">${item.category}</span>
                <h3 class="product-title">${item.name}</h3>
                <div class="product-price-row">
                    <span class="product-price">₹${item.price}</span>
                    <span class="card-action-cue">View Details <i class="fa-solid fa-arrow-right"></i></span>
                </div>
            </div>
        </div>
    `).join('');
}

// Navigation from Terms Gate to Terms Page
function viewTermsFromGate() {
    const bar = document.getElementById('termsGateBar');
    const backdrop = document.getElementById('termsGateBackdrop');
    if (bar) bar.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');

    openStaticPage('terms');
}

// Policy & Static Pages
function openStaticPage(slug) {
    document.getElementById('homeView').classList.remove('active');
    document.getElementById('detailView').classList.remove('active');
    document.getElementById('pageView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const contentBox = document.getElementById('staticPageContent');
    if (slug === 'terms') {
        const hasAccepted = localStorage.getItem('hez_terms_accepted');
        contentBox.innerHTML = `
            <h2>Terms and <span>Conditions</span></h2>
            ${!hasAccepted ? `
                <div style="margin-bottom: 20px;">
                    <button type="button" class="btn-primary-block" style="width: auto; padding: 10px 18px; display: inline-flex; align-items: center; gap: 8px;" onclick="checkTermsConsent(); showHome();">
                        <i class="fa-solid fa-arrow-left"></i> Return to Accept Policies
                    </button>
                </div>
            ` : ''}
            <p style="margin-bottom: 24px; color: var(--text-muted);">
                Welcome to <strong>HEZ.CART</strong>. By accessing this store and placing orders, you agree to comply with the policies and terms outlined below.
            </p>

            <div class="terms-grid">
                <div class="terms-card">
                    <div class="terms-card-header">
                        <i class="fa-solid fa-envelope"></i>
                        <h4>1. Order Updates via Gmail</h4>
                    </div>
                    <p>
                        All official order confirmations, invoice receipts, packaging updates, and live courier tracking links are sent exclusively to your provided email address from our official account: <strong>hezcart.orders@gmail.com</strong>.
                    </p>
                    <p style="margin-top: 8px; font-size: 12px; color: var(--text-dim);">
                        Please ensure you enter a valid, active Gmail address at checkout. We do not provide phone calls or WhatsApp notifications.
                    </p>
                </div>

                <div class="terms-card">
                    <div class="terms-card-header">
                        <i class="fa-solid fa-ban"></i>
                        <h4>2. Strict No-Refund &amp; No-Return Policy</h4>
                    </div>
                    <p>
                        All sales on <strong>HEZ.CART</strong> are final. Once an order is confirmed, <strong>we do not offer cash refunds</strong> and <strong>we do not accept product returns</strong> for size or preference changes. Please check sizing, colors, and specifications before completing payment.
                    </p>
                    <p style="margin-top: 8px; font-size: 12px; color: var(--text-dim);">
                        Replacements are strictly considered only if an unedited parcel unboxing video is provided demonstrating that the product arrived defective or damaged from transit.
                    </p>
                </div>

                <div class="terms-card">
                    <div class="terms-card-header">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        <h4>3. Two-Tier Cancellation Policy</h4>
                    </div>
                    <p>
                        Cancellations must be requested via email to <strong>hezcart.orders@gmail.com</strong> with your order details and UTR. Cancellation fees apply as follows:
                    </p>
                    <div class="terms-alert-box" style="margin-bottom: 8px;">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span><strong>Cancellation Before Dispatch:</strong> A flat <strong>₹20 cancellation fee</strong> is deducted to cover payment gateway processing and administrative overheads.</span>
                    </div>
                    <div class="terms-alert-box">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span><strong>Cancellation After Dispatch:</strong> A flat <strong>₹50 cancellation fee</strong> is deducted to cover outbound courier transport and logistical handling overheads.</span>
                    </div>
                </div>

                <div class="terms-card">
                    <div class="terms-card-header">
                        <i class="fa-solid fa-truck-fast"></i>
                        <h4>4. Delivery Speed Based on Destination Address</h4>
                    </div>
                    <p>
                        Orders are shipped across India through trusted express courier partners. <strong>Delivery transit time depends entirely on your delivery address, state, and pincode infrastructure.</strong>
                    </p>
                    <p style="margin-top: 8px; font-size: 12px; color: var(--text-dim);">
                        We do not guarantee fixed-day delivery timelines. Metro destinations, regional district centers, and interior postal routes operate on differing courier logistics speeds.
                    </p>
                </div>

                <div class="terms-card">
                    <div class="terms-card-header">
                        <i class="fa-solid fa-receipt"></i>
                        <h4>5. Payment &amp; UTR Verification</h4>
                    </div>
                    <p>
                        Orders enter the fulfillment pipeline only after a valid <strong>12-digit numeric UPI Transaction Reference (UTR)</strong> matches our settlement statement. Invalid or duplicate transaction IDs are cancelled automatically.
                    </p>
                </div>
            </div>
        `;
    } else if (slug === 'about') {
        contentBox.innerHTML = `
            <h2>About <span>HEZ.CART</span></h2>
            <p><strong>Trending Finds. All in One Cart.</strong></p>
            <p style="margin-top: 8px;">HEZ.CART is a dedicated retail provider offering curated footwear, clothing, and lifestyle products built for durable day-to-day use.</p>
            <h3>Fulfillment Standards</h3>
            <p>Every product undergoes a manual inspection prior to dispatch, followed by tracked express courier shipping across India.</p>
            <h3>Official Channels</h3>
            <p>Follow our official community updates on <a href="https://www.instagram.com/hez.cart" target="_blank" style="color: var(--accent-cyan);">Instagram</a>, <a href="https://www.facebook.com/profile.php?id=61595209379143" target="_blank" style="color: var(--accent-cyan);">Facebook</a>, and our <a href="https://t.me/hezcart" target="_blank" style="color: var(--accent-cyan);">Telegram Channel</a>.</p>
        `;
    } else if (slug === 'contact') {
        contentBox.innerHTML = `
            <h2>Contact <span>Customer Support</span></h2>
            <p>For order queries, tracking verification, or product specifications, contact our team:</p>
            <h3>Email Support</h3>
            <p>hezcart.orders@gmail.com</p>
            <h3>Official Channels</h3>
            <p>Instagram: <a href="https://www.instagram.com/hez.cart" target="_blank" style="color: var(--accent-cyan);">@hez.cart</a></p>
            <p>Telegram: <a href="https://t.me/hezcart" target="_blank" style="color: var(--accent-cyan);">t.me/hezcart</a></p>
            <h3>Operating Hours</h3>
            <p>Monday to Saturday: 10:00 AM to 7:00 PM IST</p>
        `;
    } else if (slug === 'help') {
        contentBox.innerHTML = `
            <h2>Help and <span>Frequently Asked Questions</span></h2>
            <h3>How do I receive my tracking number?</h3>
            <p>Live courier tracking details and parcel updates are dispatched directly to your email address from <strong>hezcart.orders@gmail.com</strong> once your package is assigned an Airway Bill (AWB).</p>
            <h3>How do I find my 12-digit UPI UTR?</h3>
            <p>After completing payment in Google Pay, PhonePe, or Paytm, view the payment receipt in your application history and copy the 12-digit reference number labeled as UPI Transaction ID, UTR, or Ref No.</p>
            <h3>Do you offer Cash on Delivery?</h3>
            <p>No. All orders require verified advance online payment to ensure priority dispatch and handling.</p>
        `;
    }
}

// Shopping Bag Management
function addToCartWithOptions(productId) {
    const product = products.find(p => p.id === productId);
    const cartItemId = `${productId}-${selectedSize}-${selectedColor}`;
    const existing = cart.find(i => i.cartItemId === cartItemId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, cartItemId, size: selectedSize, color: selectedColor, quantity: 1 });
    }
    saveCart();
    openCartSidebar();
}

function buyNowWithOptions(productId) {
    addToCartWithOptions(productId);
    closeCartSidebar();
    checkoutOrder();
}

function updateCartQuantity(cartItemId, delta) {
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.cartItemId !== cartItemId);
    }
    saveCart();
}

function removeFromCart(cartItemId) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
    saveCart();
}

function saveCart() {
    localStorage.setItem('hez_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('cartCount').textContent = totalCount;
    const navTotalElem = document.getElementById('cartNavTotal');
    if (navTotalElem) navTotalElem.textContent = `₹${subtotal}`;

    const listContainer = document.getElementById('cartItems');
    if (cart.length === 0) {
        listContainer.innerHTML = `<p class="empty-cart">Your shopping bag is empty.</p>`;
        document.getElementById('cartTotal').textContent = `₹0`;
        return;
    }

    listContainer.innerHTML = cart.map(item => `
        <div class="cart-item-row">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <span>${item.size} | ${item.color}</span>
                <span>₹${item.price} each</span>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateCartQuantity('${item.cartItemId}', -1)">&minus;</button>
                <span style="font-size: 12px; font-weight: 700;">${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQuantity('${item.cartItemId}', 1)">&plus;</button>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.cartItemId}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');

    document.getElementById('cartTotal').textContent = `₹${subtotal}`;
}

function openCartSidebar() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeCartSidebar() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

// User Profiles & Addresses
function openAuthModal() {
    if (currentUser) {
        document.getElementById('authName').value = currentUser.name || '';
        document.getElementById('authEmail').value = currentUser.email || '';
        document.getElementById('authPhone').value = currentUser.phone || '';
    }
    document.getElementById('authModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}
function closeAuthModal() { 
    document.getElementById('authModal').classList.remove('active'); 
    document.getElementById('overlay').classList.remove('active'); 
}

function handleAuth(event) {
    event.preventDefault();
    const name = document.getElementById('authName').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const phone = document.getElementById('authPhone').value.trim();

    currentUser = { name, email, phone };
    localStorage.setItem('hez_user', JSON.stringify(currentUser));
    
    const firstName = name.split(' ')[0];
    document.getElementById('menuAccountLabel').textContent = firstName;
    const accItem = document.getElementById('menuAccountItem');
    if (accItem) accItem.textContent = name;

    closeAuthModal();
    showToast(`Profile details saved for ${name}.`);
}

function openAddressModal() {
    if (!currentUser) {
        showToast("Please enter your profile details before setting an address.");
        openAuthModal();
        return;
    }
    if (userAddress) {
        document.getElementById('addrName').value = userAddress.name || '';
        document.getElementById('addrPhone').value = userAddress.phone || '';
        document.getElementById('addrBuilding').value = userAddress.building || '';
        document.getElementById('addrRoad').value = userAddress.road || '';
        document.getElementById('addrPin').value = userAddress.pin || '';
        document.getElementById('addrCity').value = userAddress.city || '';
        document.getElementById('addrState').value = userAddress.state || '';
    } else {
        document.getElementById('addrName').value = currentUser.name || '';
        document.getElementById('addrPhone').value = currentUser.phone || '';
    }
    document.getElementById('addressModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}
function closeAddressModal() { 
    document.getElementById('addressModal').classList.remove('active'); 
    document.getElementById('overlay').classList.remove('active'); 
}

function saveAddress(event) {
    event.preventDefault();
    userAddress = {
        name: document.getElementById('addrName').value.trim(),
        phone: document.getElementById('addrPhone').value.trim(),
        building: document.getElementById('addrBuilding').value.trim(),
        road: document.getElementById('addrRoad').value.trim(),
        pin: document.getElementById('addrPin').value.trim(),
        city: document.getElementById('addrCity').value.trim(),
        state: document.getElementById('addrState').value.trim()
    };
    localStorage.setItem('hez_address', JSON.stringify(userAddress));
    closeAddressModal();
    showToast("Shipping address successfully saved.");
}

function openOrdersModal() {
    if (!currentUser) {
        showToast("Please sign in to view your order history.");
        openAuthModal();
        return;
    }
    const container = document.getElementById('ordersListContainer');
    if (userOrders.length === 0) {
        container.innerHTML = `<p class="empty-cart">No past orders found.</p>`;
    } else {
        container.innerHTML = userOrders.map((ord, idx) => `
            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); padding:14px; border-radius:8px; margin-bottom:12px; font-size:12px;">
                <div style="color:var(--accent-cyan); font-family:var(--font-heading); font-weight:700; margin-bottom:4px; font-size:13px;">
                    Order #${userOrders.length - idx} | ₹${ord.total} (${ord.paymentMethod})
                </div>
                <div style="color:var(--text-dim); margin-bottom:6px;">${ord.date}</div>
                <div style="color: #fff; line-height:1.5;">
                    ${ord.items.map(i => `${i.name} [${i.size}, ${i.color}] x${i.quantity}`).join('<br>')}
                </div>
            </div>
        `).join('');
    }
    document.getElementById('ordersModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}
function closeOrdersModal() { 
    document.getElementById('ordersModal').classList.remove('active'); 
    document.getElementById('overlay').classList.remove('active'); 
}

// Checkout Flow
function checkoutOrder() {
    if (cart.length === 0) {
        showToast("Your shopping bag is empty.");
        return;
    }
    if (!currentUser) {
        showToast("Please enter your name and phone number to continue.");
        openAuthModal();
        return;
    }
    if (!userAddress) {
        showToast("Please provide a shipping address.");
        openAddressModal();
        return;
    }

    pendingOrderTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('paymentAmountText').textContent = `₹${pendingOrderTotal}`;
    
    closeCartSidebar();
    document.getElementById('paymentModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function payWithUPIApp() {
    closePaymentModal();
    document.getElementById('upiAppModalAmount').textContent = `Total Payable: ₹${pendingOrderTotal}`;
    document.getElementById('upiAppModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}
function closeUpiAppModal() {
    document.getElementById('upiAppModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function launchUpiDeepLink() {
    const upiLink = `upi://pay?pa=${MERCHANT_UPI}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${pendingOrderTotal}&cu=INR`;
    window.location.href = upiLink;
}

function verifyUpiAppPayment() {
    const utrInput = document.getElementById('upiAppUtrInput');
    const utr = utrInput ? utrInput.value.trim() : '';
    
    if (!utr) {
        showToast("Please enter your UTR / Transaction reference.");
        return;
    }
    
    closeUpiAppModal();
    if (utrInput) utrInput.value = '';
    completeOrder("UPI App Payment", utr);
}

function openQRModal() {
    closePaymentModal();
    document.getElementById('qrModalAmount').textContent = `Total Payable: ₹${pendingOrderTotal}`;
    
    const qrContainer = document.getElementById('qrcodeContainer');
    qrContainer.innerHTML = "";
    
    const upiString = `upi://pay?pa=${MERCHANT_UPI}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${pendingOrderTotal}&cu=INR`;
    new QRCode(qrContainer, {
        text: upiString,
        width: 170,
        height: 170,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    document.getElementById('qrModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}
function closeQRModal() {
    document.getElementById('qrModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function verifyQRPayment() {
    const utrInput = document.getElementById('qrUtrInput');
    const utr = utrInput ? utrInput.value.trim() : '';
    
    if (!utr) {
        showToast("Please enter your UTR / Transaction reference.");
        return;
    }
    
    closeQRModal();
    if (utrInput) utrInput.value = '';
    completeOrder("UPI QR Scan", utr);
}

// Order Transmission & Storage (Dispatched via Cloudflare Worker)
function completeOrder(paymentMethod, utr) {
    const addr = userAddress || {
        name: currentUser ? currentUser.name : "Guest",
        phone: currentUser ? currentUser.phone : "Not Provided",
        building: "Not Provided",
        road: "Not Provided",
        city: "Not Provided",
        state: "Not Provided",
        pin: "000000"
    };

    let orderText = `NEW PAID ORDER - HEZ.CART\n`;
    orderText += `----------------------------------\n`;
    orderText += `Customer Name: ${addr.name || 'Customer'}\n`;
    orderText += `Email: ${currentUser ? currentUser.email : 'Not Provided'}\n`;
    orderText += `Phone: +91 ${addr.phone || ''}\n`;
    orderText += `Payment Method: ${paymentMethod}\n`;
    orderText += `Transaction ID / UTR: ${utr}\n`;
    orderText += `----------------------------------\n`;
    orderText += `SHIPPING ADDRESS:\n`;
    orderText += `Building: ${addr.building}\n`;
    orderText += `Area/Road: ${addr.road}\n`;
    orderText += `City: ${addr.city}\n`;
    orderText += `State: ${addr.state}\n`;
    orderText += `Pin Code: ${addr.pin}\n`;
    orderText += `----------------------------------\n`;
    orderText += `ORDERED ITEMS:\n`;
    
    cart.forEach((i, idx) => {
        orderText += `${idx + 1}. ${i.name}\n\n`;
        orderText += `- Size: ${i.size} | Color: ${i.color}\n\n`;
        orderText += `- Qty: ${i.quantity} | Price: ₹${i.price * i.quantity}\n\n`;
    });
    
    orderText += `----------------------------------\n`;
    orderText += `TOTAL AMOUNT: ₹${pendingOrderTotal}`;

    // Dispatches through your Cloudflare Worker URL
    fetch(ORDER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: orderText })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Worker Response:", data);
        if (!data.success) {
            console.error("Worker Delivery Error:", data);
        }
    })
    .catch(err => console.error("Network Error connecting to Worker:", err));

    const orderRecord = {
        items: [...cart],
        total: pendingOrderTotal,
        paymentMethod,
        utr,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    userOrders.unshift(orderRecord);
    localStorage.setItem('hez_orders', JSON.stringify(userOrders));

    cart = [];
    saveCart();

    const successTextElem = document.getElementById('successModalText');
    if (successTextElem) {
        successTextElem.innerHTML = `
            Your order of <strong>₹${pendingOrderTotal}</strong> has been confirmed.<br><br>
            Verified through <strong>${paymentMethod}</strong> (UTR: ${utr}).<br>
            Order details have been dispatched to our fulfillment queue.
        `;
    }
    
    const successModal = document.getElementById('successModal');
    const overlay = document.getElementById('overlay');
    if (successModal) successModal.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    showHome();
}

// Policy Consent Gate Logic
function toggleConsentBtn(checkbox) {
    const btn = document.getElementById('consentEnterBtn');
    if (btn) {
        btn.disabled = !checkbox.checked;
    }
}

function acceptTermsAndEnter() {
    localStorage.setItem('hez_terms_accepted', 'true');
    const bar = document.getElementById('termsGateBar');
    const backdrop = document.getElementById('termsGateBackdrop');
    
    if (bar) bar.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    
    showToast("Store terms accepted.");
}

function checkTermsConsent() {
    const isAccepted = localStorage.getItem('hez_terms_accepted');
    if (!isAccepted) {
        setTimeout(() => {
            const bar = document.getElementById('termsGateBar');
            const backdrop = document.getElementById('termsGateBackdrop');
            if (bar) bar.classList.add('active');
            if (backdrop) backdrop.classList.add('active');
        }, 1200);
    }
}

// Application Boot
document.addEventListener('DOMContentLoaded', () => {
    // 1.1s Fast Clean Splash
    const splash = document.getElementById('introSplash');
    if (splash) {
        if (!sessionStorage.getItem('hez_splash_shown')) {
            sessionStorage.setItem('hez_splash_shown', 'true');
            setTimeout(() => {
                splash.classList.add('fade-out');
            }, 1100);
        } else {
            splash.style.display = 'none';
        }
    }

    checkTermsConsent();

    if (currentUser) {
        const firstName = currentUser.name.split(' ')[0];
        document.getElementById('menuAccountLabel').textContent = firstName;
        const accItem = document.getElementById('menuAccountItem');
        if (accItem) accItem.textContent = currentUser.name;
    }
    
    updateCartUI();
    filterCategory('all', document.querySelector('.brand-card[data-cat="all"]'));
    initCarousel();
});

document.getElementById('cartBtn').addEventListener('click', openCartSidebar);
document.getElementById('closeCart').addEventListener('click', closeCartSidebar);
document.getElementById('overlay').addEventListener('click', () => {
    closeCartSidebar();
    closeAuthModal();
    closeAddressModal();
    closeOrdersModal();
    closePaymentModal();
    closeQRModal();
    closeUpiAppModal();
    closeSuccessModal();
});
document.getElementById('siteLogo').addEventListener('click', () => filterCategory('all', document.querySelector('.brand-card[data-cat="all"]')));
document.getElementById('footerLogo').addEventListener('click', () => filterCategory('all', document.querySelector('.brand-card[data-cat="all"]')));