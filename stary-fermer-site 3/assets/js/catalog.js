(() => {
  const SF = window.SF;
  if (!SF) return;

  const grid = document.querySelector('[data-catalog-grid]');
  if (!grid) return;

  const urlParams = new URLSearchParams(location.search);
  const hasCategory = categoryId => categoryId === 'all' || SF.data.categories.some(category => category.id === categoryId);
  const hasFarmer = farmerId => farmerId === 'all' || SF.data.farmers.some(farmer => farmer.id === farmerId);

  const categoryFromUrl = urlParams.get('category') || 'all';
  const farmerFromUrl = urlParams.get('farmer') || 'all';

  const state = {
    category: hasCategory(categoryFromUrl) ? categoryFromUrl : 'all',
    farmer: hasFarmer(farmerFromUrl) ? farmerFromUrl : 'all',
    search: '',
    sort: 'popular',
    maxPrice: 1000,
    ecoOnly: false,
    tag: 'all'
  };

  const categoryTarget = document.querySelector('[data-category-filters]');
  const farmerSelect = document.querySelector('[data-farmer-filter]');
  const tagTarget = document.querySelector('[data-tag-filters]');
  const searchInput = document.querySelector('[data-search]');
  const sortSelect = document.querySelector('[data-sort]');
  const maxPrice = document.querySelector('[data-max-price]');
  const maxPriceValue = document.querySelector('[data-max-price-value]');
  const ecoOnly = document.querySelector('[data-eco-only]');
  const meta = document.querySelector('[data-catalog-meta]');
  const reset = document.querySelector('[data-reset-filters]');

  function renderCategories() {
    if (!categoryTarget) return;
    const categories = [{ id: 'all', title: 'Все', emoji: '🌿' }, ...SF.data.categories];
    categoryTarget.innerHTML = categories.map(category => `
      <button type="button" data-category="${category.id}" class="${state.category === category.id ? 'active' : ''}">
        ${category.emoji || ''} ${category.title}
      </button>
    `).join('');
  }

  function renderFarmers() {
    if (!farmerSelect) return;
    const farmers = [{ id: 'all', name: 'Все фермеры' }, ...SF.data.farmers];
    farmerSelect.innerHTML = farmers.map(farmer => `
      <option value="${farmer.id}" ${state.farmer === farmer.id ? 'selected' : ''}>${farmer.name}</option>
    `).join('');
  }

  function productsForCurrentContext() {
    return SF.data.products.filter(product =>
      (state.category === 'all' || product.category === state.category) &&
      (state.farmer === 'all' || product.farmerId === state.farmer)
    );
  }

  function renderTags() {
    if (!tagTarget) return;
    const tags = ['all', ...new Set(productsForCurrentContext().flatMap(product => product.tags))];
    if (state.tag !== 'all' && !tags.includes(state.tag)) state.tag = 'all';

    const labels = { all: 'Все теги' };
    tagTarget.innerHTML = tags.map(tag => `
      <button type="button" class="tag-filter ${state.tag === tag ? 'active' : ''}" data-tag="${tag}">${labels[tag] || tag}</button>
    `).join('');
  }

  function matches(product) {
    const farmer = SF.getFarmer(product.farmerId);
    const category = SF.getCategory(product.category);
    const query = state.search.trim().toLowerCase();
    const searchable = [
      product.title,
      product.description,
      farmer?.name,
      category?.title,
      product.tags.join(' ')
    ].join(' ').toLowerCase();

    return (state.category === 'all' || product.category === state.category)
      && (state.farmer === 'all' || product.farmerId === state.farmer)
      && (!query || searchable.includes(query))
      && product.price <= state.maxPrice
      && (!state.ecoOnly || product.eco)
      && (state.tag === 'all' || product.tags.includes(state.tag));
  }

  function sortProducts(products) {
    const sorted = [...products];
    const sorters = {
      popular: (a, b) => b.rating - a.rating,
      cheap: (a, b) => a.price - b.price,
      expensive: (a, b) => b.price - a.price,
      fresh: (a, b) => Number(b.fresh.includes('сегодня')) - Number(a.fresh.includes('сегодня'))
    };
    return sorted.sort(sorters[state.sort] || sorters.popular);
  }

  function selectedContext() {
    const farmer = state.farmer !== 'all' ? SF.getFarmer(state.farmer) : null;
    const category = state.category !== 'all' ? SF.getCategory(state.category) : null;
    const parts = [];

    if (farmer) parts.push(`фермер: ${farmer.name}`);
    if (category) parts.push(`категория: ${category.title}`);
    if (state.ecoOnly) parts.push('только ЭКО');
    if (state.tag !== 'all') parts.push(`тег: ${state.tag}`);

    return parts.length ? ` Активный фильтр — ${parts.join('; ')}.` : '';
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (state.category !== 'all') params.set('category', state.category);
    if (state.farmer !== 'all') params.set('farmer', state.farmer);
    const nextUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    history.replaceState(null, '', nextUrl);
  }

  function render() {
    const products = sortProducts(SF.data.products.filter(matches));
    if (meta) {
      meta.textContent = products.length
        ? `Найдено ${products.length} позиций.${selectedContext()} Можно добавить в корзину и оформить демо-заказ.`
        : `По выбранным условиям ничего не найдено.${selectedContext()} Измените фильтры.`;
    }

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <img src="assets/img/products/herbs.svg" alt="Нет товаров">
          <h3>Нет подходящих товаров</h3>
          <p>Попробуйте выбрать другого фермера, убрать ограничение по цене, отключить ЭКО-фильтр или выбрать другую категорию.</p>
          <button class="btn" type="button" data-empty-reset>Сбросить фильтры</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(product => SF.productCard(product, { showDescription: true })).join('');
    document.dispatchEvent(new CustomEvent('sf:catalog-rendered'));
  }

  function syncControls() {
    if (searchInput) searchInput.value = state.search;
    if (sortSelect) sortSelect.value = state.sort;
    if (maxPrice) maxPrice.value = state.maxPrice;
    if (maxPriceValue) maxPriceValue.textContent = SF.money(state.maxPrice);
    if (ecoOnly) ecoOnly.checked = state.ecoOnly;
    renderCategories();
    renderFarmers();
    renderTags();
  }

  function resetFilters() {
    state.category = 'all';
    state.farmer = 'all';
    state.search = '';
    state.sort = 'popular';
    state.maxPrice = 1000;
    state.ecoOnly = false;
    state.tag = 'all';
    syncControls();
    updateUrl();
    render();
  }

  categoryTarget?.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderTags();
    updateUrl();
    render();
  });

  farmerSelect?.addEventListener('change', event => {
    state.farmer = event.target.value;
    renderTags();
    updateUrl();
    render();
  });

  tagTarget?.addEventListener('click', event => {
    const button = event.target.closest('[data-tag]');
    if (!button) return;
    state.tag = button.dataset.tag;
    renderTags();
    render();
  });

  searchInput?.addEventListener('input', event => {
    state.search = event.target.value;
    render();
  });

  sortSelect?.addEventListener('change', event => {
    state.sort = event.target.value;
    render();
  });

  maxPrice?.addEventListener('input', event => {
    state.maxPrice = Number(event.target.value);
    if (maxPriceValue) maxPriceValue.textContent = SF.money(state.maxPrice);
    render();
  });

  ecoOnly?.addEventListener('change', event => {
    state.ecoOnly = event.target.checked;
    render();
  });

  reset?.addEventListener('click', resetFilters);
  grid.addEventListener('click', event => {
    if (event.target.closest('[data-empty-reset]')) resetFilters();
  });

  document.addEventListener('sf:catalog-rendered', () => {
    if (typeof window.IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
    } else {
      setTimeout(() => document.querySelectorAll('.reveal').forEach(node => node.classList.add('visible')), 50);
    }
  });

  syncControls();
  render();
})();
