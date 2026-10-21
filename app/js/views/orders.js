/* ============================================================
 * views/orders.js — 单据列表（筛选 / 搜索 / 合计）
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

Views.orders = {
  state: { range: 'month', from: '', to: '', kw: '' },

  render() {
    const st = this.state;
    const today = todayStr();
    const [wFrom, wTo] = weekRange();
    const [mFrom, mTo] = monthRange();
    const ranges = {
      today: ['今日', today, today],
      week: ['本周', wFrom, wTo],
      month: ['本月', mFrom, mTo],
      all: ['全部', '', ''],
      custom: ['自定义', st.from, st.to],
    };
    if (st.range !== 'custom' || !st.from) {
      st.from = ranges[st.range][1]; st.to = ranges[st.range][2];
    }

    const el = document.createElement('div');
    el.className = 'view active';

    const apply = () => {
      const list = Store.listOrders({ from: st.from || undefined, to: st.to || undefined, keyword: st.kw });
      const qtySum = list.reduce((a, o) => a + o.items.reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);
      const total = Math.round(list.reduce((a, o) => a + (o.total || 0), 0) * 100) / 100;
      $('[data-role="list"]', el).innerHTML = list.length ? list.map(o => `
        <div class="list-item tri-strip" data-open="${o.id}">
          <div class="li-main">
            <div class="li-title">${esc((o.customer && o.customer.name) || '散客')}</div>
            <div class="li-sub">${esc(o.no)} · ${esc(o.date)}</div>
          </div>
          <div class="li-end">
            <div class="num">¥${fmtMoney(o.total)}</div>
            <div class="cap">${fmtNum(o.items.reduce((x, i) => x + (Number(i.qty) || 0), 0))} 件</div>
          </div>
          <span class="chevron"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
        </div>`).join('') : `
        <div class="empty"><div class="em-t">这个时间段没有单据</div><div class="em-s">换个筛选条件，或去开一张新单</div></div>`;
      $('[data-role="sum"]', el).textContent = list.length
        ? `共 ${list.length} 张 · ${fmtNum(qtySum)} 件 · ¥${fmtMoney(total)}`
        : '暂无数据';
    };

    el.innerHTML = `
      <div class="topbar">
        <h1>送货单据</h1>
        <button class="icbtn" data-act="export"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg></button>
      </div>
      <div class="seg">
        ${Object.keys(ranges).map(r => `<button data-range="${r}" class="${st.range === r ? 'on' : ''}">${ranges[r][0]}</button>`).join('')}
      </div>
      <div class="searchbar">
        <input class="input" placeholder="搜索单号 / 客户名称" data-role="kw" value="${esc(st.kw)}">
        <button class="btn btn-ghost btn-sm" data-act="clear">清空</button>
      </div>
      <div class="hidden" data-role="custom" style="display:flex;gap:8px;margin:0 16px 10px;align-items:center">
        <input type="date" data-role="from" value="${esc(st.from)}">
        <span style="color:var(--muted)">至</span>
        <input type="date" data-role="to" value="${esc(st.to)}">
      </div>
      <div style="margin:0 16px 10px;font-size:13px;color:var(--amber-deep);font-weight:600" data-role="sum"></div>
      <div class="list" data-role="list"></div>`;

    apply();

    el.addEventListener('click', e => {
      const rangeBtn = e.target.closest('[data-range]');
      if (rangeBtn) {
        st.range = rangeBtn.dataset.range;
        if (st.range === 'custom') {
          $('[data-role="custom"]', el).classList.remove('hidden');
        } else {
          $('[data-role="custom"]', el).classList.add('hidden');
          const r = ranges[st.range];
          st.from = r[1]; st.to = r[2];
          $('[data-role="from"]', el).value = st.from;
          $('[data-role="to"]', el).value = st.to;
        }
        $$('[data-range]', el).forEach(b => b.classList.toggle('on', b === rangeBtn));
        apply();
        return;
      }
      if (e.target.closest('[data-act="clear"]')) {
        st.kw = ''; $('[data-role="kw"]', el).value = '';
        apply();
        return;
      }
      if (e.target.closest('[data-act="export"]')) {
        const csv = Store.ordersCSV({ from: st.from || undefined, to: st.to || undefined, keyword: st.kw });
        downloadBlob('送货单_' + (st.from || '全部') + '.csv', new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        toast('已导出 CSV');
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) location.hash = '#/order/view?id=' + open.dataset.open;
    });
    let kwTimer = null;
    el.addEventListener('input', e => {
      if (!e.target.matches('[data-role="kw"]')) return;
      clearTimeout(kwTimer);
      kwTimer = setTimeout(() => { st.kw = e.target.value; apply(); }, 200);
    });
    el.addEventListener('change', e => {
      if (e.target.matches('[data-role="from"]')) { st.from = e.target.value; apply(); }
      if (e.target.matches('[data-role="to"]')) { st.to = e.target.value; apply(); }
    });

    return el;
  }
};
