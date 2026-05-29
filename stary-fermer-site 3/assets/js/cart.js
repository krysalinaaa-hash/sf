(() => {
  const SF = window.SF;
  if (!SF) return;

  const itemsRoot = document.querySelector('[data-cart-items]');
  const summaryRoot = document.querySelector('[data-cart-summary]');
  const checkout = document.querySelector('[data-checkout-form]');
  const confirmation = document.querySelector('[data-order-confirmation]');
  const slotDate = document.querySelector('[data-slot-date]');

  if (!itemsRoot || !summaryRoot) return;

  function deliveryCost(total) {
    return total >= 3000 || total === 0 ? 0 : 290;
  }

  function renderItems() {
    const cart = SF.getCart();
    if (!cart.length) {
      itemsRoot.innerHTML = `
        <div class="empty-state">
          <img src="assets/img/products/herbs.svg" alt="Пустая корзина">
          <h3>Корзина пока пустая</h3>
          <p>Добавьте продукты из каталога, затем выберите удобное окно доставки и оформите демо-заказ.</p>
          <a class="btn" href="catalog.html">Перейти в каталог</a>
        </div>
      `;
      if (checkout) checkout.style.display = 'none';
      return;
    }

    if (checkout) checkout.style.display = '';
    itemsRoot.innerHTML = cart.map(item => {
      const product = SF.getProduct(item.id);
      if (!product) return '';
      const farmer = SF.getFarmer(product.farmerId);
      return `
        <article class="cart-item" data-cart-item="${product.id}">
          <img src="${product.image}" alt="${product.title}">
          <div>
            <p class="mini-meta">${farmer ? farmer.name : 'Фермер'} · ${product.unit}</p>
            <h3>${product.title}</h3>
            <div class="product-meta">
              <span class="chip">${product.fresh}</span>
              ${product.eco ? '<span class="chip">ЭКО</span>' : ''}
            </div>
          </div>
          <div>
            <div class="price" style="margin-bottom:10px">${SF.money(product.price * item.qty)}</div>
            <div class="qty-control" aria-label="Количество товара">
              <button type="button" data-qty-minus="${product.id}">−</button>
              <span>${item.qty}</span>
              <button type="button" data-qty-plus="${product.id}">+</button>
            </div>
            <button class="btn ghost small" type="button" style="margin-top:10px" data-remove="${product.id}">Удалить</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderSummary() {
    const total = SF.cartTotal();
    const delivery = deliveryCost(total);
    const finalTotal = total + delivery;
    summaryRoot.innerHTML = `
      <h3>Итог заказа</h3>
      <div class="summary-row"><span>Товары</span><strong>${SF.money(total)}</strong></div>
      <div class="summary-row"><span>Доставка</span><strong>${delivery ? SF.money(delivery) : 'Бесплатно'}</strong></div>
      <div class="summary-row"><span>Сервисный сбор</span><strong>0 ₽</strong></div>
      <div class="summary-row total"><span>К оплате</span><strong>${SF.money(finalTotal)}</strong></div>
      <p class="help-text">Это демонстрационный заказ. Данные сохраняются только в localStorage браузера.</p>
    `;
  }

  function render() {
    renderItems();
    renderSummary();
  }

  function setMinDate() {
    if (!slotDate) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    slotDate.min = tomorrow.toISOString().split('T')[0];
    if (!slotDate.value) slotDate.value = tomorrow.toISOString().split('T')[0];
  }

  itemsRoot.addEventListener('click', event => {
    const plus = event.target.closest('[data-qty-plus]');
    const minus = event.target.closest('[data-qty-minus]');
    const remove = event.target.closest('[data-remove]');
    if (plus) {
      const item = SF.getCart().find(row => row.id === plus.dataset.qtyPlus);
      SF.setQty(plus.dataset.qtyPlus, (item?.qty || 0) + 1);
    }
    if (minus) {
      const item = SF.getCart().find(row => row.id === minus.dataset.qtyMinus);
      SF.setQty(minus.dataset.qtyMinus, (item?.qty || 1) - 1);
    }
    if (remove) {
      SF.removeFromCart(remove.dataset.remove);
      SF.showToast('Товар удалён из корзины');
    }
  });

  checkout?.addEventListener('submit', event => {
    event.preventDefault();
    const cart = SF.getCart();
    if (!cart.length) return;

    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    const total = SF.cartTotal();
    const delivery = deliveryCost(total);
    const orderNumber = 'SF-' + Date.now().toString().slice(-6);
    const order = {
      number: orderNumber,
      createdAt: new Date().toISOString(),
      customer: formData,
      items: cart,
      total,
      delivery,
      status: 'Принят в демо-режиме'
    };

    const orders = SF.storageOrders();
    orders.unshift(order);
    SF.saveOrders(orders.slice(0, 15));
    SF.clearCart();
    form.reset();
    setMinDate();

    if (confirmation) {
      confirmation.innerHTML = `
        <div class="order-card" style="padding:24px;margin-top:18px">
          <span class="badge honey">Заказ оформлен</span>
          <h3 style="margin-top:14px">Номер ${orderNumber}</h3>
          <p class="help-text">Заказ сохранён в браузере. В реальном сервисе здесь подключаются оплата, SMS/e-mail подтверждение и передача заказа фермеру.</p>
          <a class="btn" href="catalog.html">Вернуться в каталог</a>
        </div>
      `;
      confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    SF.showToast(`Заказ ${orderNumber} оформлен`);
  });

  document.addEventListener('sf:cart-changed', render);
  setMinDate();
  render();
})();
