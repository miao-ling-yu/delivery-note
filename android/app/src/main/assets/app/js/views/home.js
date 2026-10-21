/* ============================================================
 * views/home.js — 工作台
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

Views.home = {
  render() {
    const el = document.createElement('div');
    el.className = 'view active';
    const s = Store.getSettings();
    const today = todayStr();
    const [wFrom, wTo] = weekRange();
    const [mFrom, mTo] = monthRange();
    const sum = (arr, fn) => arr.reduce((a, o) => a + (fn(o) || 0), 0);
    const todayOrders = Store.listOrders({ from: today, to: today });
    const todayAmt = sum(todayOrders, o => o.total);
    const monthOrders = Store.listOrders({ from: mFrom, to: mTo });
    const monthAmt = sum(monthOrders, o => o.total);
    const weekAmt = sum(Store.listOrders({ from: wFrom, to: wTo }), o => o.total);
    const recent = Store.listOrders().slice(0, 5);
    const cnt = Store.countAll();

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 6) return '夜深了';
      if (h < 9) return '早上好';
      if (h < 12) return '上午好';
      if (h < 14) return '中午好';
      if (h < 18) return '下午好';
      return '晚上好';
    })();
    const name = s.operator || '老板';

    el.innerHTML = `
      <div class="topbar">
        <h1>${esc(greeting)}，${esc(name)}</h1>
        <span class="sub">${esc(today)}</span>
      </div>
      <div class="pad" style="padding-top:4px">
        <div class="stat-cards">
          <div class="stat-card amber">
            <div class="sc-num">${todayOrders.length}</div>
            <div class="sc-lab">今日单据</div>
          </div>
          <div class="stat-card blue">
            <div class="sc-num">${fmtMoney(todayAmt)}</div>
            <div class="sc-lab">今日金额</div>
          </div>
          <div class="stat-card red">
            <div class="sc-num">${fmtMoney(monthAmt)}</div>
            <div class="sc-lab">本月金额</div>
          </div>
        </div>

        <button class="btn btn-primary btn-block" style="min-height:52px;font-size:16px;border-radius:14px;box-shadow:0 4px 14px rgba(217,154,43,.4)" data-go="order">
          开 送 货 单
        </button>

        <div class="section-title">快捷入口</div>
        <div class="card">
          <div class="card-bd" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:12px">
            ${[
              ['orders', '单据', cnt.orders + ' 张'],
              ['stats', '统计', weekAmt ? fmtMoney(weekAmt) : '本周'],
            ].map(([go, t, sub]) => `
              <button class="quick" data-go="${go}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:10px">
                <span style="font-size:14px;font-weight:700">${t}</span>
                <span style="font-size:11px;color:var(--muted)">${sub}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="section-title">基础资料</div>
        <div class="list">
          <div class="list-item" data-go="customers">
            <div class="li-main">
              <div class="li-title">客户管理</div>
              <div class="li-sub">维护客户名称、电话、地址</div>
            </div>
            <div class="li-end"><div class="num" style="font-size:13px;color:var(--muted)">${cnt.customers} 个</div></div>
            <span class="chevron"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
          </div>
          <div class="list-item" data-go="products">
            <div class="li-main">
              <div class="li-title">商品管理</div>
              <div class="li-sub">维护商品名称、规格、单价</div>
            </div>
            <div class="li-end"><div class="num" style="font-size:13px;color:var(--muted)">${cnt.products} 个</div></div>
            <span class="chevron"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
          </div>
        </div>

        <div class="section-title">最近单据 <span style="margin-left:auto;letter-spacing:0" data-go="orders" style="cursor:pointer">全部 ›</span></div>
        ${recent.length ? `
        <div class="list">
          ${recent.map(o => `
            <div class="list-item tri-strip" data-open="${o.id}">
              <div class="li-main">
                <div class="li-title">${esc((o.customer && o.customer.name) || '散客')}</div>
                <div class="li-sub">${esc(o.no)} · ${esc(o.date)} · ${(o.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0)} 件</div>
              </div>
              <div class="li-end"><div class="num">¥${fmtMoney(o.total)}</div></div>
              <span class="chevron"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
            </div>`).join('')}
        </div>` : `
        <div class="card"><div class="empty" style="padding:30px 16px">
          <div class="em-t">还没有送货单</div>
          <div class="em-s">点上方「开送货单」开始录入第一张单</div>
        </div></div>`}
      </div>`;

    el.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go) { location.hash = '#/' + go.dataset.go; return; }
      const open = e.target.closest('[data-open]');
      if (open) { location.hash = '#/order/view?id=' + open.dataset.open; }
    });
    return el;
  }
};
