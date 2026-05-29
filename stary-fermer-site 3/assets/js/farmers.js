(() => {
  const SF = window.SF;
  if (!SF) return;

  const root = document.querySelector('[data-farmers-grid]');
  if (!root) return;

  root.innerHTML = SF.data.farmers.map(farmer => {
    const products = SF.data.products.filter(product => product.farmerId === farmer.id);
    const minPrice = products.length ? Math.min(...products.map(product => product.price)) : 0;
    const preview = products.slice(0, 3).map(product => product.title).join(' · ');
    const catalogUrl = `catalog.html?farmer=${encodeURIComponent(farmer.id)}`;

    return `
      <article class="farmer-card reveal">
        <div class="farmer-cover">
          <img src="${farmer.image}" alt="${farmer.name}" loading="lazy">
        </div>
        <div class="farmer-body">
          <span class="badge">★ ${farmer.rating.toFixed(1)} · с ${farmer.since}</span>
          <h3 style="margin-top:14px">${farmer.name}</h3>
          <p>${farmer.about}</p>
          <div class="farmer-stats">
            <div><b>${products.length}</b><span>товаров</span></div>
            <div><b>${farmer.orders}</b><span>заказов</span></div>
            <div><b>${minPrice ? SF.money(minPrice) : '—'}</b><span>от</span></div>
          </div>
          <p class="mini-meta" style="margin-top:12px"><b>В каталоге:</b> ${preview || 'товары скоро появятся'}</p>
          <div class="product-meta">
            ${farmer.certificates.map(cert => `<span class="chip outline">${cert}</span>`).join('')}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
            <a class="btn small" href="${catalogUrl}">Смотреть товары</a>
            <button class="btn secondary small" type="button" data-open-modal>Задать вопрос</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  setTimeout(() => document.querySelectorAll('.reveal').forEach(node => node.classList.add('visible')), 80);
})();
