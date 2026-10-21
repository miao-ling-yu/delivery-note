/* ============================================================
 * views/print.js — 送货单打印预览（复刻三联单模板）
 * 支持：打印 / 存PDF（系统打印）、保存图片（纯Canvas绘制，兼容安卓WebView）、分享
 * ============================================================ */
'use strict';
window.Views = window.Views || {};

/* 保存图片：直接用 Canvas 绘制送货单（不依赖 SVG foreignObject，安卓 WebView 更稳） */
function drawDocToCanvas(o, s) {
  const W = 560;
  const padL = 30, padR = 30;
  const innerW = W - padL - padR;
  const scale = 2;

  function fmt(v) { return v == null || v === '' ? '' : String(v); }
  function upper(v) { return amountUpper(v); }

  /* 先计算总高度 */
  const rows = o.items.slice();
  while (rows.length < 8) rows.push(null);
  const ROW_H = 27;
  const tableTop = 196; // 表头开始 y（随上方内容累加，见下）
  // 预估：抬头(若公司名) + 标题 + NO + 元信息
  let yTop = 16;
  if (s.company) yTop += 24 + 16;
  yTop += 46; // 送货单 标题
  yTop += 24; // NO
  const metaTop = yTop;
  yTop += 3 * 24 + 8; // 元信息 3 行
  const headTop = yTop;
  const H = yTop + 24 + 8 * ROW_H + 30 + 26 + 34 + 30;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#222';
  ctx.textBaseline = 'middle';

  let y = 16;

  // 公司抬头
  if (s.company) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "SimSun","Microsoft YaHei",sans-serif';
    ctx.fillText(s.company, W / 2, y + 10);
    y += 18;
    ctx.font = '11px "SimSun","Microsoft YaHei",sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText([s.address, s.phone].filter(Boolean).join('　'), W / 2, y + 6);
    y += 16;
    ctx.fillStyle = '#222';
  }

  // 送货单 标题
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px "SimSun","Microsoft YaHei",sans-serif';
  ctx.fillText('送 货 单', W / 2, y + 24);
  y += 46;

  // NO
  ctx.textAlign = 'right';
  ctx.font = '12px "SimSun","Microsoft YaHei",sans-serif';
  ctx.fillText('NO：' + o.no, W - padR, y + 12);
  y += 24;

  // 元信息（2 列 × 3 行）
  ctx.textAlign = 'left';
  ctx.font = '12px "SimSun","Microsoft YaHei",sans-serif';
  const meta = [
    ['客户名称：', (o.customer && o.customer.name) || '散客', '客户电话：', (o.customer && o.customer.phone) || ''],
    ['制单人员：', o.operator || '', '客户地址：', (o.customer && o.customer.address) || ''],
    ['联 系 人：', (o.customer && o.customer.contact) || '', '送货日期：', o.date],
  ];
  const colW = innerW / 2;
  meta.forEach((row, ri) => {
    const ry = y + ri * 24 + 12;
    const drawCell = (label, val, cx) => {
      ctx.fillStyle = '#666';
      const lw = ctx.measureText(label).width;
      ctx.fillText(label, cx, ry);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 12px "SimSun","Microsoft YaHei",sans-serif';
      ctx.fillText(val, cx + lw + 2, ry);
      ctx.font = '12px "SimSun","Microsoft YaHei",sans-serif';
    };
    drawCell(row[0], row[1], padL);
    drawCell(row[2], row[3], padL + colW);
  });
  y += 3 * 24 + 8;

  // 表头
  const cols = [30, 196, 40, 48, 60, 70, 56]; // 序号 产品名称(含规格) 单位 数量 单价 金额 备注（合计500，左右各留30边距）
  const colX = [];
  let cx = padL;
  cols.forEach((cw, i) => { colX.push(cx); cx += cw; });
  const tableRight = padL + cols.reduce((a, b) => a + b, 0);

  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(padL, y, tableRight - padL, 24);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.strokeRect(padL, y, tableRight - padL, 24);
  ctx.fillStyle = '#222';
  ctx.font = 'bold 12px "SimSun","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  const heads = ['序号', '产品名称', '单位', '数量', '单价', '金额', '备注'];
  heads.forEach((h, i) => ctx.fillText(h, colX[i] + cols[i] / 2, y + 12));
  y += 24;

  // 明细 8 行
  ctx.font = '12px "SimSun","Microsoft YaHei",sans-serif';
  for (let i = 0; i < 8; i++) {
    const it = rows[i];
    ctx.strokeRect(padL, y, tableRight - padL, ROW_H);
    if (it) {
      ctx.fillStyle = '#222';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), colX[0] + cols[0] / 2, y + ROW_H / 2);
      ctx.textAlign = 'left';
      ctx.fillText(fmt(it.name), colX[1] + 4, y + ROW_H / 2);
      ctx.textAlign = 'center';
      ctx.fillText(fmt(it.unit), colX[2] + cols[2] / 2, y + ROW_H / 2);
      ctx.fillText(fmt(it.qty), colX[3] + cols[3] / 2, y + ROW_H / 2);
      ctx.fillText(fmt(it.price), colX[4] + cols[4] / 2, y + ROW_H / 2);
      ctx.fillText(fmt(it.amount), colX[5] + cols[5] / 2, y + ROW_H / 2);
      ctx.textAlign = 'left';
      ctx.fillText(fmt(it.remark), colX[6] + 4, y + ROW_H / 2);
    }
    y += ROW_H;
  }
  // 列分隔线
  ctx.strokeStyle = '#999';
  for (let i = 1; i < cols.length; i++) {
    ctx.beginPath();
    ctx.moveTo(colX[i], headTop);
    ctx.lineTo(colX[i], y);
    ctx.stroke();
  }

  // 合计
  y += 12;
  ctx.fillStyle = '#222';
  ctx.textAlign = 'left';
  ctx.font = '13px "SimSun","Microsoft YaHei",sans-serif';
  ctx.fillText('金额合计（大写）：' + upper(o.total), padL, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px "SimSun","Microsoft YaHei",sans-serif';
  ctx.fillText('小写金额 ¥' + fmtMoney(o.total), tableRight, y);
  y += 26;

  // 备注（自动换行）
  const note = o.note || s.note || '以上货物请当面核对，如有质量问题请在收货后3天内通知本公司，逾期恕不负责。';
  ctx.font = '12px "SimSun","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  const lines = [];
  let line = '';
  for (const ch of '注：' + note) {
    if (ctx.measureText(line + ch).width > innerW - 20 && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, padL, y + 6 + i * 18));
  y += lines.length * 18 + 8;

  // 签章
  ctx.font = '12px "SimSun","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#222';
  ctx.fillText('送货单位及经手人（盖章）：', padL, y + 20);
  ctx.fillText('收货单位及经手人（盖章）：', padL + innerW / 2, y + 20);

  // 联次（右侧）
  ctx.font = '11px "SimSun",sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#333';
  ctx.fillText('白联存根', tableRight, 34);
  ctx.fillText('黄红联记账客户', tableRight, 50);
  ctx.fillText('蓝联回单', tableRight, 66);

  return canvas;
}

/* dataURL -> Blob（不依赖 fetch，安卓 WebView 兼容） */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(parts[1]);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

Views.print = {
  render(params) {
    const o = Store.getOrder(params.id);
    const el = document.createElement('div');
    el.className = 'view active';
    el.id = 'print-view';
    if (!o) {
      el.innerHTML = `<div class="empty"><div class="em-t">单据不存在</div><button class="btn btn-primary" data-act="back">返回</button></div>`;
      el.addEventListener('click', e => { if (e.target.closest('[data-act="back"]')) location.hash = '#/orders'; });
      return el;
    }
    const s = Store.getSettings();
    const rows = o.items.slice();
    while (rows.length < 8) rows.push(null); // 模板固定 8 行空位
    const qtySum = o.items.reduce((a, i) => a + (Number(i.qty) || 0), 0);

    const docHtml = `
      <div class="doc-wrap">
        <div class="doc" data-role="doc">
          ${s.company ? `<div style="text-align:center;font-size:15px;font-weight:700;letter-spacing:2px">${esc(s.company)}</div>
          <div style="text-align:center;font-size:11px;color:#333;margin-bottom:2px">${esc([s.address, s.phone].filter(Boolean).join('　'))}</div>` : ''}
          <div class="d-title">送 货 单</div>
          <div class="d-no">NO：${esc(o.no)}</div>
          <div class="d-meta">
            <span>客户名称：<b>${esc((o.customer && o.customer.name) || '散客')}</b></span>
            <span>客户电话：<b>${esc((o.customer && o.customer.phone) || '')}</b></span>
            <span>制单人员：<b>${esc(o.operator || '')}</b></span>
            <span>客户地址：<b>${esc((o.customer && o.customer.address) || '')}</b></span>
            <span>联 系 人：<b>${esc((o.customer && o.customer.contact) || '')}</b></span>
            <span>送货日期：<b>${esc(o.date)}</b></span>
          </div>
          <table>
            <thead><tr>
              <th style="width:34px">序号</th><th>产品名称</th>
              <th style="width:42px">单位</th><th style="width:52px">数量</th>
              <th style="width:64px">单价</th><th style="width:74px">金额</th><th style="width:56px">备注</th>
            </tr></thead>
            <tbody>
              ${rows.map((it, i) => it ? `
                <tr>
                  <td>${i + 1}</td>
                  <td>${esc(it.name)}</td>
                  <td>${esc(it.unit || '')}</td>
                  <td>${fmtNum(it.qty)}</td>
                  <td>${fmtMoney(it.price)}</td>
                  <td>${fmtMoney(it.amount)}</td>
                  <td>${esc(it.remark || '')}</td>
                </tr>` : `
                <tr><td>${i + 1}</td><td colspan="7"></td></tr>`).join('')}
            </tbody>
          </table>
          <div class="d-total">
            <span class="t-cap">金额合计（大写）：${esc(amountUpper(o.total))}</span>
            <span>小写金额 <span class="t-num">¥${fmtMoney(o.total)}</span></span>
          </div>
          <div class="d-note">注：${esc(o.note || s.note || '以上货物请当面核对，如有质量问题请在收货后3天内通知本公司，逾期恕不负责。')}</div>
          <div class="d-sign">
            <div>送货单位及经手人（盖章）：</div>
            <div>收货单位及经手人（盖章）：</div>
          </div>
        </div>
        <div class="d-lianci">白联存根<br>黄红联记账客户<br>蓝联回单</div>
      </div>`;

    el.innerHTML = `
      <div id="print-toolbar">
        <div class="topbar">
          <button class="icbtn" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
          <h1>打印预览</h1>
          <button class="icbtn" data-act="share"><svg viewBox="0 0 24 24"><path d="M12 3v13m0-13 4 4m-4-4-4 4M5 21h14"/></svg></button>
        </div>
        <div style="display:flex;gap:8px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--line)">
          <button class="btn btn-primary btn-sm" data-act="save-img" style="flex:1"><svg viewBox="0 0 24 24"><path d="M4 17v3h16v-3M12 3v12m0 0 4-4m-4 4-4-4"/></svg>保存图片</button>
          <button class="btn btn-blue btn-sm" data-act="print" style="flex:1"><svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>打印 / 存PDF</button>
        </div>
      </div>
      <div class="doc-page">${docHtml}</div>
      <div class="hint" style="text-align:center;margin:10px 0 16px">A4 竖版三联送货单 · 打印时选择「另存为 PDF」即可保存电子档</div>`;

    el.addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'back') { history.length > 1 ? history.back() : (location.hash = '#/order/view?id=' + o.id); return; }
      if (a === 'print') {
        if (window.Android && window.Android.printPdf) { window.Android.printPdf('送货单_' + o.no); }
        else window.print();
        return;
      }
      if (a === 'save-img' || a === 'share') {
        try {
          const canvas = drawDocToCanvas(o, s);
          const dataUrl = canvas.toDataURL('image/png');
          const px = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          let nonWhite = 0;
          for (let i = 0; i < px.length; i += 40) {
            if (px[i] < 245 || px[i + 1] < 245 || px[i + 2] < 245) { nonWhite++; if (nonWhite > 30) break; }
          }
          if (nonWhite <= 30) throw new Error('blank');
          const blob = dataUrlToBlob(dataUrl);
          const name = '送货单_' + o.no + '.png';
          if (a === 'share') { shareFile(name, blob); toast('已分享'); }
          else { downloadBlob(name, blob); toast('图片已保存'); }
        } catch (err) {
          toast('图片生成失败，请用「打印/存PDF」导出', true);
        }
      }
    });
    return el;
  }
};
