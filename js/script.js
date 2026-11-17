/* =========================================
   ABC Cake shop - 店舗紹介 スクリプト
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('global-nav');
  const toTop = document.querySelector('.to-top');

  /* ---------- ハンバーガーメニュー ---------- */
  const closeNav = () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });

  // メニュー内リンクをクリックしたら閉じる
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));

  // Escキーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeNav();
      navToggle.focus();
    }
  });

  // PC幅に戻ったら状態をリセット
  window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
    if (e.matches) closeNav();
  });

  /* ---------- スクロール時のヘッダー影 / トップへ戻る ---------- */
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    toTop.classList.toggle('is-visible', y > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- メニューのカテゴリ絞り込み ---------- */
  const tabs = document.querySelectorAll('.menu-tabs .tab');
  const items = document.querySelectorAll('.menu-item');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;
      items.forEach((item) => {
        const match = filter === 'all' || item.dataset.category === filter;
        item.classList.toggle('is-hidden', !match);
      });
    });
  });

  /* ---------- 予約フォーム ---------- */
  const form = document.getElementById('reserveForm');
  const dateInput = document.getElementById('reserveDate');
  const message = form.querySelector('.form-message');

  // 受取日は明日以降のみ選択可
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  dateInput.min = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    message.className = 'form-message';

    const required = form.querySelectorAll('[required]');
    let valid = true;
    required.forEach((field) => {
      const ok = field.value.trim() !== '' && field.checkValidity();
      field.classList.toggle('is-invalid', !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      message.textContent = '必須項目を正しく入力してください。（受取日は明日以降）';
      message.classList.add('is-error');
      return;
    }

    // カスタマイズケーキ以外は、カートに1つ以上必要
    if (cart.size === 0 && form.elements.type.value !== 'custom') {
      message.textContent = 'ケーキの写真をクリックして、カートへ入れてください。';
      message.classList.add('is-error');
      return;
    }

    // ※ 実運用ではここでサーバーへ送信します
    const name = form.elements.name.value.trim();
    const list = [...cart.values()].map((c) => `${c.name}×${c.qty}`).join('、');
    const cake = list ? `「${list}」の` : '';
    message.textContent = `${name} 様、${cake}ご予約を受け付けました。確認のご連絡をいたします。`;
    message.classList.add('is-success');
    form.reset();
    cart.clear();
    renderCart();
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
  });

  /* ---------- スクロールでフェードイン ---------- */
  const revealTargets = document.querySelectorAll('.section, .side-box');
  if ('IntersectionObserver' in window) {
    revealTargets.forEach((el) => el.classList.add('reveal'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealTargets.forEach((el) => observer.observe(el));
  }

  /* ---------- ケーキ画像クリック → 予約ポップアップ ---------- */
  const modal = document.getElementById('reserveModal');
  const modalImage = document.getElementById('modalImage');
  const modalCake = document.getElementById('modalCake');
  const modalPrice = document.getElementById('modalPrice');
  const modalReserve = document.getElementById('modalReserve');
  const modalCloseBtn = modal.querySelector('.modal-close');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const qtyValue = document.getElementById('qtyValue');
  const cartList = document.getElementById('cartList');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartTotal = document.getElementById('cartTotal');
  const MAX_QTY = 20;
  let currentCake = null;
  let qty = 0;
  let lastFocused = null;

  /* ---------- カート（選択中） ---------- */
  const cart = new Map(); // key: ケーキ名 → { name, price(数値), qty }
  const yen = (n) => `¥${n.toLocaleString('ja-JP')}`;

  const renderCart = () => {
    cartList.innerHTML = '';
    let total = 0;
    cart.forEach((c) => {
      total += c.price * c.qty;
      const li = document.createElement('li');
      const nameEl = document.createElement('span');
      nameEl.className = 'cart-name';
      nameEl.textContent = `${c.name} × ${c.qty}`;
      const sub = document.createElement('span');
      sub.className = 'cart-sub';
      sub.textContent = yen(c.price * c.qty);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cart-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `${c.name}をカートから削除`);
      remove.addEventListener('click', () => {
        cart.delete(c.name);
        renderCart();
      });
      li.append(nameEl, sub, remove);
      cartList.append(li);
    });
    cartEmpty.hidden = cart.size > 0;
    cartTotal.hidden = cart.size === 0;
    cartTotal.textContent = `合計 ${yen(total)}`;
  };
  renderCart();

  /* ---------- 数量の増減 ---------- */
  const setQty = (n) => {
    qty = Math.min(MAX_QTY, Math.max(0, n));
    qtyValue.textContent = qty;
    qtyMinus.disabled = qty === 0;
    qtyPlus.disabled = qty === MAX_QTY;
    modalReserve.disabled = qty === 0;
  };
  qtyMinus.addEventListener('click', () => setQty(qty - 1));
  qtyPlus.addEventListener('click', () => setQty(qty + 1));

  const openModal = (item) => {
    const img = item.querySelector('.menu-thumb img');
    const priceText = item.querySelector('.price').textContent;
    currentCake = {
      name: item.querySelector('h3').textContent,
      priceText,
      price: Number(priceText.replace(/[^0-9]/g, '')),
    };
    modalImage.src = img.src;
    modalImage.alt = currentCake.name;
    modalCake.textContent = currentCake.name;
    modalPrice.textContent = priceText;
    setQty(0);

    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-modal-open');
    modalCloseBtn.focus();
  };

  const closeModal = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('is-modal-open');
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  };

  // ケーキ画像をクリック（キーボードでは Enter / Space）で開く
  document.querySelectorAll('.menu-item').forEach((item) => {
    const thumb = item.querySelector('.menu-thumb');
    const name = item.querySelector('h3').textContent;
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('aria-label', `${name}を予約する`);

    thumb.addEventListener('click', () => openModal(item));
    thumb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item);
      }
    });
  });

  // 閉じるボタン（右上の×・「やめる」）と背景クリックで閉じる
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));

  // Escキーで閉じる / Tabキーのフォーカスをポップアップ内に留める
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = modal.querySelectorAll('button');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // 「カートへ入れる」→ 選択中に追加し、予約フォームへ移動
  modalReserve.addEventListener('click', () => {
    if (!currentCake || qty === 0) return;
    const existing = cart.get(currentCake.name);
    if (existing) {
      existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    } else {
      cart.set(currentCake.name, { name: currentCake.name, price: currentCake.price, qty });
    }
    renderCart();
    lastFocused = null;
    closeModal();

    const reserveBox = document.getElementById('reserve');
    reserveBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    reserveBox.classList.remove('is-highlight');
    void reserveBox.offsetWidth; // アニメーションを再実行するため
    reserveBox.classList.add('is-highlight');
    form.elements.name.focus({ preventScroll: true });
  });

  /* ---------- コピーライト年 ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
});
