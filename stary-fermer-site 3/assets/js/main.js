(() => {
  const CART_KEY = 'stary_farmer_cart_v1';
  const ORDERS_KEY = 'stary_farmer_orders_v1';
  const FEEDBACK_KEY = 'stary_farmer_feedback_v1';

  const data = window.SF_DATA || { products: [], farmers: [], categories: [] };

  const byId = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = value => new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' ₽';
  const getProduct = id => data.products.find(product => product.id === id);
  const getFarmer = id => data.farmers.find(farmer => farmer.id === id);
  const getCategory = id => data.categories.find(category => category.id === id);

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn('Не удалось прочитать localStorage:', error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCart() {
    return readJSON(CART_KEY, []);
  }

  function saveCart(cart) {
    writeJSON(CART_KEY, cart.filter(item => item.qty > 0));
    updateCartBadges();
    document.dispatchEvent(new CustomEvent('sf:cart-changed'));
  }

  function cartTotal(cart = getCart()) {
    return cart.reduce((sum, item) => {
      const product = getProduct(item.id);
      return product ? sum + product.price * item.qty : sum;
    }, 0);
  }

  function cartCount(cart = getCart()) {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function addToCart(productId, qty = 1) {
    const product = getProduct(productId);
    if (!product) return;

    const cart = getCart();
    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: productId, qty });
    }
    saveCart(cart);
    showToast(`«${product.title}» добавлен в корзину`);
  }

  function setQty(productId, qty) {
    const nextQty = Math.max(0, Number(qty) || 0);
    const cart = getCart().map(item => item.id === productId ? { ...item, qty: nextQty } : item);
    saveCart(cart);
  }

  function removeFromCart(productId) {
    saveCart(getCart().filter(item => item.id !== productId));
  }

  function clearCart() {
    saveCart([]);
  }

  function updateCartBadges() {
    const count = cartCount();
    all('[data-cart-count]').forEach(node => {
      node.textContent = String(count);
      node.setAttribute('aria-label', `Товаров в корзине: ${count}`);
    });
  }

  function showToast(message) {
    let toast = byId('[data-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('data-toast', '');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function productCard(product, options = {}) {
    const farmer = getFarmer(product.farmerId);
    const category = getCategory(product.category);
    const tags = [product.eco ? 'ЭКО' : null, ...product.tags].filter(Boolean);

    return `
      <article class="product-card reveal" data-product-id="${product.id}">
        <div class="product-image">
          <img src="${product.image}" alt="${product.title}" loading="lazy">
        </div>
        <div class="product-body">
          <div class="product-top">
            <div>
              <p class="mini-meta">${category ? category.emoji + ' ' + category.title : 'Фермерский продукт'}</p>
              <h3 class="product-title">${product.title}</h3>
            </div>
            <span class="chip neutral">★ ${product.rating.toFixed(1)}</span>
          </div>
          <p class="mini-meta">${farmer ? farmer.name : 'Проверенный фермер'} · ${product.fresh}</p>
          <div class="product-meta">
            ${tags.map(tag => `<span class="chip">${tag}</span>`).join('')}
          </div>
          ${options.showDescription ? `<p class="help-text">${product.description}</p>` : ''}
          <div class="price-row">
            <div class="price">${money(product.price)} <small>/ ${product.unit}</small></div>
            <button class="btn small" type="button" data-add-cart="${product.id}">В корзину</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderFeaturedProducts() {
    const target = byId('[data-featured-products]');
    if (!target) return;
    const featured = data.products.filter(product => ['milk-1', 'tomatoes-1', 'honey-1', 'bread-1', 'berries-1', 'cheese-1'].includes(product.id));
    target.innerHTML = featured.map(product => productCard(product, { showDescription: true })).join('');
    observeReveals();
  }

  function renderCategories() {
    const target = byId('[data-categories-grid]');
    if (!target) return;
    target.innerHTML = data.categories.slice(0, 4).map(category => `
      <a class="category-card reveal" href="catalog.html?category=${category.id}">
        <span class="badge light">${category.emoji} ${category.title}</span>
        <img src="${category.image}" alt="${category.title}" loading="lazy">
        <h3>${category.title}</h3>
        <p>${category.description}</p>
      </a>
    `).join('');
    observeReveals();
  }

  function initHeader() {
    const toggle = byId('[data-nav-toggle]');
    const nav = byId('[data-primary-nav]');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        document.body.classList.toggle('locked', isOpen);
      });
      nav.addEventListener('click', event => {
        if (event.target.closest('a')) {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('locked');
        }
      });
    }

    const current = location.pathname.split('/').pop() || 'index.html';
    all('[data-nav-link]').forEach(link => {
      const href = link.getAttribute('href');
      if (href === current || (current === '' && href === 'index.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function observeReveals() {
    const nodes = all('.reveal:not(.visible)');
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(node => node.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    nodes.forEach(node => observer.observe(node));
  }

  function initFAQ() {
    all('[data-faq-question]').forEach(button => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        const opened = item.classList.toggle('open');
        button.setAttribute('aria-expanded', String(opened));
      });
    });
  }

  function initDeliveryCalculator() {
    const zone = byId('[data-delivery-zone]');
    const weight = byId('[data-delivery-weight]');
    const result = byId('[data-delivery-result]');
    if (!zone || !weight || !result) return;

    const calculate = () => {
      const zoneValue = zone.value;
      const weightValue = Number(weight.value);
      const zoneMeta = {
        moscow: { price: 290, time: 'сегодня или завтра, 2-часовой слот' },
        near: { price: 390, time: 'завтра, 3-часовой слот' },
        region: { price: 590, time: '1-2 дня после комплектации' }
      }[zoneValue];
      const extra = Math.max(0, weightValue - 5) * 35;
      const finalPrice = zoneMeta.price + extra;
      result.textContent = `Стоимость доставки: ${money(finalPrice)}. Ориентировочное окно: ${zoneMeta.time}. При заказе от 3 000 ₽ доставка по Москве бесплатная.`;
    };

    zone.addEventListener('change', calculate);
    weight.addEventListener('input', calculate);
    calculate();
  }

  function initFeedbackForms() {
    all('[data-demo-form]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const formData = Object.fromEntries(new FormData(form).entries());
        const feedback = readJSON(FEEDBACK_KEY, []);
        feedback.unshift({ ...formData, createdAt: new Date().toISOString() });
        writeJSON(FEEDBACK_KEY, feedback.slice(0, 20));
        form.reset();
        showToast('Заявка сохранена в демо-режиме');
      });
    });
  }

  function initModal() {
    const modal = byId('[data-modal]');
    if (!modal) return;

    const openButtons = all('[data-open-modal]');
    const closeButtons = all('[data-close-modal]');

    const open = () => {
      modal.classList.add('open');
      document.body.classList.add('locked');
      const firstInput = modal.querySelector('input, textarea, select, button');
      if (firstInput) firstInput.focus();
    };

    const close = () => {
      modal.classList.remove('open');
      document.body.classList.remove('locked');
    };

    openButtons.forEach(button => button.addEventListener('click', open));
    closeButtons.forEach(button => button.addEventListener('click', close));
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  function storageOrders() {
    return readJSON(ORDERS_KEY, []);
  }

  function saveOrders(orders) {
    writeJSON(ORDERS_KEY, orders);
  }

  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-cart]');
    if (addButton) {
      addToCart(addButton.dataset.addCart);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    updateCartBadges();
    renderCategories();
    renderFeaturedProducts();
    observeReveals();
    initFAQ();
    initDeliveryCalculator();
    initFeedbackForms();
    initModal();
  });

  window.SF = {
    data,
    getProduct,
    getFarmer,
    getCategory,
    getCart,
    saveCart,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount,
    money,
    productCard,
    showToast,
    storageOrders,
    saveOrders,
    readJSON,
    writeJSON
  };
})();
