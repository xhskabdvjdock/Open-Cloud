'use strict';
/* Open Cloud frontend — vanilla JS, no secrets, all Telegram calls via backend. */

/* ---------------- Icons (inline SVG, no emojis) ---------------- */
const P = {
  cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 6.5 6.5 0 0 0-12.7 1.61A4 4 0 0 0 6 19h11.5z"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  move: '<path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  restore: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  zoomIn: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>',
};
function icon(name, size) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${size ? `width="${size}" height="${size}"` : ''}>${P[name] || P.file}</svg>`;
}

/* ---------------- i18n ---------------- */
const STR = {
  en: {
    tagline: 'Private cloud storage, powered by your Telegram.',
    loginExplain: 'Log in with your Telegram account. We never ask for your phone number, password, or codes.',
    loginNotConfigured: 'Telegram Login is not configured yet.\nSet TELEGRAM_LOGIN_BOT_TOKEN and TELEGRAM_LOGIN_BOT_NAME (see README), then reload.',
    devLoginNote: 'Development login (disabled in production).',
    continue: 'Continue', back: 'Back', next: 'Next', logout: 'Logout',
    welcome: 'Welcome to Open Cloud',
    wizardIntro: 'Your files are stored through your connected Telegram storage.',
    wizCreate: 'Create a bot', wizConnect: 'Connect', wizChat: 'Storage chat', wizTest: 'Test', wizDone: 'Ready',
    myFiles: 'My Files', recent: 'Recent', favorites: 'Favorites', trash: 'Trash',
    storage: 'Storage', settings: 'Settings', language: 'Language', appearance: 'Appearance',
    searchPh: 'Search files...', upload: 'Upload', newFolder: 'New folder',
    grid: 'Grid', list: 'List', sort: 'Sort', name: 'Name', size: 'Size', dateAdded: 'Date added', modified: 'Last modified', type: 'Type',
    empty: 'No files yet', emptyHint: 'Upload your first file to get started.', uploadFiles: 'Upload files',
    emptyTrash: 'Trash is empty', emptyFolder: 'This folder is empty',
    open: 'Open', download: 'Download', rename: 'Rename', move: 'Move', favorite: 'Favorite', unfavorite: 'Unfavorite',
    moveToTrash: 'Move to trash', properties: 'Properties', restore: 'Restore', deleteForever: 'Delete permanently', emptyTrashBtn: 'Empty trash',
    cancel: 'Cancel', save: 'Save', create: 'Create', retry: 'Retry', close: 'Close', verify: 'Verify storage',
    folderName: 'Folder name', fileName: 'File name', moveTo: 'Move to',
    propsTitle: 'Properties', pName: 'Name', pType: 'Type', pSize: 'Size', pLocation: 'Location', pCreated: 'Created', pUpdated: 'Updated', pStorage: 'Telegram storage',
    available: 'Available', unavailable: 'Unavailable — file missing in Telegram',
    previewNa: 'Preview unavailable', downloadFile: 'Download file',
    uploading: 'Uploading', waiting: 'Waiting',
    loadMore: 'Load more',
    account: 'Account', connectedBot: 'Connected storage bot', connStatus: 'Connection status',
    connected: 'Storage connected', connError: 'Storage connection error',
    testConn: 'Test connection', disconnect: 'Disconnect storage',
    defaultFolder: 'Default upload folder', trashBehavior: 'Deleted files go to',
    toTrash: 'Trash first', permanent: 'Delete permanently',
    light: 'Light', dark: 'Dark', system: 'System',
    selected: 'selected', root: 'My Files',
    delConfirm: 'Move to trash?', delPermConfirm: 'Permanently delete? This also removes the Telegram storage message.',
    emptyTrashConfirm: 'Permanently delete everything in trash?',
    disconnectConfirm: 'Disconnect storage? Telegram messages are kept; metadata stays and works after reconnect.',
    setupNeeded: 'Connect storage to start uploading.',
    uploadFailed: 'Upload failed', downloadFailed: 'Download failed',
  },
  ar: {
    tagline: 'سحابة خاصة، مدعومة بتخزين تيليجرام الخاص بك.',
    loginExplain: 'سجّل الدخول بحساب تيليجرام. لا نطلب رقم الهاتف أو كلمة المرور أو رموز التحقق أبداً.',
    loginNotConfigured: 'تسجيل الدخول عبر تيليجرام غير مُعد بعد.\nاضبط TELEGRAM_LOGIN_BOT_TOKEN و TELEGRAM_LOGIN_BOT_NAME (راجع README) ثم أعد التحميل.',
    devLoginNote: 'دخول التطوير (معطّل في الإنتاج).',
    continue: 'متابعة', back: 'رجوع', next: 'التالي', logout: 'تسجيل الخروج',
    welcome: 'مرحباً بك في Open Cloud',
    wizardIntro: 'تُخزَّن ملفاتك عبر تخزين تيليجرام المتصل بك.',
    wizCreate: 'إنشاء بوت', wizConnect: 'الربط', wizChat: 'محادثة التخزين', wizTest: 'اختبار', wizDone: 'جاهز',
    myFiles: 'ملفاتي', recent: 'الأخيرة', favorites: 'المفضلة', trash: 'سلة المهملات',
    storage: 'التخزين', settings: 'الإعدادات', language: 'اللغة', appearance: 'المظهر',
    searchPh: 'ابحث في الملفات...', upload: 'رفع', newFolder: 'مجلد جديد',
    grid: 'شبكة', list: 'قائمة', sort: 'ترتيب', name: 'الاسم', size: 'الحجم', dateAdded: 'تاريخ الإضافة', modified: 'آخر تعديل', type: 'النوع',
    empty: 'لا توجد ملفات بعد', emptyHint: 'ارفع أول ملف للبدء.', uploadFiles: 'رفع ملفات',
    emptyTrash: 'سلة المهملات فارغة', emptyFolder: 'هذا المجلد فارغ',
    open: 'فتح', download: 'تنزيل', rename: 'إعادة تسمية', move: 'نقل', favorite: 'مفضلة', unfavorite: 'إزالة من المفضلة',
    moveToTrash: 'نقل إلى السلة', properties: 'خصائص', restore: 'استعادة', deleteForever: 'حذف نهائي', emptyTrashBtn: 'إفراغ السلة',
    cancel: 'إلغاء', save: 'حفظ', create: 'إنشاء', retry: 'إعادة المحاولة', close: 'إغلاق', verify: 'التحقق من التخزين',
    folderName: 'اسم المجلد', fileName: 'اسم الملف', moveTo: 'نقل إلى',
    propsTitle: 'الخصائص', pName: 'الاسم', pType: 'النوع', pSize: 'الحجم', pLocation: 'الموقع', pCreated: 'أُنشئ', pUpdated: 'حُدّث', pStorage: 'تخزين تيليجرام',
    available: 'متاح', unavailable: 'غير متاح — الملف مفقود في تيليجرام',
    previewNa: 'المعاينة غير متاحة', downloadFile: 'تنزيل الملف',
    uploading: 'جارٍ الرفع', waiting: 'بانتظار',
    loadMore: 'عرض المزيد',
    account: 'الحساب', connectedBot: 'بوت التخزين المتصل', connStatus: 'حالة الاتصال',
    connected: 'التخزين متصل', connError: 'خطأ في اتصال التخزين',
    testConn: 'اختبار الاتصال', disconnect: 'فصل التخزين',
    defaultFolder: 'مجلد الرفع الافتراضي', trashBehavior: 'الملفات المحذوفة تذهب إلى',
    toTrash: 'السلة أولاً', permanent: 'حذف نهائي',
    light: 'فاتح', dark: 'داكن', system: 'النظام',
    selected: 'محدد', root: 'ملفاتي',
    delConfirm: 'نقل إلى السلة؟', delPermConfirm: 'حذف نهائي؟ سيؤدي هذا أيضاً إلى حذف رسالة تخزين تيليجرام.',
    emptyTrashConfirm: 'حذف كل ما في السلة نهائياً؟',
    disconnectConfirm: 'فصل التخزين؟ رسائل تيليجرام تبقى؛ تبقى البيانات وتعمل بعد إعادة الاتصال.',
    setupNeeded: 'اربط التخزين لبدء الرفع.',
    uploadFailed: 'فشل الرفع', downloadFailed: 'فشل التنزيل',
  }
};
let LANG = 'en';
function t(k) { return (STR[LANG] && STR[LANG][k]) || STR.en[k] || k; }
function applyLang(l) {
  LANG = STR[l] ? l : 'en';
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const s = document.getElementById('search'); if (s) s.placeholder = t('searchPh');
}

/* ---------------- API client ---------------- */
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok) throw Object.assign(new Error(body.message || `Request failed (${res.status})`), { code: body.error, status: res.status, body });
  return body;
}
const get = (p) => api(p);
const post = (p, d = {}) => api(p, { method: 'POST', body: JSON.stringify(d) });
const patch = (p, d = {}) => api(p, { method: 'PATCH', body: JSON.stringify(d) });
const del = (p) => api(p, { method: 'DELETE' });
const put = (p, d = {}) => api(p, { method: 'PUT', body: JSON.stringify(d) });

/* ---------------- Helpers ---------------- */
const $ = (id) => document.getElementById(id);
function toast(msg, kind = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = msg;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 5200);
}
function fmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1, v = n;
  do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + u[i];
}
function fmtDate(s) { try { return new Date(s).toLocaleString(LANG === 'ar' ? 'ar' : 'en'); } catch { return s; } }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fileIcon(mime, name) {
  mime = mime || '';
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf') return 'file';
  return 'file';
}
function previewKind(mime, name) {
  mime = mime || '';
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'log', 'csv'].includes(ext)) return 'text';
  return 'none';
}

/* ---------------- Global state ---------------- */
const S = {
  user: null, authConfig: null, settings: null,
  view: 'files', folderId: null, folders: [], path: [],
  files: [], total: 0, limit: 100, offset: 0,
  sortBy: 'updated_at', sortDir: 'desc', gridMode: 'grid',
  search: '', selection: new Set(), usage: null, connection: null,
  previewList: [], previewIdx: 0,
  wizStep: 0, wizChats: [],
};

function showView(name) {
  for (const v of ['view-login', 'view-wizard', 'view-app']) $(v).hidden = v !== 'view-' + name;
}

/* ---------------- Boot ---------------- */
async function boot() {
  $('login-logo').innerHTML = icon('cloud', 32);
  $('wizard-logo').innerHTML = icon('cloud', 32);
  $('side-logo').innerHTML = icon('cloud', 24);
  $('side-collapse').innerHTML = icon('menu');
  $('search-icon').innerHTML = icon('search');
  $('btn-menu').innerHTML = icon('menu');
  $('storage-icon').innerHTML = icon('cloud');
  $('btn-sort').innerHTML = icon('chevD') + '<span>' + esc(t('sort')) + '</span>';

  let savedLang = 'en', savedTheme = 'light';
  try {
    const ls = JSON.parse(localStorage.getItem('oc-prefs') || '{}');
    if (ls.lang) savedLang = ls.lang;
    if (ls.theme) savedTheme = ls.theme;
  } catch { /* */ }
  applyTheme(savedTheme);
  applyLang(savedLang);

  S.authConfig = await get('/auth/config').catch(() => ({ telegramLoginConfigured: false }));
  bindApp(); // bind once: login, wizard, and app controls all exist statically
  const me = await get('/auth/me').catch(() => null);
  if (!me || !me.user) return showLogin();
  S.user = me.user;
  await loadSettings();
  applyLang(S.settings.language || savedLang);
  applyTheme(S.settings.theme || savedTheme);
  S.gridMode = S.settings.view || 'grid';
  S.sortBy = S.settings.sort_by || 'updated_at';
  S.sortDir = S.settings.sort_dir || 'desc';
  const conn = await get('/storage/connection').catch(() => ({ configured: false }));
  S.connection = conn;
  if (!conn.configured || conn.status !== 'connected') return showWizard();
  return showApp();
}

function saveLocalPrefs() {
  try { localStorage.setItem('oc-prefs', JSON.stringify({ lang: LANG, theme: document.documentElement.dataset.theme })); } catch { /* */ }
}

async function loadSettings() {
  const r = await get('/settings').catch(() => null);
  S.settings = (r && r.settings) || { language: LANG, theme: 'system', view: 'grid', sort_by: 'updated_at', sort_dir: 'desc' };
}

function applyTheme(mode) {
  let eff = mode;
  if (mode === 'system') eff = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = eff;
  document.documentElement.setAttribute('data-theme', eff);
}

/* ---------------- Login ---------------- */
function showLogin() {
  showView('login');
  const cfg = S.authConfig || {};
  const slot = $('tg-login-slot');
  slot.innerHTML = '';
  $('login-not-configured').hidden = true;
  if (cfg.telegramLoginConfigured && cfg.loginBotName) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.setAttribute('data-telegram-login', cfg.loginBotName);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    slot.appendChild(s);
  } else {
    const n = $('login-not-configured');
    n.textContent = t('loginNotConfigured');
    n.hidden = false;
  }
  $('dev-login').hidden = !cfg.devLoginEnabled;
  $('login-error').hidden = true;
}
window.onTelegramAuth = async function (user) {
  $('login-error').hidden = true;
  try {
    const r = await post('/auth/telegram', user);
    S.user = r.user;
    await loadSettings();
    const conn = await get('/storage/connection').catch(() => ({ configured: false }));
    S.connection = conn;
    if (!conn.configured || conn.status !== 'connected') return showWizard();
    return showApp();
  } catch (e) { showLoginError(e.message); }
};
function showLoginError(m) { const e = $('login-error'); e.textContent = m; e.hidden = false; }

/* ---------------- Wizard ---------------- */
const WIZ_STEPS = () => [t('wizCreate'), t('wizConnect'), t('wizChat'), t('wizTest'), t('wizDone')];
function showWizard() {
  showView('wizard');
  S.wizStep = 0;
  renderWizard();
}
function renderWizard() {
  const steps = WIZ_STEPS();
  $('wizard-steps').innerHTML = steps.map((s, i) =>
    `<li class="${i === S.wizStep ? 'active' : ''} ${i < S.wizStep ? 'done' : ''}">${esc(s)}</li>`).join('');
  $('wizard-back').style.visibility = S.wizStep === 0 ? 'hidden' : 'visible';
  $('wizard-next').textContent = S.wizStep === steps.length - 1 ? t('myFiles') : t('next');
  const b = $('wizard-body');
  $('wizard-error').hidden = true;
  if (S.wizStep === 0) {
    b.innerHTML = `<h2>${esc(t('wizCreate'))}</h2>
    <ol class="guide">
      <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> in Telegram.</li>
      <li>Send <code>/newbot</code> and follow the prompts (name + username).</li>
      <li>Copy the <strong>bot token</strong> BotFather gives you (format <code>123456:ABC…</code>).</li>
      <li>Open your new bot and press <strong>Start</strong> — bots cannot message you first.</li>
    </ol>
    <p class="muted small">One storage bot per user. The token stays on the server, encrypted, and is never shown again.</p>`;
  } else if (S.wizStep === 1) {
    b.innerHTML = `<h2>${esc(t('wizConnect'))}</h2>
      <p class="muted">Paste the bot token from @BotFather. It is validated with <code>getMe</code>, encrypted, and never sent to the browser again.</p>
      <div class="form-grid"><label>Bot token</label><input id="wiz-token" type="password" autocomplete="off" placeholder="123456:ABC-DEF..."></div>`;
  } else if (S.wizStep === 2) {
    b.innerHTML = `<h2>${esc(t('wizChat'))}</h2>
      <p class="muted">Send <code>/start</code> to your bot in Telegram, then press Detect — or paste the chat ID manually. For channels/groups, add the bot as admin and use that chat ID.</p>
      <div class="row"><button class="btn" id="wiz-detect">${icon('refresh')} Detect</button></div>
      <div id="wiz-chats"></div>
      <div class="form-grid" style="margin-top:8px"><label>Storage chat ID</label><input id="wiz-chat" type="text" autocomplete="off" placeholder="-100..."></div>`;
    $('wiz-detect').onclick = detectChats;
  } else if (S.wizStep === 3) {
    b.innerHTML = `<h2>${esc(t('wizTest'))}</h2>
      <p class="muted">Runs a real check: bot token, chat access, and write permission (without spamming messages).</p>
      <div class="row"><button class="btn primary" id="wiz-test">${icon('check')} ${esc(t('testConn'))}</button></div>
      <div id="wiz-test-out"></div>`;
    $('wiz-test').onclick = testConn;
  } else {
    b.innerHTML = `<h2>${esc(t('wizDone'))}</h2><p class="muted">${esc(t('connected'))}. ${esc(t('uploadFiles'))}.</p>`;
  }
}
function wizErr(m) { const e = $('wizard-error'); e.textContent = m; e.hidden = false; }
async function detectChats() {
  const box = $('wiz-chats'); box.innerHTML = '<p class="muted">…</p>';
  try {
    const r = await get('/storage/detect');
    S.wizChats = r.chats || [];
    if (!S.wizChats.length) { box.innerHTML = `<div class="notice">${esc(r.hint || '')}</div>`; return; }
    box.innerHTML = S.wizChats.map((c) =>
      `<div class="chat-pick"><span>${icon('cloud')}</span><span><strong>${esc(c.title)}</strong><br><span class="muted small">${esc(c.type)} · ${esc(c.chat_id)}</span></span><button class="btn" data-chat="${esc(c.chat_id)}">Use</button></div>`).join('');
    box.querySelectorAll('button').forEach((btn) => { btn.onclick = () => { $('wiz-chat').value = btn.dataset.chat; }; });
  } catch (e) { wizErr(e.message); box.innerHTML = ''; }
}
async function testConn() {
  const out = $('wiz-test-out'); out.innerHTML = '<p class="muted">…</p>';
  try {
    const r = await post('/storage/test', {});
    S.connection = r.connection;
    out.innerHTML = `<div class="notice">OK — @${esc(r.bot.username)} → ${esc((r.chat && (r.chat.title || r.chat.id)) || '')}</div>`;
  } catch (e) { out.innerHTML = `<div class="error">${esc(e.message)}</div>`; }
}

/* ---------------- App shell ---------------- */
async function showApp() {
  showView('app');
  buildSidebar();
  await refreshAll();
}
function buildSidebar() {
  const nav = $('side-nav');
  const items = [
    ['files', 'cloud', t('myFiles')],
    ['recent', 'clock', t('recent')],
    ['favorites', 'star', t('favorites')],
    ['trash', 'trash', t('trash')],
  ];
  nav.innerHTML = items.map(([v, ic, label]) =>
    `<button class="side-link ${S.view === v ? 'active' : ''}" data-view="${v}">${icon(ic)}<span>${esc(label)}</span><span class="count" id="count-${v}"></span></button>`).join('');
  nav.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { S.view = b.dataset.view; S.folderId = null; S.offset = 0; S.search = ''; $('search').value = ''; buildSidebar(); refreshAll(); $('sidebar').classList.remove('open'); };
  });
  $('btn-settings').innerHTML = icon('settings') + `<span>${esc(t('settings'))}</span>`;
  $('btn-lang').innerHTML = icon('globe') + `<span>${LANG === 'ar' ? 'العربية' : 'English'}</span>`;
  $('btn-theme').innerHTML = icon('moon') + `<span>${esc(t('appearance'))}</span>`;
  $('btn-logout').innerHTML = icon('logout') + `<span>${esc(t('logout'))}</span>`;
  $('btn-upload').innerHTML = icon('upload') + `<span>${esc(t('upload'))}</span>`;
  $('btn-newfolder').innerHTML = icon('plus') + `<span>${esc(t('newFolder'))}</span>`;
  $('btn-view').innerHTML = icon(S.gridMode === 'grid' ? 'list' : 'grid');
  renderSortBtn();
}
function renderSortBtn() {
  const labels = { name: t('name'), size: t('size'), created_at: t('dateAdded'), updated_at: t('modified'), mime_type: t('type') };
  $('btn-sort').innerHTML = `<span>${esc(t('sort'))}: ${esc(labels[S.sortBy] || S.sortBy)} ${S.sortDir === 'asc' ? '↑' : '↓'}</span>`;
  const m = $('sort-menu');
  m.innerHTML = Object.keys(labels).map((k) => `<button data-s="${k}">${esc(labels[k])} ${S.sortBy === k ? (S.sortDir === 'asc' ? '↑' : '↓') : ''}</button>`).join('');
  m.querySelectorAll('button').forEach((b) => {
    b.onclick = async () => {
      if (S.sortBy === b.dataset.s) S.sortDir = S.sortDir === 'asc' ? 'desc' : 'asc';
      else { S.sortBy = b.dataset.s; S.sortDir = 'desc'; }
      $('sort-menu').hidden = true;
      renderSortBtn();
      await persistViewPrefs();
      S.offset = 0;
      refreshFiles();
    };
  });
}
async function persistViewPrefs() {
  try { S.settings = (await put('/settings', { view: S.gridMode, sort_by: S.sortBy, sort_dir: S.sortDir })).settings; } catch { /* */ }
}

let appBound = false;
function bindApp() {
  if (appBound) return;
  appBound = true;
  $('btn-logout').onclick = async () => { await post('/auth/logout', {}).catch(() => {}); location.reload(); };
  $('wizard-logout').onclick = async () => { await post('/auth/logout', {}).catch(() => {}); location.reload(); };
  $('wizard-back').onclick = () => { if (S.wizStep > 0) { S.wizStep--; renderWizard(); } };
  $('wizard-next').onclick = wizNext;
  $('dev-login-btn').onclick = async () => {
    try {
      const r = await post('/auth/dev', { username: $('dev-username').value || 'dev' });
      S.user = r.user; await loadSettings();
      const conn = await get('/storage/connection').catch(() => ({ configured: false }));
      S.connection = conn;
      if (!conn.configured || conn.status !== 'connected') return showWizard();
      return showApp();
    } catch (e) { showLoginError(e.message); }
  };
  $('btn-upload').onclick = () => $('file-input').click();
  $('file-input').onchange = (e) => { enqueueFiles([...e.target.files], S.folderId); e.target.value = ''; };
  $('folder-input').onchange = (e) => { enqueueFiles([...e.target.files], S.folderId); e.target.value = ''; };
  $('btn-newfolder').onclick = newFolderDialog;
  $('btn-view').onclick = async () => {
    S.gridMode = S.gridMode === 'grid' ? 'list' : 'grid';
    $('btn-view').innerHTML = icon(S.gridMode === 'grid' ? 'list' : 'grid');
    await persistViewPrefs();
    renderFiles();
  };
  $('btn-sort').onclick = (e) => { e.stopPropagation(); $('sort-menu').hidden = !$('sort-menu').hidden; };
  document.addEventListener('click', () => { $('sort-menu').hidden = true; $('ctx').hidden = true; });
  let deb = null;
  $('search').oninput = (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => { S.search = e.target.value.trim(); S.offset = 0; refreshFiles(); }, 300);
  };
  $('btn-more').onclick = () => { S.offset += S.limit; refreshFiles(true); };
  $('btn-settings').onclick = settingsDialog;
  $('btn-lang').onclick = async () => {
    const next = LANG === 'ar' ? 'en' : 'ar';
    applyLang(next); saveLocalPrefs();
    try { S.settings = (await put('/settings', { language: next })).settings; } catch { /* */ }
    buildSidebar(); renderFiles(); refreshUsage();
  };
  $('btn-theme').onclick = async () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next); saveLocalPrefs();
    try { S.settings = (await put('/settings', { theme: next })).settings; } catch { /* */ }
  };
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if ((S.settings && S.settings.theme) === 'system') applyTheme('system');
  });
  $('side-collapse').onclick = () => $('sidebar').classList.remove('open');
  $('btn-menu').onclick = () => $('sidebar').classList.toggle('open');

  // Drag & drop
  const dz = $('drop-zone');
  let depth = 0;
  dz.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dz.classList.add('drop-active'); });
  dz.addEventListener('dragover', (e) => e.preventDefault());
  dz.addEventListener('dragleave', (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; dz.classList.remove('drop-active'); } });
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); depth = 0; dz.classList.remove('drop-active');
    const files = [...(e.dataTransfer.files || [])];
    if (!files.length) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const folderEl = el && el.closest && el.closest('[data-folder-id]');
    const target = folderEl ? Number(folderEl.dataset.folderId) : S.folderId;
    enqueueFiles(files, target);
  });

  // Keyboard shortcuts (only implemented actions)
  document.addEventListener('keydown', (e) => {
    const inInput = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName || '');
    if (e.key === 'Escape') {
      $('preview-modal').hidden = true;
      closeModal(); $('ctx').hidden = true;
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); if (!$('view-app').hidden) $('file-input').click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!$('view-app').hidden) $('search').focus(); }
    if (e.key === 'Delete' && !$('view-app').hidden && !inInput && S.selection.size) { bulkTrash(); }
    if (e.key === 'Enter' && !$('view-app').hidden && !inInput && S.selection.size === 1) {
      const f = S.files.find((x) => x.id === [...S.selection][0]);
      if (f) openFile(f);
    }
  });

  // Context menu (right click)
  $('browser').addEventListener('contextmenu', (e) => {
    const card = e.target.closest && e.target.closest('[data-file-id]');
    if (!card) return;
    e.preventDefault();
    const id = Number(card.dataset.fileId);
    const f = S.files.find((x) => x.id === id);
    if (f) openCtx(e.clientX, e.clientY, f);
  });
}

async function wizNext() {
  const last = WIZ_STEPS().length - 1;
  try {
    if (S.wizStep === 1) {
      const token = $('wiz-token').value.trim();
      if (!token) return wizErr('Paste the bot token first.');
      $('wizard-next').disabled = true;
      try {
        const r = await post('/storage/connect', { bot_token: token });
        S.connection = r.connection;
        S.wizStep++;
      } catch (e) { wizErr(e.message); return; }
      finally { $('wizard-next').disabled = false; }
    } else if (S.wizStep === 2) {
      const chat = $('wiz-chat').value.trim();
      if (!chat) return wizErr('Set the storage chat ID first (or Detect one).');
      $('wizard-next').disabled = true;
      try {
        const r = await post('/storage/chat', { storage_chat_id: chat });
        S.connection = r.connection;
        S.wizStep++;
      } catch (e) { wizErr(e.message); return; }
      finally { $('wizard-next').disabled = false; }
    } else if (S.wizStep === 3) {
      const r = await get('/storage/connection').catch(() => null);
      if (!r || r.status !== 'connected') return wizErr('Run “Test connection” successfully first.');
      S.wizStep++;
    } else if (S.wizStep === last) {
      return showApp();
    } else {
      S.wizStep++;
    }
    renderWizard();
  } finally { /* */ }
}

/* ---------------- Data loading ---------------- */
async function refreshAll() {
  await Promise.all([refreshFolders(), refreshFiles(), refreshUsage()]);
}
async function refreshFolders() {
  const r = await get('/folders/tree').catch(() => ({ folders: [] }));
  S.folders = r.folders || [];
  if (S.folderId != null) {
    const p = await get(`/folders/${S.folderId}/path`).catch(() => ({ path: [] }));
    S.path = p.path || [];
  } else S.path = [];
  renderCrumbs();
  renderFolderRow();
}
async function refreshFiles(append = false) {
  const st = $('browser-state');
  if (!append) { S.files = []; }
  st.hidden = true;
  let data;
  try {
    if (S.search) {
      data = await get(`/search?q=${encodeURIComponent(S.search)}&sort_by=${S.sortBy}&sort_dir=${S.sortDir}&limit=${S.limit}&offset=${S.offset}`);
    } else if (S.view === 'trash') {
      data = await get(`/trash?sort_by=${S.sortBy}&sort_dir=${S.sortDir}&limit=${S.limit}&offset=${S.offset}`);
    } else {
      const fid = S.folderId == null ? 'null' : S.folderId;
      data = await get(`/files?folder_id=${fid}&view=${S.view}&sort_by=${S.sortBy}&sort_dir=${S.sortDir}&limit=${S.limit}&offset=${S.offset}`);
    }
  } catch (e) {
    st.hidden = false;
    st.innerHTML = `<h3>${esc(e.message)}</h3><button class="btn" onclick="location.reload()">${esc(t('retry'))}</button>`;
    return;
  }
  S.total = data.total || 0;
  S.files = append ? S.files.concat(data.items || []) : (data.items || []);
  S.selection.clear();
  renderFiles();
  $('load-more-wrap').hidden = !(S.files.length < S.total);
  $('btn-more').textContent = `${t('loadMore')} (${S.files.length}/${S.total})`;
  if (!S.files.length && !S.folders.length && !S.search) {
    st.hidden = false;
    if (S.view === 'trash') st.innerHTML = `<h3>${esc(t('emptyTrash'))}</h3>`;
    else if (S.view === 'files' && S.folderId == null) st.innerHTML = `<h3>${esc(t('empty'))}</h3><p>${esc(t('emptyHint'))}</p><button class="btn primary" id="empty-upload">${esc(t('uploadFiles'))}</button>`;
    else st.innerHTML = `<h3>${esc(t('emptyFolder'))}</h3>`;
    const b = $('empty-upload'); if (b) b.onclick = () => $('file-input').click();
  }
}
async function refreshUsage() {
  const u = await get('/storage/usage').catch(() => null);
  S.usage = u;
  if (!u) return;
  $('storage-text').textContent = `${fmtBytes(u.usedBytes)} · ${u.filesCount} files · ${u.foldersCount} folders`;
  const trashC = $('count-trash'); if (trashC) trashC.textContent = u.trashCount || '';
  const favC = $('count-favorites'); if (favC) favC.textContent = '';
  $('storage-pct').textContent = fmtBytes(u.usedBytes);
  const cap = 15 * 1024 * 1024 * 1024; // soft reference bar (Telegram has no fixed quota; bar is proportional)
  $('storage-bar').style.width = Math.min(100, (u.usedBytes / cap) * 100) + '%';
}

/* ---------------- Rendering ---------------- */
function renderCrumbs() {
  const c = $('crumbs');
  let html = `<button data-crumb="root" class="${S.folderId == null ? 'current' : ''}">${esc(t('root'))}</button>`;
  for (const p of S.path) html += `<span>›</span><button data-crumb="${p.id}" class="${p.id === S.folderId ? 'current' : ''}">${esc(p.name)}</button>`;
  c.innerHTML = html;
  c.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      S.folderId = b.dataset.crumb === 'root' ? null : Number(b.dataset.crumb);
      S.offset = 0; S.view = 'files'; buildSidebar(); refreshFolders(); refreshFiles();
    };
  });
}
function renderFolderRow() {
  const row = $('folder-row');
  if (S.view === 'trash' || S.search) { row.innerHTML = ''; return; }
  const subs = S.folders.filter((f) => (f.parent_id == null ? null : f.parent_id) === S.folderId);
  row.innerHTML = subs.map((f) =>
    `<div class="folder-card" data-folder-id="${f.id}" data-fid="${f.id}" tabindex="0">
      ${icon('folder')}<span><strong>${esc(f.name)}</strong></span><span class="spacer"></span>
      <button class="icon-btn" data-fmenu="${f.id}" aria-label="more">${icon('more')}</button>
    </div>`).join('');
  row.querySelectorAll('.folder-card').forEach((el) => {
    el.ondblclick = () => { S.folderId = Number(el.dataset.fid); S.offset = 0; refreshFolders(); refreshFiles(); };
    el.onclick = (e) => {
      if (e.target.closest('[data-fmenu]')) return;
      S.folderId = Number(el.dataset.fid); S.offset = 0; refreshFolders(); refreshFiles();
    };
    el.onkeydown = (ev) => { if (ev.key === 'Enter') { S.folderId = Number(el.dataset.fid); S.offset = 0; refreshFolders(); refreshFiles(); } };
  });
  row.querySelectorAll('[data-fmenu]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); folderCtx(e.clientX, e.clientY, Number(b.dataset.fmenu)); };
  });
}
function renderFiles() {
  const area = $('file-area');
  area.className = 'file-area ' + (S.gridMode === 'grid' ? 'grid' : 'list');
  if (S.view !== 'trash') renderFolderRow();
  area.innerHTML = S.files.map((f) => {
    const sel = S.selection.has(f.id) ? ' selected' : '';
    const fav = f.is_favorite ? `<span class="fav">${icon('star')}</span>` : '';
    const bad = f.status !== 'available' ? ` <span class="badge warn">${esc(t('unavailable'))}</span>` : '';
    if (S.gridMode === 'grid') {
      const thumb = (f.mime_type || '').startsWith('image/')
        ? `<div class="thumb"><img loading="lazy" src="/api/files/${f.id}/preview" alt=""></div>`
        : `<div class="thumb">${icon(fileIcon(f.mime_type, f.name), 30)}</div>`;
      return `<div class="file-card${sel}" data-file-id="${f.id}" tabindex="0">${fav}${thumb}
        <div class="fname">${esc(f.name)}</div><div class="fmeta">${fmtBytes(f.size)}${bad}</div>
        <button class="icon-btn card-menu" data-fmenu="${f.id}" aria-label="more">${icon('more')}</button></div>`;
    }
    return `<div class="file-row${sel}" data-file-id="${f.id}" tabindex="0">${icon(fileIcon(f.mime_type, f.name))}
      <span class="fname">${esc(f.name)}${bad}</span>
      <span class="fmeta">${fmtBytes(f.size)}</span><span class="fmeta">${fmtDate(f.updated_at)}</span>
      ${f.is_favorite ? icon('star') : ''}<button class="icon-btn" data-fmenu="${f.id}">${icon('more')}</button></div>`;
  }).join('');
  area.querySelectorAll('[data-file-id]').forEach((el) => {
    const id = Number(el.dataset.fileId);
    el.onclick = (e) => {
      if (e.target.closest('[data-fmenu]')) return;
      if (e.ctrlKey || e.metaKey) { S.selection.has(id) ? S.selection.delete(id) : S.selection.add(id); renderFiles(); return; }
      const f = S.files.find((x) => x.id === id);
      openFile(f);
    };
    el.ondblclick = () => { const f = S.files.find((x) => x.id === id); if (f) openFile(f); };
    el.onkeydown = (ev) => { if (ev.key === 'Enter') { const f = S.files.find((x) => x.id === id); if (f) openFile(f); } };
  });
  area.querySelectorAll('[data-fmenu]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); const f = S.files.find((x) => x.id === Number(b.dataset.fmenu)); if (f) openCtx(e.clientX, e.clientY, f); };
  });
  renderBulk();
}
function renderBulk() {
  const bar = $('bulkbar');
  if (S.view === 'trash') {
    bar.hidden = false;
    const n = S.selection.size;
    bar.innerHTML = `${n ? `<strong>${n} ${esc(t('selected'))}</strong>
      <button class="btn" id="bulk-restore">${icon('restore')} ${esc(t('restore'))}</button>
      <button class="btn danger" id="bulk-perm">${icon('trash')} ${esc(t('deleteForever'))}</button>` : `<strong>${esc(t('trash'))}</strong>`}
      <span class="spacer"></span><button class="btn" id="bulk-empty">${esc(t('emptyTrashBtn'))}</button>
      ${n ? `<button class="btn ghost" id="bulk-clear">${esc(t('cancel'))}</button>` : ''}`;
    const clear = $('bulk-clear'); if (clear) clear.onclick = () => { S.selection.clear(); renderFiles(); };
    const rs = $('bulk-restore'); if (rs) rs.onclick = async () => {
      for (const id of [...S.selection]) { try { await post(`/trash/${id}/restore`, {}); } catch (e) { toast(e.message, 'error'); } }
      S.selection.clear(); refreshFiles(); refreshUsage();
    };
    const pm = $('bulk-perm'); if (pm) pm.onclick = async () => {
      if (!confirm(t('delPermConfirm'))) return;
      for (const id of [...S.selection]) { try { await del(`/trash/${id}`); } catch (e) { toast(e.message, 'error'); } }
      S.selection.clear(); refreshFiles(); refreshUsage();
    };
    $('bulk-empty').onclick = async () => {
      if (!confirm(t('emptyTrashConfirm'))) return;
      const r = await post('/trash/empty', {}).catch((e) => { toast(e.message, 'error'); return null; });
      if (r) toast(`Deleted ${r.deleted}`, 'ok');
      S.selection.clear(); refreshFiles(); refreshUsage();
    };
    // trash rows: click toggles selection instead of preview
    document.querySelectorAll('#file-area [data-file-id]').forEach((el) => {
      const id = Number(el.dataset.fileId);
      el.onclick = (e) => {
        if (e.target.closest('[data-fmenu]')) return;
        S.selection.has(id) ? S.selection.delete(id) : S.selection.add(id);
        renderFiles();
      };
      el.ondblclick = null;
    });
    return;
  }
  if (!S.selection.size) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `<strong>${S.selection.size} ${esc(t('selected'))}</strong>
    <button class="btn" id="bulk-dl">${icon('download')} ${esc(t('download'))}</button>
    <button class="btn" id="bulk-mv">${icon('move')} ${esc(t('move'))}</button>
    <button class="btn" id="bulk-del">${icon('trash')} ${esc(t('moveToTrash'))}</button>
    <button class="btn ghost" id="bulk-clear">${esc(t('cancel'))}</button>`;
  $('bulk-clear').onclick = () => { S.selection.clear(); renderFiles(); };
  $('bulk-del').onclick = bulkTrash;
  $('bulk-dl').onclick = async () => {
    for (const id of [...S.selection]) {
      const f = S.files.find((x) => x.id === id);
      if (f) { downloadFile(f); await new Promise((r) => setTimeout(r, 400)); }
    }
  };
  $('bulk-mv').onclick = () => moveDialog([...S.selection]);
}
async function bulkTrash() {
  const ids = [...S.selection];
  if (!ids.length) return;
  if (S.view === 'trash') {
    if (!confirm(t('emptyTrashConfirm'))) return;
    for (const id of ids) { try { await del(`/trash/${id}`); } catch (e) { toast(e.message, 'error'); } }
  } else {
    for (const id of ids) { try { await del(`/files/${id}`); } catch (e) { toast(e.message, 'error'); } }
  }
  S.selection.clear();
  refreshFiles(); refreshUsage();
}

/* ---------------- Upload queue (real XHR progress) ---------------- */
const queue = [];
function enqueueFiles(fileList, folderId) {
  if (!fileList.length) return;
  if (S.connection && S.connection.status !== 'connected') {
    toast(t('setupNeeded'), 'error');
    return;
  }
  // Group by folder path (webkitRelativePath) and create subfolders as needed
  const groups = new Map();
  for (const f of fileList) {
    const rel = f.webkitRelativePath || f.name;
    const parts = rel.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1) : [];
    groups.set(dir.join('/'), [...(groups.get(dir.join('/')) || []), f]);
  }
  (async () => {
    for (const [dir, files] of groups) {
      let target = folderId;
      if (dir) {
        for (const seg of dir.split('/')) {
          target = await ensureSubfolder(target, seg);
          if (target == null) break;
        }
      }
      for (const f of files) pushQueueItem(f, target);
    }
    renderQueue();
    pumpQueue();
  })();
}
async function ensureSubfolder(parentId, name) {
  const existing = S.folders.find((f) => ((f.parent_id == null ? null : f.parent_id) === parentId) && f.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  try {
    const r = await post('/folders', { name, parent_id: parentId });
    S.folders.push(r.folder);
    return r.folder.id;
  } catch (e) { toast(e.message, 'error'); return parentId; }
}
function pushQueueItem(file, folderId) {
  queue.push({ file, folderId, progress: 0, status: 'waiting', xhr: null, error: null });
}
let pumping = false;
function renderQueue() {
  const q = $('queue');
  const active = queue.filter((i) => i.status !== 'done');
  if (!active.length && !queue.length) { q.hidden = true; return; }
  q.hidden = false;
  q.innerHTML = `<h4>${esc(t('uploading'))}</h4>` + queue.slice(-8).map((item, i) =>
    `<div class="qitem ${item.status}"><div class="qtop"><span class="qname">${esc(item.file.name)}</span>
    <span class="qstatus">${item.status === 'done' ? '100%' : item.status === 'failed' ? esc(t('uploadFailed')) : item.status === 'waiting' ? esc(t('waiting')) : Math.round(item.progress) + '%'}</span>
    ${item.status === 'failed' ? `<button class="btn" data-retry="${i}">${esc(t('retry'))}</button>` : ''}</div>
    <div class="qbar"><div style="width:${item.status === 'done' ? 100 : item.progress}%"></div></div></div>`).join('');
  q.querySelectorAll('[data-retry]').forEach((b) => {
    b.onclick = () => { const it = queue[Number(b.dataset.retry)]; if (it) { it.status = 'waiting'; it.progress = 0; renderQueue(); pumpQueue(); } };
  });
}
async function pumpQueue() {
  if (pumping) return;
  pumping = true;
  try {
    for (const item of queue) {
      if (item.status !== 'waiting') continue;
      item.status = 'uploading';
      renderQueue();
      try {
        // eslint-disable-next-line no-await-in-loop
        await uploadOne(item);
        item.status = 'done'; item.progress = 100;
      } catch (e) {
        item.status = 'failed'; item.error = e.message;
        toast(`${item.file.name}: ${e.message}`, 'error');
      }
      renderQueue();
      // eslint-disable-next-line no-await-in-loop
      await refreshFiles().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await refreshUsage().catch(() => {});
    }
  } finally { pumping = false; }
}
function uploadOne(item) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    item.xhr = xhr;
    xhr.open('POST', '/api/files/upload');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) item.progress = (e.loaded / e.total) * 100;
      renderQueue();
    };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (body.duplicate_of) toast(`${item.file.name}: already stored as “${body.duplicate_of.name}” — kept both.`, 'ok');
        resolve(body);
      } else if (xhr.status === 409 && body.error === 'FILE_EXISTS') {
        // Ask Replace / Keep Both / Rename
        replaceDialog(item.file.name,
          () => retryUpload(item, 'replace').then(resolve, reject),
          () => retryUpload(item, 'rename').then(resolve, reject));
      } else {
        reject(new Error(body.message || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    const fd = new FormData();
    fd.append('file', item.file, item.file.name);
    if (item.folderId != null) fd.append('folder_id', String(item.folderId));
    fd.append('on_conflict', 'error'); // ask on duplicates
    xhr.send(fd);
  });
}
function retryUpload(item, mode) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) item.progress = (e.loaded / e.total) * 100; renderQueue(); };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    const fd = new FormData();
    fd.append('file', item.file, item.file.name);
    if (item.folderId != null) fd.append('folder_id', String(item.folderId));
    fd.append('on_conflict', mode);
    xhr.send(fd);
  }).then((r) => { item.status = 'done'; item.progress = 100; renderQueue(); return r; },
    (e) => { item.status = 'failed'; renderQueue(); throw e; });
}

/* ---------------- File actions ---------------- */
function openFile(f) {
  if (!f) return;
  const kind = previewKind(f.mime_type, f.name);
  if (kind === 'none') { downloadFile(f); return; }
  S.previewList = S.files.filter((x) => previewKind(x.mime_type, x.name) === kind);
  if (!S.previewList.find((x) => x.id === f.id)) S.previewList = [f];
  S.previewIdx = S.previewList.findIndex((x) => x.id === f.id);
  showPreview();
}
let zoom = 1;
function showPreview() {
  const f = S.previewList[S.previewIdx];
  if (!f) return;
  $('preview-modal').hidden = false;
  $('preview-title').textContent = f.name;
  zoom = 1;
  const kind = previewKind(f.mime_type, f.name);
  const body = $('preview-body');
  const url = `/api/files/${f.id}/preview`;
  body.innerHTML = '';
  if (kind === 'image') {
    const img = document.createElement('img');
    img.src = url; img.alt = f.name;
    img.onerror = () => { body.innerHTML = `<div style="padding:24px;color:#fff">${esc(t('previewNa'))} — <a href="/api/files/${f.id}/download" style="color:#fff">${esc(t('downloadFile'))}</a></div>`; };
    body.appendChild(img);
    body.dataset.zoomTarget = 'img';
  } else if (kind === 'video') {
    body.innerHTML = `<video controls playsinline src="${url}"></video>`;
  } else if (kind === 'audio') {
    body.innerHTML = `<audio controls src="${url}" style="max-width:600px"></audio>`;
  } else if (kind === 'pdf') {
    body.innerHTML = `<iframe src="${url}" title="${esc(f.name)}"></iframe>`;
  } else if (kind === 'text') {
    fetch(url, { credentials: 'same-origin' }).then(async (r) => {
      if (!r.ok) throw new Error('load failed');
      const txt = await r.text();
      body.innerHTML = '';
      const pre = document.createElement('pre');
      pre.textContent = txt.slice(0, 200000);
      body.appendChild(pre);
    }).catch(() => { body.innerHTML = `<div style="padding:24px">${esc(t('previewNa'))}</div>`; });
    body.innerHTML = '<div style="padding:24px">…</div>';
  }
  $('pv-prev').innerHTML = icon(document.documentElement.dir === 'rtl' ? 'chevR' : 'chevL');
  $('pv-next').innerHTML = icon(document.documentElement.dir === 'rtl' ? 'chevL' : 'chevR');
  $('pv-zoom-in').innerHTML = icon('zoomIn');
  $('pv-zoom-out').innerHTML = icon('zoomOut');
  $('pv-download').innerHTML = icon('download');
  $('pv-close').innerHTML = icon('x');
  $('pv-prev').onclick = () => { S.previewIdx = (S.previewIdx - 1 + S.previewList.length) % S.previewList.length; showPreview(); };
  $('pv-next').onclick = () => { S.previewIdx = (S.previewIdx + 1) % S.previewList.length; showPreview(); };
  $('pv-close').onclick = () => { $('preview-modal').hidden = true; };
  $('preview-modal').onclick = (e) => { if (e.target.id === 'preview-modal') $('preview-modal').hidden = true; };
  $('pv-zoom-in').onclick = () => { zoom = Math.min(4, zoom + 0.25); const img = body.querySelector('img'); if (img) img.style.transform = `scale(${zoom})`; };
  $('pv-zoom-out').onclick = () => { zoom = Math.max(0.25, zoom - 0.25); const img = body.querySelector('img'); if (img) img.style.transform = `scale(${zoom})`; };
  $('pv-download').onclick = () => downloadFile(f);
}
function downloadFile(f) {
  const a = document.createElement('a');
  a.href = `/api/files/${f.id}/download`;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function openCtx(x, y, f) {
  const m = $('ctx');
  const trashed = S.view === 'trash';
  const items = trashed ? [
    ['restore', t('restore'), 'restore', async () => { await post(`/trash/${f.id}/restore`, {}); refreshFiles(); refreshUsage(); }],
    ['del', t('deleteForever'), 'trash', async () => { if (confirm(t('delPermConfirm'))) { await del(`/trash/${f.id}`); refreshFiles(); refreshUsage(); } }],
  ] : [
    ['open', t('open'), 'file', () => openFile(f)],
    ['dl', t('download'), 'download', () => downloadFile(f)],
    ['ren', t('rename'), 'pencil', () => renameDialog(f)],
    ['mv', t('move'), 'move', () => moveDialog([f.id])],
    ['fav', f.is_favorite ? t('unfavorite') : t('favorite'), 'star', async () => { await patch(`/files/${f.id}`, { is_favorite: !f.is_favorite }); refreshFiles(); }],
    ['trash', t('moveToTrash'), 'trash', async () => {
      const hard = S.settings && S.settings.trash_behavior === 'permanent';
      if (hard) {
        if (!confirm(t('delPermConfirm'))) return;
        await del(`/files/${f.id}?mode=permanent`);
      } else {
        await del(`/files/${f.id}`);
      }
      refreshFiles(); refreshUsage();
    }],
    ['props', t('properties'), 'info', () => propsDialog(f)],
  ];
  if (!trashed && f.status !== 'available') {
    items.push(['verify', t('verify'), 'refresh', async () => {
      const r = await post(`/files/${f.id}/check`, {});
      toast(r.available ? t('available') : t('unavailable'), r.available ? 'ok' : 'error');
      refreshFiles();
    }]);
  }
  m.innerHTML = items.map(([k, label, ic, , danger]) => `<button data-k="${k}" class="${danger ? 'danger' : ''}">${icon(ic)}<span>${esc(label)}</span></button>`).join('');
  m.querySelectorAll('button').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); m.hidden = true; items.find(([k]) => k === b.dataset.k)[3](); };
  });
  m.hidden = false;
  const w = 210, h = items.length * 36 + 12;
  m.style.left = Math.min(x, window.innerWidth - w - 8) + 'px';
  m.style.top = Math.min(y, window.innerHeight - h - 8) + 'px';
}
function folderCtx(x, y, folderId) {
  const m = $('ctx');
  const f = S.folders.find((z) => z.id === folderId);
  m.innerHTML = `
    <button data-k="open">${icon('folder')}<span>${esc(t('open'))}</span></button>
    <button data-k="ren">${icon('pencil')}<span>${esc(t('rename'))}</span></button>
    <button data-k="mv">${icon('move')}<span>${esc(t('move'))}</span></button>
    <button data-k="del">${icon('trash')}<span>${esc(t('moveToTrash'))}</span></button>`;
  m.hidden = false;
  m.style.left = Math.min(x, window.innerWidth - 218) + 'px';
  m.style.top = Math.min(y, window.innerHeight - 180) + 'px';
  m.querySelector('[data-k=open]').onclick = () => { m.hidden = true; S.folderId = folderId; S.offset = 0; refreshFolders(); refreshFiles(); };
  m.querySelector('[data-k=ren]').onclick = () => { m.hidden = true; renameFolderDialog(f); };
  m.querySelector('[data-k=mv]').onclick = () => { m.hidden = true; moveFolderDialog(f); };
  m.querySelector('[data-k=del]').onclick = async () => {
    m.hidden = true;
    try { await del(`/folders/${folderId}`); }
    catch (e) {
      if (e.code === 'FOLDER_NOT_EMPTY' && confirm(`${e.message} Move contents to trash and delete?`)) {
        await del(`/folders/${folderId}?mode=trash`);
      } else if (e.code !== 'FOLDER_NOT_EMPTY') toast(e.message, 'error');
      else return;
    }
    refreshFolders(); refreshFiles(); refreshUsage();
  };
}

/* ---------------- Dialogs ---------------- */
function openModal(html) { $('modal-box').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; $('modal-box').innerHTML = ''; }
$('modal')?.addEventListener?.('click', (e) => { if (e.target.id === 'modal') closeModal(); });

function newFolderDialog() {
  openModal(`<h2>${esc(t('newFolder'))}</h2><div class="form-grid">
    <label>${esc(t('folderName'))}</label><input id="m-name" type="text" maxlength="120">
    <div class="row"><span class="spacer"></span><button class="btn ghost" id="m-cancel">${esc(t('cancel'))}</button>
    <button class="btn primary" id="m-ok">${esc(t('create'))}</button></div></div>`);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = async () => {
    const name = $('m-name').value.trim();
    if (!name) return;
    try { await post('/folders', { name, parent_id: S.folderId }); closeModal(); refreshFolders(); }
    catch (e) { toast(e.message, 'error'); }
  };
  $('m-name').focus();
}
function renameDialog(f) {
  openModal(`<h2>${esc(t('rename'))}</h2><div class="form-grid">
    <label>${esc(t('fileName'))}</label><input id="m-name" type="text" value="${esc(f.name)}" maxlength="180">
    <div class="row"><span class="spacer"></span><button class="btn ghost" id="m-cancel">${esc(t('cancel'))}</button>
    <button class="btn primary" id="m-ok">${esc(t('save'))}</button></div></div>`);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = async () => {
    try { await patch(`/files/${f.id}`, { name: $('m-name').value }); closeModal(); refreshFiles(); }
    catch (e) { toast(e.message, 'error'); }
  };
}
function renameFolderDialog(f) {
  openModal(`<h2>${esc(t('rename'))}</h2><div class="form-grid">
    <label>${esc(t('folderName'))}</label><input id="m-name" type="text" value="${esc(f.name)}" maxlength="120">
    <div class="row"><span class="spacer"></span><button class="btn ghost" id="m-cancel">${esc(t('cancel'))}</button>
    <button class="btn primary" id="m-ok">${esc(t('save'))}</button></div></div>`);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = async () => {
    try { await patch(`/folders/${f.id}`, { name: $('m-name').value }); closeModal(); refreshFolders(); }
    catch (e) { toast(e.message, 'error'); }
  };
}
function folderOptions(excludeId) {
  const opts = [`<option value="">${esc(t('root'))}</option>`];
  const walk = (pid, depth) => {
    for (const f of S.folders.filter((z) => ((z.parent_id == null ? null : z.parent_id) ?? null) === pid)) {
      if (f.id === excludeId) continue;
      opts.push(`<option value="${f.id}">${'&nbsp;'.repeat(depth * 4)}${esc(f.name)}</option>`);
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return opts.join('');
}
function moveDialog(ids) {
  openModal(`<h2>${esc(t('moveTo'))}</h2><div class="form-grid">
    <select id="m-folder">${folderOptions()}</select>
    <div class="row"><span class="spacer"></span><button class="btn ghost" id="m-cancel">${esc(t('cancel'))}</button>
    <button class="btn primary" id="m-ok">${esc(t('move'))}</button></div></div>`);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = async () => {
    const fid = $('m-folder').value === '' ? null : Number($('m-folder').value);
    for (const id of ids) { try { await patch(`/files/${id}`, { folder_id: fid }); } catch (e) { toast(e.message, 'error'); } }
    S.selection.clear(); closeModal(); refreshFiles();
  };
}
function moveFolderDialog(f) {
  openModal(`<h2>${esc(t('moveTo'))}: ${esc(f.name)}</h2><div class="form-grid">
    <select id="m-folder">${folderOptions(f.id)}</select>
    <div class="row"><span class="spacer"></span><button class="btn ghost" id="m-cancel">${esc(t('cancel'))}</button>
    <button class="btn primary" id="m-ok">${esc(t('move'))}</button></div></div>`);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = async () => {
    const fid = $('m-folder').value === '' ? null : Number($('m-folder').value);
    try { await patch(`/folders/${f.id}`, { parent_id: fid }); closeModal(); refreshFolders(); }
    catch (e) { toast(e.message, 'error'); }
  };
}
async function propsDialog(f) {
  let loc = t('root');
  if (f.folder_id != null) {
    const p = await get(`/folders/${f.folder_id}/path`).catch(() => ({ path: [] }));
    if (p.path && p.path.length) loc = p.path.map((x) => x.name).join(' / ');
  }
  openModal(`<h2>${esc(t('propsTitle'))}</h2><div class="form-grid">
    <div class="row"><strong>${esc(t('pName'))}:</strong><span>${esc(f.name)}</span></div>
    <div class="row"><strong>${esc(t('pType'))}:</strong><span>${esc(f.mime_type)}</span></div>
    <div class="row"><strong>${esc(t('pSize'))}:</strong><span>${fmtBytes(f.size)}</span></div>
    <div class="row"><strong>${esc(t('pLocation'))}:</strong><span>${esc(loc)}</span></div>
    <div class="row"><strong>${esc(t('pCreated'))}:</strong><span>${fmtDate(f.created_at)}</span></div>
    <div class="row"><strong>${esc(t('pUpdated'))}:</strong><span>${fmtDate(f.updated_at)}</span></div>
    <div class="row"><strong>${esc(t('pStorage'))}:</strong><span>${f.status === 'available' ? esc(t('available')) : esc(t('unavailable'))}</span></div>
    <div class="row"><span class="spacer"></span>
      <button class="btn" id="m-verify">${icon('refresh')} ${esc(t('verify'))}</button>
      <button class="btn primary" id="m-ok">${esc(t('close'))}</button></div></div>`);
  $('m-ok').onclick = closeModal;
  $('m-verify').onclick = async () => {
    try {
      const r = await post(`/files/${f.id}/check`, {});
      toast(r.available ? t('available') : t('unavailable'), r.available ? 'ok' : 'error');
      closeModal(); refreshFiles();
    } catch (e) { toast(e.message, 'error'); }
  };
}
function replaceDialog(name, onReplace, onKeepBoth) {
  openModal(`<h2>${esc(name)}</h2><p class="muted">This file already exists.</p><div class="row">
    <button class="btn" id="m-both">Keep both</button><span class="spacer"></span>
    <button class="btn danger" id="m-rep">Replace</button></div>`);
  $('m-both').onclick = () => { closeModal(); onKeepBoth(); };
  $('m-rep').onclick = () => { closeModal(); onReplace(); };
}
async function settingsDialog() {
  const acc = await get('/account').catch(() => null);
  const st = (await get('/settings').catch(() => ({ settings: S.settings }))).settings || {};
  openModal(`<h2>${esc(t('settings'))}</h2><div class="form-grid">
    <div><strong>${esc(t('account'))}:</strong> ${esc((S.user && S.user.display_name) || '')} ${S.user && S.user.username ? '(@' + esc(S.user.username) + ')' : ''}</div>
    <div><strong>${esc(t('connectedBot'))}:</strong> ${acc && acc.storage.bot_username ? '@' + esc(acc.storage.bot_username) : '—'}</div>
    <div><strong>${esc(t('connStatus'))}:</strong> ${acc && acc.storage.connected ? esc(t('connected')) : esc(t('connError') + (acc && acc.storage.status ? ' (' + acc.storage.status + ')' : ''))}</div>
    <div class="row"><button class="btn" id="m-test">${icon('refresh')} ${esc(t('testConn'))}</button>
      <button class="btn danger" id="m-disc">${esc(t('disconnect'))}</button></div>
    <label>${esc(t('defaultFolder'))}</label><select id="m-deffolder">${folderOptions()}</select>
    <label>${esc(t('trashBehavior'))}</label><select id="m-trashb">
      <option value="trash">${esc(t('toTrash'))}</option><option value="permanent">${esc(t('permanent'))}</option></select>
    <label>${esc(t('appearance'))}</label><select id="m-theme">
      <option value="light">${esc(t('light'))}</option><option value="dark">${esc(t('dark'))}</option><option value="system">${esc(t('system'))}</option></select>
    <label>${esc(t('language'))}</label><select id="m-lang">
      <option value="en">English</option><option value="ar">العربية</option></select>
    <div class="row"><button class="btn" id="m-logoutall">Logout all sessions</button><span class="spacer"></span>
      <button class="btn ghost" id="m-cancel">${esc(t('close'))}</button>
      <button class="btn primary" id="m-ok">${esc(t('save'))}</button></div></div>`);
  $('m-deffolder').value = st.default_folder_id || '';
  $('m-trashb').value = st.trash_behavior || 'trash';
  $('m-theme').value = st.theme || 'system';
  $('m-lang').value = st.language || LANG;
  $('m-cancel').onclick = closeModal;
  $('m-test').onclick = async () => {
    try { const r = await post('/storage/test', {}); S.connection = r.connection; toast(t('connected'), 'ok'); }
    catch (e) { toast(e.message, 'error'); }
  };
  $('m-disc').onclick = async () => {
    if (!confirm(t('disconnectConfirm'))) return;
    await post('/storage/disconnect', {}); closeModal(); location.reload();
  };
  $('m-logoutall').onclick = async () => { await post('/auth/logout-all', {}); location.reload(); };
  $('m-ok').onclick = async () => {
    try {
      S.settings = (await put('/settings', {
        default_folder_id: $('m-deffolder').value === '' ? null : Number($('m-deffolder').value),
        trash_behavior: $('m-trashb').value, theme: $('m-theme').value, language: $('m-lang').value,
      })).settings;
      applyLang(S.settings.language); applyTheme(S.settings.theme); saveLocalPrefs();
      buildSidebar(); closeModal();
    } catch (e) { toast(e.message, 'error'); }
  };
}

document.addEventListener('DOMContentLoaded', boot);
