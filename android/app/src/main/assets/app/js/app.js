/* ============================================================
 * app.js — 入口 / 路由 / 底部导航 / 返回栈
 * ============================================================ */
'use strict';

(function () {
  const container = $('#view-container');
  const TABS = { home: 'home', order: 'order', orders: 'orders', stats: 'stats', settings: 'settings' };
  const TAB_ROUTE = { home: '#/home', order: '#/order/new', orders: '#/orders', stats: '#/stats', settings: '#/settings' };
  const ROUTE_TAB = {
    '#/home': 'home', '#/orders': 'orders', '#/stats': 'stats',
    '#/customers': 'home', '#/products': 'home', '#/settings': 'settings',
  };
  const historyStack = [];

  function parseHash(hash) {
    const h = (hash || '#/home').replace(/^#/, '') || '/home';
    const [path, queryStr] = h.split('?');
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, params };
  }

  function route() {
    const { path, params } = parseHash(location.hash);
    let viewName = null;
    let tab = null;
    let view = null;

    if (path === '/home' || path === '/' || path === '') { viewName = 'home'; tab = 'home'; }
    else if (path === '/order/new' || path === '/order') { viewName = 'order'; tab = 'order'; }
    else if (path === '/order/edit') { viewName = 'order'; tab = 'order'; params.id && (params.id = params.id); }
    else if (path === '/order/view') { viewName = 'order'; tab = 'orders'; }
    else if (path === '/orders') { viewName = 'orders'; tab = 'orders'; }
    else if (path === '/stats') { viewName = 'stats'; tab = 'stats'; }
    else if (path === '/customers') { viewName = 'customers'; tab = 'home'; }
    else if (path === '/products') { viewName = 'products'; tab = 'home'; }
    else if (path === '/settings') { viewName = 'settings'; tab = 'settings'; }
    else if (path === '/print') { viewName = 'print'; tab = 'orders'; }
    else if (path === '/bill') { viewName = 'bill'; tab = 'stats'; }
    else { viewName = 'home'; tab = 'home'; }

    if (!ROUTE_TAB['#' + path]) ROUTE_TAB['#' + path] = tab;
    if (Views[viewName]) view = Views[viewName].render(params);

    if (!view) { viewName = 'home'; view = Views.home.render({}); tab = 'home'; }

    container.innerHTML = '';
    container.appendChild(view);
    setTab(tab);
    window.scrollTo(0, 0);

    const key = location.hash || '#/home';
    if (historyStack[historyStack.length - 1] !== key) historyStack.push(key);
    if (historyStack.length > 60) historyStack.shift();
  }

  function setTab(tab) {
    $$('#tabbar .tab-item').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  }

  /* Android 返回键：优先回退应用内路由 */
  window.__appBack = function () {
    if (historyStack.length > 1) {
      historyStack.pop();
      const target = historyStack[historyStack.length - 1];
      historyStack.pop();
      location.hash = target;
    } else {
      const cur = (location.hash || '#/home').replace(/^#/, '');
      if (cur !== '/home') location.hash = '#/home';
      else if (window.Android && window.Android.exitApp) window.Android.exitApp();
      else history.back();
    }
    return true;
  };

  /* 底部导航 */
  $('#tabbar').addEventListener('click', e => {
    const tab = e.target.closest('.tab-item');
    if (!tab) return;
    const key = tab.dataset.tab;
    location.hash = TAB_ROUTE[key] || '#/home';
  });

  window.addEventListener('hashchange', route);
  route();
})();
