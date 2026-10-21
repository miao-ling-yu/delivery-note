/* ============================================================
 * views/order.js — 开单 / 编辑 / 详情
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

/* 跨路由暂存：复制新增时携带原单 */
window.__orderDraft = null;

Views.order = {
  render(params) {
    if (params && params.id && location.hash.indexOf('/edit') >= 0) return this.renderEdit(params.id);
    if (params && params.id) return this.renderView(params.id);
    return this.renderNew();
  },

  /* ---------------- 新建 / 编辑 ---------------- */
  renderNew() {
    const s = Store.getSettings();
    const draft = window.__orderDraft || {
      id: null, no: Store.nextOrderNo(todayStr()), date: todayStr(),
      operator: s.operator || '', note: s.note || '',
      customer: null,
      items: [{ pid: null, name: '', spec: '', unit: '', qty: '', price: '', amount: 0, remark: '' }],
    };
    window.__orderDraft = null;
    // 复制新增时重生成单号
    if (draft._copy) { draft.no = Store.nextOrderNo(draft.date); delete draft._copy; }

    const el = document.createElement('div');
    el.className = 'view active';
    el.innerHTML = `
      <div class="topbar">
        <button class="icbtn" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        <h1>${draft.id ? '编辑送货单' : '开送货单'}</h1>
        <button class="btn btn-ghost btn-sm" data-act="save">保存</button>
      </div>
      <div class="pad">
        <div class="order-meta">
          <div class="field-row">
            <div class="field"><label class="lab">送货日期</label><input type="date" data-f="date" value="${esc(draft.date)}"></div>
            <div class="field"><label class="lab">单号</label><div style="height:42px;display:flex;align-items:center;font-weight:600;font-size:14px;color:var(--amber-deep);overflow:hidden;white-space:nowrap">${esc(draft.no)}</div></div>
          </div>
          <div class="field-row">
            <div class="field"><label class="lab">制单人</label><input data-f="operator" value="${esc(draft.operator)}" placeholder="选填"></div>
          </div>
        </div>

        <div class="cust-pick mb12" data-act="pick-cust">
          <span class="cp-ic"><svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0"/></svg></span>
          <div class="cp-main">
            <div class="cp-name" data-role="cname">${draft.customer ? esc(draft.customer.name) : '选择客户（可跳过）'}</div>
            <div class="cp-sub" data-role="csub">${draft.customer ? esc([draft.customer.phone, draft.customer.address].filter(Boolean).join(' · ')) : '未选择时按散客开单'}</div>
          </div>
          <span class="cp-arrow"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
        </div>

        <div class="section-title">货品明细</div>
        <div data-role="items"></div>
        <button class="add-row-btn mb12" data-act="add-row">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>添加一行
        </button>

        <div class="order-meta">
          <div class="field"><label class="lab">整单备注（打印在单据底部）</label><textarea data-f="note" rows="2" placeholder="默认使用设置里的备注">${esc(draft.note)}</textarea></div>
        </div>

        <div class="order-sum">
          <span>共 <b data-role="qtySum">0</b> 件</span>
          <span>合计：</span><span class="sum-money" data-role="total">¥0.00</span>
        </div>
        <div style="text-align:right;font-size:12px;color:var(--muted);padding:4px 2px 2px" data-role="upper"></div>

        <div class="btn-row" style="padding:14px 0 4px">
          <button class="btn btn-ghost" data-act="back">取消</button>
          <button class="btn btn-primary" data-act="save">保存单据</button>
        </div>
      </div>`;

    el.__draft = draft;

    /* ----- 渲染明细行 ----- */
    const itemsBox = $('[data-role="items"]', el);
    function itemDisplay(it) { return (it.name || '') + (it.spec ? ' ' + it.spec : ''); }
    function itemDisplay(it) { return (it.name || '') + (it.spec ? ' ' + it.spec : ''); }
    function rowHtml(it, i) {
      return `
        <div class="item-row" data-idx="${i}">
          <div class="ir-main">
            <div class="ir-line">
              <input class="ir-name" data-f="name" placeholder="产品名称 / 规格" value="${esc(itemDisplay(it))}" autocomplete="off">
              <input class="ir-unit" data-f="unit" placeholder="单位" value="${esc(it.unit)}">
            </div>
            <div class="ir-line ir-line2">
              <input class="ir-qty" data-f="qty" type="number" inputmode="decimal" placeholder="数量" value="${it.qty}">
              <input class="ir-price" data-f="price" type="number" inputmode="decimal" placeholder="单价" value="${it.price}">
              <div class="ir-amount" data-role="amount" style="display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-variant-numeric:tabular-nums;font-size:14px;padding:0 4px;color:var(--red)">${fmtMoney(it.amount)}</div>
            </div>
          </div>
          <button class="ir-del" data-act="del-row" aria-label="删除该行"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
        </div>`;
    }
    function renderItems() {
      itemsBox.innerHTML = draft.items.map(rowHtml).join('');
      recalc();
    }
    function recalc() {
      let qtySum = 0;
      draft.items.forEach((it, i) => {
        it.qty = $('[data-idx="' + i + '"] [data-f="qty"]', el).value.trim();
        it.price = $('[data-idx="' + i + '"] [data-f="price"]', el).value.trim();
        const q = parseFloat(it.qty) || 0, p = parseFloat(it.price) || 0;
        it.amount = Math.round(q * p * 100) / 100;
        $('[data-idx="' + i + '"] [data-role="amount"]', el).textContent = fmtMoney(it.amount);
        qtySum += q;
      });
      const total = draft.items.reduce((a, it) => a + (it.amount || 0), 0);
      draft.total = Math.round(total * 100) / 100;
      $('[data-role="qtySum"]', el).textContent = fmtNum(qtySum);
      $('[data-role="total"]', el).textContent = '¥' + fmtMoney(draft.total);
      $('[data-role="upper"]', el).textContent = '大写：' + amountUpper(draft.total);
    }
    renderItems();

    /* ----- 客户选择弹层 ----- */
    function openCustPicker() {
      let kw = '';
      const renderList = () => {
        const list = Store.listCustomers(kw);
        bd.querySelector('[data-role="clist"]').innerHTML = list.length ? list.map(c => `
          <div class="list-item" data-pick-cust="${c.id}">
            <div class="li-main">
              <div class="li-title">${esc(c.name)}</div>
              <div class="li-sub">${esc([c.phone, c.address].filter(Boolean).join(' · ')) || '无联系方式'}</div>
            </div>
            <span class="chevron"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
          </div>`).join('') : `<div class="empty" style="padding:30px 0"><div class="em-s">没有匹配的客户，可在下方新增</div></div>`;
      };
      const sheet = openSheet(`
        <div class="searchbar"><input placeholder="搜索客户名称 / 电话 / 地址" data-role="ckw"></div>
        <div data-role="clist"></div>
        <button class="btn btn-blue btn-block mt12" data-act="new-cust">+ 新增客户</button>
        <div class="hidden" data-role="cform" style="margin-top:12px;background:var(--surface);border-radius:10px;padding:12px">
          <div class="field"><input data-role="n.name" placeholder="客户名称 *"></div>
          <div class="field"><input data-role="n.phone" placeholder="电话"></div>
          <div class="field"><input data-role="n.address" placeholder="地址"></div>
          <div class="field"><input data-role="n.contact" placeholder="联系人"></div>
          <button class="btn btn-primary btn-block" data-act="save-new">保存客户并选用</button>
        </div>`, '选择客户');
      const bd = $('.sheet-bd', sheet.mask);
      renderList();
      $('[data-role="ckw"]', bd).addEventListener('input', e => { kw = e.target.value; renderList(); });
      bd.addEventListener('click', e => {
        const pick = e.target.closest('[data-pick-cust]');
        if (pick) {
          const c = Store.getCustomer(pick.dataset.pickCust);
          if (c) { draft.customer = { id: c.id, name: c.name, phone: c.phone || '', address: c.address || '', contact: c.contact || '' }; syncCust(); }
          sheet.mask.remove();
          return;
        }
        if (e.target.closest('[data-act="new-cust"]')) { $('[data-role="cform"]', bd).classList.remove('hidden'); return; }
        if (e.target.closest('[data-act="save-new"]')) {
          const name = $('[data-role="n.name"]', bd).value.trim();
          if (!name) { toast('请填写客户名称', true); return; }
          const c = Store.upsertCustomer({
            name,
            phone: $('[data-role="n.phone"]', bd).value.trim(),
            address: $('[data-role="n.address"]', bd).value.trim(),
            contact: $('[data-role="n.contact"]', bd).value.trim(),
          });
          draft.customer = { id: c.id, name: c.name, phone: c.phone || '', address: c.address || '', contact: c.contact || '' };
          syncCust();
          sheet.mask.remove();
        }
      });
    }
    function syncCust() {
      const c = draft.customer;
      $('[data-role="cname"]', el).textContent = c ? c.name : '选择客户（可跳过）';
      $('[data-role="csub"]', el).textContent = c ? [c.phone, c.address].filter(Boolean).join(' · ') : '未选择时按散客开单';
    }

    /* ----- 产品选择弹层（填充某一行） ----- */
    function openProductPicker(idx) {
      let kw = '';
      const it = draft.items[idx];
      const renderList = () => {
        const list = Store.listProducts(kw);
        const custId = draft.customer ? draft.customer.id : null;
        bd.querySelector('[data-role="plist"]').innerHTML = list.length ? list.map(p => {
          const price = Store.getLastPrice(custId, p.id) ?? (p.price == null ? '' : p.price);
          return `
          <div class="list-item" data-pick-p="${p.id}">
            <div class="li-main">
              <div class="li-title">${esc(p.name)}</div>
              <div class="li-sub">${esc([p.code, p.spec, p.unit].filter(Boolean).join(' · '))}</div>
            </div>
            <div class="li-end"><div class="num">${price === '' ? '无价' : fmtMoney(price)}</div></div>
          </div>`;
        }).join('') : `<div class="empty" style="padding:26px 0"><div class="em-s">没有匹配的商品，可直接在表单里手输</div></div>`;
      };
      const sheet = openSheet(`
        <div class="searchbar"><input placeholder="搜索商品名称 / 编号 / 规格" data-role="pkw"></div>
        <div data-role="plist"></div>
        <div class="hint" style="padding:0 4px">选中的商品会记住该客户的成交价（一客一价）</div>`, '选择商品');
      const bd = $('.sheet-bd', sheet.mask);
      renderList();
      $('[data-role="pkw"]', bd).addEventListener('input', e => { kw = e.target.value; renderList(); });
      bd.addEventListener('click', e => {
        const pick = e.target.closest('[data-pick-p]');
        if (!pick) return;
        const p = Store.getProduct(pick.dataset.pickP);
        if (!p) return;
        const custId = draft.customer ? draft.customer.id : null;
        const price = Store.getLastPrice(custId, p.id) ?? (p.price == null ? '' : p.price);
        Object.assign(it, {
          pid: p.id, name: p.name, spec: p.spec || '', unit: p.unit || '',
          price: price === '' ? '' : String(price),
        });
        renderItems();
        sheet.mask.remove();
      });
    }

    /* ----- 事件 ----- */
    el.addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'back') { history.length > 1 ? history.back() : (location.hash = '#/home'); return; }
      if (a === 'save') { save(); return; }
      if (a === 'pick-cust') { openCustPicker(); return; }
      if (a === 'add-row') { draft.items.push({ pid: null, name: '', spec: '', unit: '', qty: '', price: '', amount: 0, remark: '' }); renderItems(); return; }
      if (a === 'del-row') {
        const idx = +act.closest('[data-idx]').dataset.idx;
        if (draft.items.length <= 1) { toast('至少保留一行'); return; }
        draft.items.splice(idx, 1);
        renderItems();
      }
    });
    el.addEventListener('input', e => {
      const f = e.target.closest('[data-f]');
      if (!f) return;
      const row = e.target.closest('[data-idx]');
      if (row) {
        const idx = +row.dataset.idx;
        const it = draft.items[idx];
        const key = f.dataset.f;
        if (key === 'name') {
          const prev = (it.name || '') + (it.spec ? ' ' + it.spec : '');
          it.name = f.value;
          if (f.value !== prev) it.spec = '';
        } else {
          it[key] = f.value;
        }
        if (key === 'qty' || key === 'price') recalc();
      } else {
        const key = f.dataset.f;
        draft[key] = f.value;
        if (key === 'date') { /* 单号基于原日期生成，改日期不影响已生成单号 */ }
      }
    });
    el.addEventListener('focusin', e => {
      const name = e.target.closest('.ir-name');
      if (name) {
        const row = e.target.closest('[data-idx]');
        if (row) openProductPicker(+row.dataset.idx);
      }
    });

    function save() {
      const clean = draft.items.map(it => ({
        pid: it.pid,
        name: (it.name || '').trim(),
        spec: (it.spec || '').trim(),
        unit: (it.unit || '').trim(),
        qty: parseFloat(it.qty) || 0,
        price: parseFloat(it.price) || 0,
        amount: Math.round((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0) * 100) / 100,
        remark: (it.remark || '').trim(),
      })).filter(it => it.name && it.qty > 0);
      if (!clean.length) { toast('请至少填写一行有效货品', true); return; }
      const total = Math.round(clean.reduce((a, it) => a + it.amount, 0) * 100) / 100;

      const custId = draft.customer ? draft.customer.id : null;
      // 自动记忆：客户、商品、一客一价
      if (draft.customer && draft.customer.name && !custId) {
        const c = Store.upsertCustomer({
          name: draft.customer.name, phone: draft.customer.phone || '', address: draft.customer.address || '', contact: draft.customer.contact || '',
        });
        draft.customer = { id: c.id, name: c.name, phone: c.phone || '', address: c.address || '', contact: c.contact || '' };
      }
      clean.forEach(it => {
        if (it.pid) Store.setLastPrice(custId, it.pid, it.price);
      });
      clean.forEach(it => {
        if (!it.pid && it.name) {
          const comb = it.name + (it.spec ? ' ' + it.spec : '');
          const p = Store.listProducts(it.name).find(x => x.name === it.name || ((x.name || '') + (x.spec ? ' ' + x.spec : '')) === comb);
          if (!p) {
            const np = Store.upsertProduct({ name: it.name, spec: it.spec, unit: it.unit, price: it.price || undefined });
            it.pid = np.id;
          } else { it.pid = p.id; }
        }
      });

      const payload = {
        no: draft.no || Store.nextOrderNo(draft.date),
        date: draft.date || todayStr(),
        operator: (draft.operator || '').trim(),
        note: (draft.note || '').trim(),
        customer: draft.customer ? { ...draft.customer } : null,
        items: clean,
        total,
      };
      let saved;
      if (draft.id) {
        saved = Store.updateOrder(draft.id, payload);
        toast('单据已更新');
      } else {
        saved = Store.addOrder(payload);
        toast('送货单已保存');
      }
      location.hash = '#/order/view?id=' + saved.id;
    }

    return el;
  },

  /* ---------------- 详情 ---------------- */
  renderView(id) {
    const o = Store.getOrder(id);
    const el = document.createElement('div');
    el.className = 'view active';
    if (!o) {
      el.innerHTML = `<div class="empty"><div class="em-t">单据不存在</div><button class="btn btn-primary" data-act="back">返回</button></div>`;
      el.addEventListener('click', e => { if (e.target.closest('[data-act="back"]')) location.hash = '#/orders'; });
      return el;
    }
    const prev = Store.siblingOrder(id, -1);
    const next = Store.siblingOrder(id, 1);
    const qtySum = o.items.reduce((a, i) => a + (Number(i.qty) || 0), 0);

    el.innerHTML = `
      <div class="topbar">
        <button class="icbtn" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        <h1>单据详情</h1>
        <button class="icbtn" data-act="print"><svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg></button>
      </div>
      <div class="pad">
        <div class="doc-card tri-strip">
          <div class="dc-head">
            <span class="dc-no">${esc(o.no)}</span>
            <span class="dc-state">已开单</span>
          </div>
          <div class="dc-body">
            <div class="dc-line"><span class="k">客户</span><span class="v">${esc((o.customer && o.customer.name) || '散客')}</span></div>
            ${o.customer && o.customer.phone ? `<div class="dc-line"><span class="k">电话</span><span class="v">${esc(o.customer.phone)}</span></div>` : ''}
            ${o.customer && o.customer.address ? `<div class="dc-line"><span class="k">地址</span><span class="v">${esc(o.customer.address)}</span></div>` : ''}
            ${o.customer && o.customer.contact ? `<div class="dc-line"><span class="k">联系人</span><span class="v">${esc(o.customer.contact)}</span></div>` : ''}
            <div class="dc-line"><span class="k">日期</span><span class="v">${esc(o.date)}</span></div>
            ${o.operator ? `<div class="dc-line"><span class="k">制单人</span><span class="v">${esc(o.operator)}</span></div>` : ''}
            <table class="tbl dc-tbl">
              <thead><tr><th style="width:30px">#</th><th>产品名称</th><th style="width:40px">单位</th><th style="width:50px">数量</th><th style="width:70px">单价</th><th style="width:78px">金额</th></tr></thead>
              <tbody>
                ${o.items.map((it, i) => `
                  <tr>
                    <td class="num">${i + 1}</td>
                    <td class="left">${esc(it.name)}</td>
                    <td>${esc(it.unit || '-')}</td>
                    <td class="num">${fmtNum(it.qty)}</td>
                    <td class="num">${fmtMoney(it.price)}</td>
                    <td class="num">${fmtMoney(it.amount)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            ${o.note ? `<div style="font-size:12.5px;color:var(--muted);margin-top:10px;line-height:1.6">${esc(o.note)}</div>` : ''}
          </div>
          <div class="dc-foot">
            <span class="f-lab">共 ${fmtNum(qtySum)} 件 · ${esc(amountUpper(o.total))}</span>
            <span class="f-num">¥${fmtMoney(o.total)}</span>
          </div>
        </div>

        <div class="btn-row">
          ${prev ? `<button class="btn btn-ghost" data-act="prev">上一张</button>` : ''}
          <button class="btn btn-ghost" data-act="copy">复制新增</button>
          <button class="btn btn-primary" data-act="edit">编辑</button>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost" data-act="print">打印预览 / 导出</button>
          ${next ? `<button class="btn btn-ghost" data-act="next">下一张</button>` : ''}
          <button class="btn btn-danger-ghost" data-act="del">删除</button>
        </div>
      </div>`;

    el.addEventListener('click', async e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'back') { history.length > 1 ? history.back() : (location.hash = '#/orders'); }
      else if (a === 'print') { location.hash = '#/print?id=' + o.id; }
      else if (a === 'edit') { location.hash = '#/order/edit?id=' + o.id; }
      else if (a === 'copy') { window.__orderDraft = { ...o, customer: o.customer ? { ...o.customer } : null, items: o.items.map(i => ({ ...i })), _copy: true }; location.hash = '#/order/new'; }
      else if (a === 'prev') { location.hash = '#/order/view?id=' + prev.id; }
      else if (a === 'next') { location.hash = '#/order/view?id=' + next.id; }
      else if (a === 'del') {
        const ok = await confirmDialog({ title: '删除这张送货单？', text: o.no + '，删除后不可恢复。', okText: '删除', danger: true });
        if (!ok) return;
        Store.deleteOrder(o.id);
        Store.reclaimNo(o.no);
        toast('已删除');
        location.hash = '#/orders';
      }
    });
    return el;
  },

  /* ---------------- 编辑 ---------------- */
  renderEdit(id) {
    const o = Store.getOrder(id);
    if (!o) { location.hash = '#/orders'; return document.createElement('div'); }
    window.__orderDraft = {
      id: o.id, no: o.no, date: o.date,
      operator: o.operator || '', note: o.note || '',
      customer: o.customer ? { ...o.customer } : null,
      items: o.items.map(i => ({ pid: i.pid, name: i.name, spec: i.spec || '', unit: i.unit || '', qty: String(i.qty), price: String(i.price), amount: i.amount, remark: i.remark || '' })),
    };
    return this.renderNew();
  }
};
