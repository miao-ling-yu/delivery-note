/* ============================================================
 * views/data.js — 客户管理 / 商品管理
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

function dataListView({ kind, title }) {
  // kind: 'customers' | 'products'
  const st = { kw: '', editing: null };

  const el = document.createElement('div');
  el.className = 'view active';

  const formHtml = (d) => {
    if (kind === 'customers') {
      return `
        <div class="order-meta" style="padding:14px 16px">
          <div class="field"><label class="lab">客户名称 *</label><input data-role="name" value="${esc(d ? d.name : '')}" placeholder="必填"></div>
          <div class="field-row">
            <div class="field"><label class="lab">电话</label><input data-role="phone" value="${esc(d ? d.phone : '')}"></div>
            <div class="field"><label class="lab">联系人</label><input data-role="contact" value="${esc(d ? d.contact : '')}"></div>
          </div>
          <div class="field"><label class="lab">地址</label><input data-role="address" value="${esc(d ? d.address : '')}"></div>
          <div class="field"><label class="lab">备注</label><input data-role="remark" value="${esc(d ? d.remark : '')}"></div>
          <div class="btn-row" style="padding:4px 0 0">
            <button class="btn btn-ghost" data-act="form-cancel">取消</button>
            <button class="btn btn-primary" data-act="form-save">保存</button>
          </div>
        </div>`;
    }
    return `
      <div class="order-meta" style="padding:14px 16px">
        <div class="field-row">
          <div class="field"><label class="lab">产品编号</label><input data-role="code" value="${esc(d ? d.code : '')}"></div>
          <div class="field"><label class="lab">条码</label><input data-role="barcode" value="${esc(d ? d.barcode : '')}"></div>
        </div>
        <div class="field"><label class="lab">产品名称 *</label><input data-role="name" value="${esc(d ? d.name : '')}" placeholder="必填"></div>
        <div class="field-row">
          <div class="field"><label class="lab">规格</label><input data-role="spec" value="${esc(d ? d.spec : '')}"></div>
          <div class="field"><label class="lab">单位</label><input data-role="unit" value="${esc(d ? d.unit : '')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label class="lab">默认单价</label><input data-role="price" type="number" inputmode="decimal" value="${d && d.price != null ? d.price : ''}"></div>
          <div class="field"><label class="lab">成本价</label><input data-role="cost" type="number" inputmode="decimal" value="${d && d.cost != null ? d.cost : ''}"></div>
        </div>
        <div class="field"><label class="lab">备注</label><input data-role="remark" value="${esc(d ? d.remark : '')}"></div>
        <div class="btn-row" style="padding:4px 0 0">
          <button class="btn btn-ghost" data-act="form-cancel">取消</button>
          <button class="btn btn-primary" data-act="form-save">保存</button>
        </div>
      </div>`;
  };

  const render = () => {
    const list = kind === 'customers' ? Store.listCustomers(st.kw) : Store.listProducts(st.kw);
    const body = $('[data-role="list"]', el);
    if (st.editing === 'new' || st.editing) {
      const d = st.editing === 'new' ? null : (kind === 'customers' ? Store.getCustomer(st.editing) : Store.getProduct(st.editing));
      body.innerHTML = formHtml(d);
      return;
    }
    body.innerHTML = list.length ? list.map(item => {
      const main = kind === 'customers'
        ? { t: item.name, s: [item.phone, item.address].filter(Boolean).join(' · ') || '无联系方式', extra: '客户' }
        : { t: item.name, s: [item.code, item.spec, item.unit].filter(Boolean).join(' · ') || '无规格', extra: item.price != null ? '¥' + fmtMoney(item.price) : '无价' };
      return `
        <div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(main.t)}</div>
            <div class="li-sub">${esc(main.s)}</div>
          </div>
          <div class="li-end"><div class="num" style="font-size:13px;color:var(--muted);font-weight:600">${esc(main.extra)}</div>
            <div class="cap">${kind === 'customers' ? Store.countCustomerOrders(item.id) + ' 张单' : ''}</div>
          </div>
          <span class="chevron"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
        </div>`;
    }).join('') : `
      <div class="empty">
        <div class="em-t">还没有${kind === 'customers' ? '客户' : '商品'}</div>
        <div class="em-s">点击下方「新增」开始添加</div>
      </div>`;
  };

  el.innerHTML = `
    <div class="topbar">
      <h1>${title}</h1>
      <button class="btn btn-ghost btn-sm" data-act="new">+ 新增</button>
    </div>
    <div class="searchbar">
      <input class="input" placeholder="${kind === 'customers' ? '搜索客户名称 / 电话' : '搜索商品名称 / 编号'}" data-role="kw" value="${esc(st.kw)}">
    </div>
    <div class="list" data-role="list"></div>
    <div class="hint" style="margin:0 20px;text-align:center">点击列表项可修改，长按数据可导出 CSV（设置页）</div>`;

  render();

  el.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'new') { st.editing = 'new'; render(); return; }
      if (a === 'form-cancel') { st.editing = null; render(); return; }
      if (a === 'form-save') {
        const name = $('[data-role="name"]', el).value.trim();
        if (!name) { toast('请填写名称', true); return; }
        const payload = { name };
        ['phone', 'contact', 'address', 'remark'].forEach(k => {
          const inp = $('[data-role="' + k + '"]', el);
          if (inp) payload[k] = inp.value.trim();
        });
        if (kind === 'products') {
          ['code', 'barcode', 'spec', 'unit'].forEach(k => {
            const inp = $('[data-role="' + k + '"]', el);
            if (inp) payload[k] = inp.value.trim();
          });
          const p = parseFloat($('[data-role="price"]', el).value);
          payload.price = isNaN(p) ? undefined : p;
          const c = parseFloat($('[data-role="cost"]', el).value);
          payload.cost = isNaN(c) ? undefined : c;
        }
        if (st.editing !== 'new') payload.id = st.editing;
        kind === 'customers' ? Store.upsertCustomer(payload) : Store.upsertProduct(payload);
        toast('已保存');
        st.editing = null;
        render();
        return;
      }
    }
    const item = e.target.closest('.list-item');
    if (!item) return;
    const idx = Array.from($$('.list-item', el)).indexOf(item);
    const list = kind === 'customers' ? Store.listCustomers(st.kw) : Store.listProducts(st.kw);
    const target = list[idx];
    if (!target) return;
    const doEdit = await new Promise(res => {
      const sheet = openSheet(`
        <div style="padding:4px 0 8px">
          <button class="btn btn-ghost btn-block" data-o="edit">修改资料</button>
          <button class="btn btn-ghost btn-block" style="margin-top:8px" data-o="orders">查看相关单据</button>
          <button class="btn btn-danger-ghost btn-block" style="margin-top:8px" data-o="del">删除</button>
        </div>`, target.name);
      const bd = $('.sheet-bd', sheet.mask);
      bd.addEventListener('click', e => {
        const o = e.target.closest('[data-o]');
        if (!o) return;
        sheet.mask.remove();
        res(o.dataset.o);
      });
    });
    if (doEdit === 'edit') { st.editing = target.id; render(); }
    else if (doEdit === 'del') {
      const ok = await confirmDialog({ title: `删除${kind === 'customers' ? '客户' : '商品'}？`, text: target.name, okText: '删除', danger: true });
      if (!ok) return;
      kind === 'customers' ? Store.deleteCustomer(target.id) : Store.deleteProduct(target.id);
      toast('已删除');
      render();
    } else if (doEdit === 'orders') {
      st.kw = target.name;
      const kwInput = $('[data-role="kw"]', el);
      if (kwInput) kwInput.value = target.name;
      location.hash = '#/orders';
    }
  });

  let kwTimer = null;
  el.addEventListener('input', e => {
    if (!e.target.matches('[data-role="kw"]')) return;
    clearTimeout(kwTimer);
    kwTimer = setTimeout(() => { st.kw = e.target.value; if (!st.editing) render(); }, 200);
  });

  return el;
}

Views.customers = { render() { return dataListView({ kind: 'customers', title: '客户管理' }); } };
Views.products = { render() { return dataListView({ kind: 'products', title: '商品管理' }); } };
