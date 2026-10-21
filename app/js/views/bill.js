/* ============================================================
 * views/bill.js — 月度账单预览（标题/备注可编辑、合计、打印、导出Excel）
 * 路由：#/bill?m=2026-08&c=客户ID或__san__&n=客户名
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

Views.bill = {
  render(params) {
    const ym = params.m || todayStr().slice(0, 7);
    const key = params.c || '__san__';
    const name = params.n || '散客';

    const el = document.createElement('div');
    el.className = 'view active';

    const groups = Store.billGroups(ym);
    const group = groups.find(x => String(x.key) === String(key));
    if (!group) {
      el.innerHTML = `
        <div class="topbar">
          <button class="icbtn" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
          <h1>月度账单</h1>
        </div>
        <div class="empty"><div class="em-t">该月暂无账单</div><button class="btn btn-primary" data-act="back">返回</button></div>`;
      el.addEventListener('click', e => { if (e.target.closest('[data-act="back"]')) history.length > 1 ? history.back() : (location.hash = '#/stats'); });
      return el;
    }

    const s = Store.getSettings();
    const st = { editing: false, title: billTitleFor(group.name, ym), note: s.note || '' };

    const rows = [];
    let qtySum = 0, amtSum = 0;
    group.orders.forEach(o => o.items.forEach(i => {
      const q = Number(i.qty) || 0, amt = i.amount || 0;
      qtySum += q; amtSum += amt;
      rows.push({ date: o.date, name: (i.name || '') + (i.spec ? ' ' + i.spec : ''), qty: q, price: Number(i.price) || 0, amount: amt, remark: i.remark || '' });
    }));
    amtSum = Math.round(amtSum * 100) / 100;

    const paperHtml = () => `
      <div class="bill-paper" data-role="paper">
        <div class="bp-title">${esc(st.title)}</div>
        <div class="bp-sub">客户：${esc(group.name)}　·　${ym.replace('-', '年')}月　·　共 ${group.orders.length} 张送货单</div>
        <table class="bp-table">
          <thead><tr><th>日期</th><th>产品名称</th><th>数量</th><th>单价</th><th>金额</th><th>备注</th></tr></thead>
          <tbody>${rows.length ? rows.map(r => `
            <tr>
              <td>${esc(r.date.slice(5))}</td>
              <td style="text-align:left">${esc(r.name)}</td>
              <td>${fmtNum(r.qty)}</td>
              <td>${fmtMoney(r.price)}</td>
              <td>${fmtMoney(r.amount)}</td>
              <td>${esc(r.remark)}</td>
            </tr>`).join('') : `<tr><td colspan="6" style="color:var(--muted);padding:14px">暂无明细</td></tr>`}
          </tbody>
          <tfoot><tr><td colspan="2">合计</td><td></td><td></td><td>${fmtMoney(amtSum)}</td><td></td></tr></tfoot>
        </table>
        <div class="bp-total">合计金额：<b>¥${fmtMoney(amtSum)}</b>（大写：${amountUpper(amtSum)}）</div>
        <div class="bp-foot">${esc(st.note)}</div>
      </div>`;

    el.innerHTML = `
      <div class="topbar">
        <button class="icbtn" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        <h1>月度账单</h1>
        <button class="btn btn-ghost btn-sm" data-act="edit">编辑</button>
      </div>
      <div class="bill-wrap">
        <div class="bill-edit hidden" data-role="editBox" style="background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow);padding:14px 16px;margin-bottom:14px">
          <div class="field"><label class="lab">账单标题</label><input data-role="eTitle" value="${esc(st.title)}"></div>
          <div class="field"><label class="lab">账单备注（打印/导出时显示在底部）</label><textarea data-role="eNote" rows="3">${esc(st.note)}</textarea></div>
          <div class="btn-row" style="padding:4px 0 0">
            <button class="btn btn-ghost" data-act="edit-cancel">取消</button>
            <button class="btn btn-primary" data-act="edit-save">应用修改</button>
          </div>
        </div>
        <div data-role="paperBox">${paperHtml()}</div>
        <div class="btn-row" style="padding:14px 0 24px">
          <button class="btn btn-ghost" data-act="export">导出 Excel</button>
          <button class="btn btn-primary" data-act="print">打印</button>
        </div>
      </div>`;

    el.addEventListener('click', e => {
      if (e.target.closest('[data-act="back"]')) { history.length > 1 ? history.back() : (location.hash = '#/stats'); return; }
      if (e.target.closest('[data-act="print"]')) { window.print(); return; }
      if (e.target.closest('[data-act="edit"]')) {
        st.editing = !st.editing;
        $('[data-role="editBox"]', el).classList.toggle('hidden', !st.editing);
        $('[data-role="eTitle"]', el).value = st.title;
        $('[data-role="eNote"]', el).value = st.note;
        return;
      }
      if (e.target.closest('[data-act="edit-cancel"]')) {
        st.editing = false;
        $('[data-role="editBox"]', el).classList.add('hidden');
        return;
      }
      if (e.target.closest('[data-act="edit-save"]')) {
        st.title = $('[data-role="eTitle"]', el).value.trim() || st.title;
        st.note = $('[data-role="eNote"]', el).value.trim();
        st.editing = false;
        $('[data-role="editBox"]', el).classList.add('hidden');
        $('[data-role="paperBox"]', el).innerHTML = paperHtml();
        toast('已应用修改');
        return;
      }
      if (e.target.closest('[data-act="export"]')) {
        const bytes = Xlsx.build([{
          name: group.name.slice(0, 31),
          title: st.title,
          headers: ['日期', '产品名称', '数量', '单价', '金额', '备注'],
          rows: rows.map(r => [r.date, r.name, r.qty, r.price, r.amount, r.remark]),
          widths: [12, 26, 10, 10, 12, 20],
          footer: ['', '合计', '', '', amtSum, ''],
        }]);
        downloadBlob('账单_' + group.name + '_' + ym + '.xlsx', xlsxBlob(bytes));
        toast('已导出 Excel');
      }
    });

    return el;
  }
};
