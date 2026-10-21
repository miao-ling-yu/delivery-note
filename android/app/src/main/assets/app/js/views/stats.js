/* ============================================================
 * views/stats.js — 统计报表（汇总 / 趋势 / 客户排行 / 商品排行）
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

/* 月度账单辅助 */
function billTitleFor(customerName, ym) {
  const s = Store.getSettings();
  const tpl = s.billTitle || '{year}年{customer}与{company}{month}月账单';
  const y = ym.slice(0, 4), m = String(+ym.slice(5, 7));
  let out = tpl.replace(/\{year\}/g, y).replace(/\{month\}/g, m).replace(/\{customer\}/g, customerName);
  const comp = s.company || '';
  if (comp) out = out.replace(/\{company\}/g, comp);
  else out = out.replace(/与\{company\}/g, '').replace(/\{company\}/g, '');
  return out;
}
function billRowsOf(group) {
  const rows = [];
  group.orders.forEach(o => o.items.forEach(i => {
    rows.push([o.date, (i.name || '') + (i.spec ? ' ' + i.spec : ''), Number(i.qty) || 0, Number(i.price) || 0, i.amount || 0, i.remark || '']);
  }));
  return rows;
}
function exportBillXlsx(ym, key, name) {
  const g = Store.billGroups(ym).find(x => String(x.key) === String(key));
  if (!g) { toast('未找到账单', true); return; }
  const rows = billRowsOf(g);
  const total = Math.round(rows.reduce((a, r) => a + (r[4] || 0), 0) * 100) / 100;
  const bytes = Xlsx.build([{ name: name.slice(0, 31), title: billTitleFor(name, ym), headers: ['日期', '产品名称', '数量', '单价', '金额', '备注'], rows: rows, widths: [12, 26, 10, 10, 12, 20], footer: ['', '合计', '', '', total, ''] }]);
  downloadBlob('账单_' + name + '_' + ym + '.xlsx', xlsxBlob(bytes));
  toast('已导出 ' + name);
}
function exportAllBills(ym) {
  const groups = Store.billGroups(ym);
  if (!groups.length) { toast('该月暂无账单', true); return; }
  const sheets = groups.map(g => {
    const rows = billRowsOf(g);
    const total = Math.round(rows.reduce((a, r) => a + (r[4] || 0), 0) * 100) / 100;
    return { name: g.name.slice(0, 31), title: billTitleFor(g.name, ym), headers: ['日期', '产品名称', '数量', '单价', '金额', '备注'], rows: rows, widths: [12, 26, 10, 10, 12, 20], footer: ['', '合计', '', '', total, ''] };
  });
  downloadBlob('月度账单_' + ym + '.xlsx', xlsxBlob(Xlsx.build(sheets)));
  toast('已导出 ' + groups.length + ' 位客户账单');
}

Views.stats = {
  state: { range: 'month', from: '', to: '', billYm: '' },

  render() {
    const st = this.state;
    const today = todayStr();
    const [wFrom, wTo] = weekRange();
    const [mFrom, mTo] = monthRange();
    const yFrom = today.slice(0, 4) + '-01-01';
    const ranges = {
      today: ['今日', today, today],
      week: ['本周', wFrom, wTo],
      month: ['本月', mFrom, mTo],
      year: ['本年', yFrom, today],
      custom: ['自定义', st.from, st.to],
    };
    if (st.range !== 'custom' || !st.from) {
      st.from = ranges[st.range][1]; st.to = ranges[st.range][2];
    }

    const el = document.createElement('div');
    el.className = 'view active';

    const compute = () => {
      const list = Store.listOrders({ from: st.from || undefined, to: st.to || undefined });
      const orders = list.length;
      const qtySum = list.reduce((a, o) => a + o.items.reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);
      const total = Math.round(list.reduce((a, o) => a + (o.total || 0), 0) * 100) / 100;
      const custSet = new Set(list.filter(o => o.customer && o.customer.id).map(o => o.customer.id));
      // 按日趋势
      const dayMap = {};
      list.forEach(o => { dayMap[o.date] = (dayMap[o.date] || 0) + (o.total || 0); });
      // 客户排行
      const custMap = {};
      list.forEach(o => {
        const key = (o.customer && o.customer.name) || '散客';
        custMap[key] = (custMap[key] || 0) + (o.total || 0);
      });
      // 商品排行
      const prodMap = {};
      list.forEach(o => o.items.forEach(i => {
        const key = i.name + (i.spec ? ' ' + i.spec : '');
        prodMap[key] = (prodMap[key] || 0) + (i.amount || 0);
      }));
      const custRank = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const prodRank = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
      // 趋势日期轴（日范围内去重升序，最多取30个点）
      let days = Object.keys(dayMap).sort();
      if (days.length > 30) days = days.slice(days.length - 30);
      return { orders, qtySum, total, customers: custSet.size, dayMap, days, custRank, prodRank };
    };

    const render = () => {
      const d = compute();
      const maxDay = Math.max(1, ...d.days.map(x => d.dayMap[x]));
      const trendHtml = d.days.length
        ? `<div class="bar-trend">${d.days.map(day => `
            <div class="bt-col" title="${day} ¥${fmtMoney(d.dayMap[day])}">
              <div class="bt-bar" style="height:${Math.max(2, Math.round(d.dayMap[day] / maxDay * 100))}%"></div>
              <div class="bt-x">${shortDate(day)}</div>
            </div>`).join('')}</div>
           <div class="tip">近 ${d.days.length} 天销售额趋势（点击图例可看单日数据）</div>`
        : `<div class="empty" style="padding:26px 0"><div class="em-s">该时间段暂无销售数据</div></div>`;

      const rankHtml = (rank, cls) => {
        if (!rank.length) return `<div class="empty" style="padding:22px 0"><div class="em-s">暂无数据</div></div>`;
        const max = rank[0][1] || 1;
        return `<div class="hbar">${rank.map(([name, v]) => `
          <div class="hb-row ${cls}">
            <div class="hb-name" title="${esc(name)}">${esc(name)}</div>
            <div class="hb-track"><div class="hb-fill" style="width:${Math.max(2, Math.round(v / max * 100))}%"></div></div>
            <div class="hb-num">${fmtMoney(v)}</div>
          </div>`).join('')}</div>`;
      };

      $('[data-role="trend"]', el).innerHTML = trendHtml;
      $('[data-role="custRank"]', el).innerHTML = rankHtml(d.custRank, '');
      $('[data-role="prodRank"]', el).innerHTML = rankHtml(d.prodRank, 'blue');
      $('[data-role="c1"]', el).textContent = d.orders;
      $('[data-role="c2"]', el).textContent = fmtNum(d.qtySum);
      $('[data-role="c3"]', el).textContent = '¥' + fmtMoney(d.total);
      $('[data-role="c4"]', el).textContent = d.customers;
      $('[data-role="range"]', el).textContent = (st.from || '全部') + ' 至 ' + (st.to || '全部');
      const ym = st.billYm || todayStr().slice(0, 7);
      $('[data-role="billYm"]', el).value = ym;
      const groups = Store.billGroups(ym);
      $('[data-role="billList"]', el).innerHTML = groups.length ? groups.map(g => `
        <div style="display:flex;align-items:center;gap:8px;padding:10px 2px;border-bottom:1px dashed var(--line)">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">${esc(g.name)}</div>
            <div style="font-size:11px;color:var(--muted)">${g.orders.length} 单 · ${fmtMoney(g.total)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-bill-key="${esc(g.key)}" data-bill-name="${esc(g.name)}" data-bill-go="1">预览</button>
          <button class="btn btn-ghost btn-sm" data-bill-key="${esc(g.key)}" data-bill-name="${esc(g.name)}" data-bill-x="1">Excel</button>
        </div>`).join('')
        : `<div class="empty" style="padding:22px 0"><div class="em-s">${ym} 暂无账单数据</div></div>`;
    };

    el.innerHTML = `
      <div class="topbar">
        <h1>数据统计</h1>
        <button class="icbtn" data-act="export"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg></button>
      </div>
      <div class="seg">
        ${Object.keys(ranges).map(r => `<button data-range="${r}" class="${st.range === r ? 'on' : ''}">${ranges[r][0]}</button>`).join('')}
      </div>
      <div class="hidden" data-role="custom" style="display:flex;gap:8px;margin:0 16px 10px;align-items:center">
        <input type="date" data-role="from" value="${esc(st.from)}">
        <span style="color:var(--muted)">至</span>
        <input type="date" data-role="to" value="${esc(st.to)}">
      </div>
      <div style="margin:0 16px 10px;font-size:12px;color:var(--muted)" data-role="range"></div>
      <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card amber"><div class="sc-num" data-role="c1">0</div><div class="sc-lab">单据数</div></div>
        <div class="stat-card blue"><div class="sc-num" data-role="c2">0</div><div class="sc-lab">件数</div></div>
        <div class="stat-card red"><div class="sc-num" data-role="c3">¥0</div><div class="sc-lab">销售额</div></div>
        <div class="stat-card"><div class="sc-num" data-role="c4">0</div><div class="sc-lab">客户数</div></div>
      </div>
      <div class="chart-card"><h3>销售趋势</h3><div data-role="trend"></div></div>
      <div class="chart-card"><h3>客户销售排行</h3><div data-role="custRank"></div></div>
      <div class="chart-card"><h3>商品销售排行</h3><div data-role="prodRank"></div></div>
      <div class="chart-card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
          <h3 style="margin:0">月度账单</h3>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="month" data-role="billYm" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:#fff;color:var(--text)">
            <button class="btn btn-ghost btn-sm" data-act="bill-all">全部导出</button>
          </div>
        </div>
        <div data-role="billList"></div>
        <div class="hint" style="padding:8px 2px 0;font-size:11px;color:var(--muted)">账单标题在「设置」里按模板生成，可自定义为：{year}年{customer}与{company}{month}月账单</div>
      </div>
      <div style="height:8px"></div>`;

    render();

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
        render();
        return;
      }
      const billBtn = e.target.closest('[data-bill-key]');
      if (billBtn) {
        const ym = st.billYm || todayStr().slice(0, 7);
        const key = billBtn.dataset.billKey;
        const name = billBtn.dataset.billName;
        if (billBtn.dataset.billGo) location.hash = '#/bill?m=' + ym + '&c=' + encodeURIComponent(key) + '&n=' + encodeURIComponent(name);
        else if (billBtn.dataset.billX) exportBillXlsx(ym, key, name);
        return;
      }
      if (e.target.closest('[data-act="bill-all"]')) { exportAllBills(st.billYm || todayStr().slice(0, 7)); return; }
      if (e.target.closest('[data-act="export"]')) {
        const csv = Store.ordersCSV({ from: st.from || undefined, to: st.to || undefined });
        downloadBlob('销售统计_' + (st.from || '全部') + '.csv', new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        toast('已导出 CSV');
      }
    });
    el.addEventListener('change', e => {
      if (e.target.matches('[data-role="from"]')) { st.from = e.target.value; render(); }
      if (e.target.matches('[data-role="to"]')) { st.to = e.target.value; render(); }
      if (e.target.matches('[data-role="billYm"]')) { st.billYm = e.target.value; render(); }
    });

    return el;
  }
};
