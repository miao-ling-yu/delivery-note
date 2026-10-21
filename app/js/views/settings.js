/* ============================================================
 * views/settings.js — 设置（公司信息 / 单据 / 数据备份恢复 / 导入导出）
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

Views.settings = {
  render() {
    const el = document.createElement('div');
    el.className = 'view active';
    const s = Store.getSettings();
    const cnt = Store.countAll();

    const infoForm = () => `
      <div class="order-meta" style="margin:0 0 12px;padding:14px 16px">
        <div class="field"><label class="lab">公司 / 店铺名称（打印抬头）</label><input data-s="company" value="${esc(s.company)}"></div>
        <div class="field-row">
          <div class="field"><label class="lab">联系电话</label><input data-s="phone" value="${esc(s.phone)}"></div>
          <div class="field"><label class="lab">联系人</label><input data-s="contact" value="${esc(s.contact)}"></div>
        </div>
        <div class="field"><label class="lab">地址</label><input data-s="address" value="${esc(s.address)}"></div>
        <div class="field-row">
          <div class="field"><label class="lab">单号前缀</label><input data-s="noPrefix" value="${esc(s.noPrefix)}"></div>
          <div class="field"><label class="lab">默认制单人</label><input data-s="operator" value="${esc(s.operator)}"></div>
        </div>
        <div class="field"><label class="lab">整单默认备注（打印在单据底部）</label><textarea data-s="note" rows="3">${esc(s.note)}</textarea></div>
        <div class="field"><label class="lab">账单标题模板</label><input data-s="billTitle" value="${esc(s.billTitle)}" placeholder="{year}年{customer}与{company}{month}月账单"></div>
        <div class="hint" style="padding:0 2px 6px;font-size:11px;color:var(--muted)">月度账单标题可自定格式：{year}年 / {month}月 / {customer}客户名 / {company}公司名（外协厂名）</div>
        <button class="btn btn-primary btn-block" data-act="save-info">保存设置</button>
      </div>`;

    el.innerHTML = `
      <div class="topbar"><h1>设置</h1></div>
      <div class="pad" data-role="body">
        ${infoForm()}
        <div class="set-group">
          <div class="sg-hd">数据管理</div>
          <div class="set-row" data-act="backup"><div class="sr-main"><div class="sr-t">导出备份</div><div class="sr-s">当前：${cnt.orders} 张单据 · ${cnt.customers} 个客户 · ${cnt.products} 个商品</div></div></div>
          <div class="set-row" data-act="restore"><div class="sr-main"><div class="sr-t">恢复备份</div><div class="sr-s">从备份文件覆盖当前数据</div></div></div>
          <div class="set-row" data-act="exp-orders"><div class="sr-main"><div class="sr-t">导出单据 Excel</div><div class="sr-s">.xlsx 格式，含日期/单号/客户/金额</div></div></div>
          <div class="set-row" data-act="exp-products"><div class="sr-main"><div class="sr-t">导出商品 Excel</div><div class="sr-s">.xlsx 格式，包含编号 / 名称 / 规格 / 单价</div></div></div>
          <div class="set-row" data-act="exp-customers"><div class="sr-main"><div class="sr-t">导出客户 Excel</div><div class="sr-s">.xlsx 格式，包含名称 / 电话 / 地址</div></div></div>
          <div class="set-row" data-act="imp-products"><div class="sr-main"><div class="sr-t">导入商品 CSV</div><div class="sr-s">表头：编号,条码,产品名称,型号规格,单位,零售价,成本价,产品备注</div></div></div>
          <div class="set-row" data-act="imp-customers"><div class="sr-main"><div class="sr-t">导入客户 CSV</div><div class="sr-s">表头：编号,客户名称,电话,地址,联系人,备注</div></div></div>
          <div class="set-row" data-act="clear"><div class="sr-main"><div class="sr-t danger-text">清空全部数据</div><div class="sr-s">删除所有单据 / 客户 / 商品，不可恢复</div></div></div>
        </div>
        <div class="set-group">
          <div class="sg-hd">关于</div>
          <div class="set-row"><div class="sr-main"><div class="sr-t">送货单统计</div><div class="sr-s">完全本地离线运行 · v1.0</div></div></div>
        </div>
        <div style="height:10px"></div>
      </div>`;

    el.addEventListener('click', async e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'save-info') {
        ['company', 'phone', 'contact', 'address', 'noPrefix', 'operator', 'note', 'billTitle'].forEach(k => {
          const inp = $('[data-s="' + k + '"]', el);
          if (inp) s[k] = inp.value.trim();
        });
        Store.setSettings(s);
        toast('设置已保存');
        return;
      }
      if (a === 'backup') {
        const json = Store.exportJSON();
        const name = '送货单统计备份_' + todayStr().replace(/-/g, '') + '.json';
        downloadBlob(name, new Blob([json], { type: 'application/json' }));
        toast('备份已导出');
        return;
      }
      if (a === 'restore') {
        const ok = await confirmDialog({ title: '恢复备份会覆盖当前全部数据，继续？', okText: '继续' });
        if (!ok) return;
        const text = await pickFileAsText('.json');
        if (text == null) return;
        try {
          Store.importJSON(text);
          toast('恢复成功');
          location.hash = '#/home';
        } catch (err) {
          toast(err.message || '恢复失败', true);
        }
        return;
      }
      if (a === 'exp-orders') {
        const rows = Store.ordersTable();
        const tq = rows.reduce((x, r) => x + r.qty, 0);
        const ta = Math.round(rows.reduce((x, r) => x + (r.total || 0), 0) * 100) / 100;
        const bytes = Xlsx.build([{ name: '送货单', title: '送货单统计表', headers: ['日期', '单号', '客户', '件数', '金额(元)', '备注'], rows: rows.map(r => [r.date, r.no, r.customer, r.qty, r.total, r.note]), widths: [12, 16, 16, 8, 12, 30], footer: ['', '', '合计', tq, ta, ''] }]);
        downloadBlob('送货单统计.xlsx', xlsxBlob(bytes));
        toast('已导出 Excel');
        return;
      }
      if (a === 'exp-products') {
        const ps = Store.listProducts('');
        const bytes = Xlsx.build([{ name: '商品', title: '商品资料', headers: ['编号', '条码', '产品名称', '规格', '单位', '默认单价', '成本价', '备注'], rows: ps.map(p => [p.code || '', p.barcode || '', p.name, p.spec || '', p.unit || '', p.price != null ? p.price : '', p.cost != null ? p.cost : '', p.remark || '']), widths: [12, 14, 22, 12, 8, 10, 10, 20] }]);
        downloadBlob('商品.xlsx', xlsxBlob(bytes));
        toast('已导出 Excel');
        return;
      }
      if (a === 'exp-customers') {
        const cs = Store.listCustomers('');
        const bytes = Xlsx.build([{ name: '客户', title: '客户资料', headers: ['客户名称', '电话', '联系人', '地址', '备注'], rows: cs.map(c => [c.name, c.phone || '', c.contact || '', c.address || '', c.remark || '']), widths: [18, 16, 12, 28, 20] }]);
        downloadBlob('客户.xlsx', xlsxBlob(bytes));
        toast('已导出 Excel');
        return;
      }
      if (a === 'imp-products' || a === 'imp-customers') {
        const text = await pickFileAsText('.csv,text/csv');
        if (text == null) return;
        try {
          const r = a === 'imp-products' ? Store.importProductsCSV(text) : Store.importCustomersCSV(text);
          toast(`新增 ${r.added} 条，跳过重复 ${r.skipped} 条`);
        } catch (err) {
          toast(err.message || '导入失败', true);
        }
        return;
      }
      if (a === 'clear') {
        const ok = await confirmDialog({ title: '确定清空全部数据？', text: '所有单据、客户、商品将被删除，无法恢复。建议先导出备份。', okText: '清空', danger: true });
        if (!ok) return;
        Store.clearAll();
        toast('已清空');
        location.hash = '#/home';
      }
    });
    return el;
  }
};
