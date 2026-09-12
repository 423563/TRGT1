/* sw.js - Binance Filter PWA Service Worker */
const CACHE_NAME = 'bf-cache-v4';
const ALARM_CHECK_INTERVAL = 60000; // 60 saniye

/* ---- Cache ---- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['./index.html', './icon-192.png', './icon-512.png', './manifest.json'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // HTML/navigasyon isteklerinde her zaman en güncel index.html'i almaya çalış (network-first)
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Diğer tüm isteklerde mevcut cache-first davranışını koru
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

/* ---- Arka plan alarm kontrolu ---- */
let alarmTimer = null;

// Ana sayfa SW'ye mesaj gonderdiginde alarmlari kontrol etmeye basla/durdur
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'START_ALARM_CHECK') {
    startAlarmLoop();
  }
  if (e.data && e.data.type === 'STOP_ALARM_CHECK') {
    stopAlarmLoop();
  }
});

function startAlarmLoop() {
  stopAlarmLoop();
  checkAlarmsBackground();
  alarmTimer = setInterval(checkAlarmsBackground, ALARM_CHECK_INTERVAL);
}

function stopAlarmLoop() {
  if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
}

async function checkAlarmsBackground() {
  try {
    // localStorage SW'den erisilemez - IndexedDB veya clients uzerinden al
    const allClients = await self.clients.matchAll({ type: 'window' });

    // Eger uygulama aciksa, kontrol ana sayfada zaten yapiliyor - atla
    if (allClients.length > 0) return;

    // Uygulama kapali - alarmlari kontrol et
    // Alarmlari cache'den oku (ana sayfa her degisiklikte cache'e yazar)
    const cache = await caches.open(CACHE_NAME);
    const alarmResp = await cache.match('bf-alarms-data');
    if (!alarmResp) return;

    const alarmData = await alarmResp.json();
    const alarms = alarmData.alarms || [];
    const activeAlarms = alarms.filter(a => !a.triggered);

    if (!activeAlarms.length) { stopAlarmLoop(); return; }

    // Her alarm icin Binance API'den veri cek
    const TIMEFRAMES_MAP = {
      '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '2h': '2h', '4h': '4h',
      '6h': '6h', '8h': '8h', '1d': '1d',
      '1w': '1w', '1M': '1M'
    };

    const BB_PERIOD = 20;
    const triggered = [];

    for (const alarm of activeAlarms) {
      try {
        const interval = TIMEFRAMES_MAP[alarm.tfId];
        if (!interval) continue;

        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${alarm.symbol}&interval=${interval}&limit=${BB_PERIOD}`;
        const resp = await fetch(url);
        const klines = await resp.json();

        if (!klines || klines.length < BB_PERIOD) continue;

        // Bollinger Band hesapla
        const closes = klines.map(k => parseFloat(k[4]));
        const sma = closes.reduce((a, b) => a + b, 0) / BB_PERIOD;
        const std = Math.sqrt(closes.reduce((s, v) => s + (v - sma) ** 2, 0) / BB_PERIOD);
        const upper = sma + 2 * std;
        const lower = sma - 2 * std;
        const lastClose = closes[closes.length - 1];

        // 1 = GREEN (yukselis), 2 = RED (dusus)
        let state = null;
        if (lastClose > upper) state = 1;
        else if (lastClose < lower) state = 2;
        else if (lastClose > sma) state = 1;
        else if (lastClose < sma) state = 2;

        if (state !== null && state === alarm.dir) {
          alarm.triggered = true;
          triggered.push(alarm);
        }
      } catch (err) { /* tek coin hatasi atlansın */ }
    }

    if (triggered.length) {
      // Alarmlari guncelle
      const updatedResp = new Response(JSON.stringify({ alarms }));
      await cache.put('bf-alarms-data', updatedResp);

      // Her tetiklenen alarm icin bildirim gonder
      for (const alarm of triggered) {
        const dir = alarm.dir === 1 ? 'YUKSELIS' : 'DUSUS';
        const coin = alarm.symbol.replace('USDT', '/USDT');
        const saat = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        await self.registration.showNotification('Binance Filter Alarm', {
          body: `${coin} - ${dir} (${alarm.tfId}) - ${saat}`,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: `alarm-${alarm.id}`,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: { url: './', alarmId: alarm.id }
        });
      }
    }
  } catch (err) { /* sessiz hata */ }
}

// Bildirime tiklaninca uygulamayi ac
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow(e.notification.data.url || './');
      }
    })
  );
});
