/* ============================================================
 * util.js — 通用工具：金额、大写、日期、DOM辅助、弹层
 * ============================================================ */
'use strict';

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtMoney(n) {
  n = Number(n) || 0;
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) {
  n = Number(n) || 0;
  return (Math.round(n * 100) / 100).toLocaleString('zh-CN');
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }

/* 日期工具：本地时区 */
function dateStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function todayStr() { return dateStr(new Date()); }
function dateOf(s) {
  const p = String(s).split('-').map(Number);
  return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
}
function addDays(s, n) {
  const d = dateOf(s); d.setDate(d.getDate() + n); return dateStr(d);
}
function weekRange(today) {
  const t = today || new Date();
  const day = (t.getDay() + 6) % 7; // 周一为一周开始
  const mon = addDays(dateStr(t), -day);
  return [mon, addDays(mon, 6)];
}
function monthRange(s) {
  const p = String(s || todayStr()).split('-').map(Number);
  const first = p[0] + '-' + pad2(p[1]) + '-01';
  const last = new Date(p[0], p[1], 0);
  return [first, p[0] + '-' + pad2(p[1]) + '-' + pad2(last.getDate())];
}
function shortDate(s) { // 2026-10-09 -> 10-09
  return String(s || '').slice(5);
}
function fmtDateTime(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
         pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/* 人民币大写金额 */
const CN_NUM = ['零','壹','贰','叁','肆','伍','陆','柒','捌','玖'];
const CN_U = ['','拾','佰','仟'];
const CN_G = ['','万','亿'];
function numToUpperInt(nStr) {
  // nStr: 去掉小数的整数部分字符串
  if (nStr === '0') return '零';
  const groups = [];
  while (nStr.length > 4) { groups.unshift(nStr.slice(-4)); nStr = nStr.slice(0, -4); }
  groups.unshift(nStr);
  let out = '';
  const gLen = groups.length;
  groups.forEach((g, gi) => {
    const pow = gLen - 1 - gi;
    let gs = '';
    let zero = false;
    for (let i = 0; i < g.length; i++) {
      const d = +g[i];
      const pos = g.length - 1 - i;
      if (d === 0) { zero = true; }
      else {
        if (zero && gs) gs += '零';
        gs += CN_NUM[d] + CN_U[pos];
        zero = false;
      }
    }
    if (gs) out += gs + CN_G[pow];
    else if (out) out += '零';
  });
  return out.replace(/零+$/, '');
}
function amountUpper(amount) {
  amount = Math.round((Number(amount) || 0) * 100) / 100;
  if (amount === 0) return '零元整';
  const neg = amount < 0; amount = Math.abs(amount);
  const yuan = Math.floor(amount);
  const jiao = Math.floor((amount * 10) % 10);
  const fen = Math.round((amount * 100) % 10);
  let s = numToUpperInt(String(yuan)) + '元';
  if (jiao === 0 && fen === 0) s += '整';
  else {
    if (jiao > 0) s += CN_NUM[jiao] + '角';
    else if (fen > 0) s += '零';
    if (fen > 0) s += CN_NUM[fen] + '分';
  }
  return (neg ? '负' : '') + s;
}

/* ID 生成 */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- 轻提示 ---------- */
let toastTimer = null;
function toast(msg, isErr) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = isErr ? 'show err' : 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2200);
}

/* ---------- 确认框 ---------- */
function confirmDialog({ title, text, okText = '确定', danger = false }) {
  return new Promise(resolve => {
    const root = $('#modal-root');
    const mask = document.createElement('div');
    mask.className = 'mask show';
    mask.innerHTML = `
      <div class="confirm-box">
        <div class="cb-t">${esc(title)}</div>
        ${text ? `<div class="cb-s">${esc(text)}</div>` : ''}
        <div class="cb-row">
          <button class="btn btn-ghost" data-act="no">取消</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${esc(okText)}</button>
        </div>
      </div>`;
    root.appendChild(mask);
    const close = val => { mask.remove(); resolve(val); };
    mask.addEventListener('click', e => {
      if (e.target === mask) close(false);
      const act = e.target.closest('[data-act]');
      if (act) close(act.dataset.act === 'yes');
    });
  });
}

/* ---------- 底部弹层 ---------- */
function openSheet(html, title) {
  const root = $('#modal-root');
  const mask = document.createElement('div');
  mask.className = 'mask show';
  mask.innerHTML = `
    <div class="sheet">
      <div class="sheet-grab"></div>
      <div class="sheet-hd">
        <span>${esc(title || '')}</span>
        <button class="icbtn" data-act="close">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="sheet-bd"></div>
    </div>`;
  root.appendChild(mask);
  const bd = $('.sheet-bd', mask);
  bd.innerHTML = html;
  mask.addEventListener('click', e => {
    if (e.target === mask) mask.remove();
    if (e.target.closest('[data-act="close"]')) mask.remove();
  });
  return { mask, bd };
}

/* 文件下载/保存（浏览器环境回退） */
function xlsxBlob(bytes) {
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function downloadBlob(filename, blob) {
  if (window.Android && window.Android.saveFile) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1];
      window.Android.saveFile(filename, blob.type || 'application/octet-stream', base64);
    };
    reader.readAsDataURL(blob);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

/* 选择文件并读取为文本（Android桥 或 input[type=file]） */
function pickFileAsText(accept) {
  return new Promise(resolve => {
    if (window.Android && window.Android.pickFile) {
      const cb = 'f' + uid();
      window.__fileCallbacks = window.__fileCallbacks || {};
      window.__fileCallbacks[cb] = (err, text) => {
        delete window.__fileCallbacks[cb];
        if (err) { toast('读取文件失败', true); resolve(null); return; }
        resolve(text);
      };
      window.Android.pickFile(cb, accept || '*/*');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || '.json,.csv,text/*';
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => { toast('读取文件失败', true); resolve(null); };
      reader.readAsText(f, 'utf-8');
    };
    input.click();
  });
}

/* 分享文件（Android桥，浏览器回退为下载） */
function shareFile(filename, blob) {
  if (window.Android && window.Android.shareFile) {
    const reader = new FileReader();
    reader.onload = () => {
      window.Android.shareFile(filename, blob.type || 'application/octet-stream', String(reader.result).split(',')[1]);
    };
    reader.readAsDataURL(blob);
    return;
  }
  downloadBlob(filename, blob);
}
