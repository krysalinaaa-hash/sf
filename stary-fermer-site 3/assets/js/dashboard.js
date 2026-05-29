(() => {
  const SF = window.SF;
  if (!SF) return;

  const PRODUCT_KEY = 'stary_farmer_custom_products_v1';
  const productRoot = document.querySelector('[data-dashboard-products]');
  const orderRoot = document.querySelector('[data-dashboard-orders]');
  const form = document.querySelector('[data-product-form]');
  const stats = document.querySelector('[data-dashboard-stats]');

  const readCustomProducts = () => SF.readJSON(PRODUCT_KEY, []);
  const saveCustomProducts = value => SF.writeJSON(PRODUCT_KEY, value);

  function demoOrders() {
    const orders = SF.storageOrders();
    const mapped = orders.map(order => ({
      number: order.number,
      customer: order.customer.name || 'Покупатель',
      slot: `${order.customer.date || 'дата'} · ${order.customer.time || 'слот'}`,
      total: order.total + order.delivery,
      status: order.status
    }));

    return [
      ...mapped,
      { number: 'SF-104582', customer: 'Анна К.', slot: '14.05 · 10:00-12:00', total: 3260, status: 'Комплектуется' },
      { number: 'SF-104583', customer: 'Мария П.', slot: '14.05 · 16:00-18:00', total: 2140, status: 'Ждёт подтверждения' },
      { number: 'SF-104584', customer: 'Елена С.', slot: '15.05 · 12:00-14:00', total: 4890, status: 'Готов к передаче' }
    ].slice(0, 7);
  }

  function renderStats() {
    if (!stats) return;
    const orders = demoOrders();
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const custom = readCustomProducts().length;
    stats.innerHTML = `
      <div class="panel-stat"><b>${orders.length}</b><span>заказов в работе</span></div>
      <div class="panel-stat"><b>${SF.money(revenue)}</b><span>демо-выручка</span></div>
      <div class="panel-stat"><b>${custom}</b><span>добавлено товаров</span></div>
    `;
  }

  function renderProducts() {
    if (!productRoot) return;
    const products = readCustomProducts();
    if (!products.length) {
      productRoot.innerHTML = `
        <div class="empty-state" style="padding:22px">
          <h3>Пока нет добавленных товаров</h3>
          <p>Заполните форму слева — позиция появится в демо-кабинете производителя.</p>
        </div>
      `;
      return;
    }

    productRoot.innerHTML = products.map(product => `
      <article class="mini-product" data-custom-product="${product.id}">
        <img src="assets/img/products/${product.image}" alt="${product.title}">
        <div>
          <h4>${product.title}</h4>
          <p class="mini-meta">${product.category} · ${product.freshness}</p>
        </div>
        <div style="text-align:right">
          <strong>${SF.money(product.price)}</strong>
          <button class="btn ghost small" type="button" data-delete-custom="${product.id}" style="margin-top:8px">Удалить</button>
        </div>
      </article>
    `).join('');
  }

  function renderOrders() {
    if (!orderRoot) return;
    const rows = demoOrders();
    orderRoot.innerHTML = rows.map(order => `
      <tr>
        <td data-label="Заказ"><strong>${order.number}</strong></td>
        <td data-label="Клиент">${order.customer}</td>
        <td data-label="Окно">${order.slot}</td>
        <td data-label="Сумма">${SF.money(order.total)}</td>
        <td data-label="Статус"><span class="chip">${order.status}</span></td>
      </tr>
    `).join('');
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const product = {
      id: 'custom-' + Date.now(),
      title: formData.title,
      price: Number(formData.price),
      category: formData.category,
      freshness: formData.freshness,
      image: formData.image || 'herbs.svg'
    };
    const products = readCustomProducts();
    products.unshift(product);
    saveCustomProducts(products.slice(0, 12));
    form.reset();
    renderProducts();
    renderStats();
    SF.showToast('Товар добавлен в демо-кабинет');
  });

  productRoot?.addEventListener('click', event => {
    const button = event.target.closest('[data-delete-custom]');
    if (!button) return;
    const products = readCustomProducts().filter(product => product.id !== button.dataset.deleteCustom);
    saveCustomProducts(products);
    renderProducts();
    renderStats();
    SF.showToast('Товар удалён');
  });

  renderProducts();
  renderOrders();
  renderStats();
})();
