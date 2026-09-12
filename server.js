const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 3000;
const PASSWORD = '2255';
const INDEX    = path.join(__dirname, 'index.html');
const SINAV    = path.join(__dirname, 'sinav.html');

const GEMINI_API_KEY = 'AIzaSyCFnPXj2BUQ6IUK7oMszU1zCXugujXQj0s';
const GROQ_API_KEY  = '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';

function loginPage(errorMsg) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Binance Futures Filtre</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0d1117;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px 28px;width:300px;max-width:92vw}
    h1{color:#f0b90b;font-size:1.1rem;margin-bottom:6px}
    p{color:#8b949e;font-size:0.83rem;margin-bottom:22px;line-height:1.5}
    label{display:block;font-size:0.72rem;color:#8b949e;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px}
    input{width:100%;background:#1c2128;border:1px solid #30363d;border-radius:8px;color:#e6edf3;padding:10px 14px;font-size:1.1rem;margin-bottom:14px;outline:none}
    input:focus{border-color:#f0b90b}
    button{width:100%;background:#f0b90b;color:#000;border:none;border-radius:8px;padding:11px;font-size:.95rem;font-weight:700;cursor:pointer}
    button:hover{opacity:.85}
    .err{color:#ff4d4d;font-size:.82rem;margin-top:10px;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <h1>Binance Futures Filtre</h1>
    <p>Devam etmek için parolanızı girin</p>
    <form method="POST" action="/login">
      <label>Parola</label>
      <input type="password" name="password" autofocus autocomplete="current-password" placeholder="&#x2022;&#x2022;&#x2022;&#x2022;">
      <button type="submit">Giriş Yap</button>
      ${errorMsg ? `<div class="err">${errorMsg}</div>` : ''}
    </form>
  </div>
</body>
</html>`;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.css':  'text/css',
};

const PUBLIC_FILES = ['/manifest.json', '/sw.js', '/icon-192.png', '/icon-512.png'];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Statik dosyalar (PWA asset'leri) login gerektirmez
  if (PUBLIC_FILES.includes(url.pathname)) {
    const fp = path.join(__dirname, url.pathname);
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end('Bulunamadi'); return; }
      const ext = path.extname(url.pathname);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
    return;
  }

  if (url.pathname === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const pwd = new URLSearchParams(body).get('password');
      if (pwd === PASSWORD) {
        fs.readFile(INDEX, (err, data) => {
          if (err) { res.writeHead(500); res.end('Dosya okunamadi'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data);
        });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginPage('Hatalı parola. Tekrar deneyin.'));
      }
    });
    return;
  }

  // ---- NOVA AI Proxy Endpoints ----
  if (url.pathname === '/api/gemini' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const postBody = JSON.stringify({
          contents: payload.contents,
          generationConfig: payload.generationConfig || { maxOutputTokens: 800, temperature: 0.7 }
        });
        const geminiReq = require('https').request(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (geminiRes) => {
          let data = '';
          geminiRes.on('data', c => data += c);
          geminiRes.on('end', () => {
            res.writeHead(geminiRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(data);
          });
        });
        geminiReq.on('error', () => { res.writeHead(502); res.end(JSON.stringify({error:'Gemini proxy error'})); });
        geminiReq.write(postBody);
        geminiReq.end();
      } catch { res.writeHead(400); res.end(JSON.stringify({error:'Invalid request'})); }
    });
    return;
  }

  if (url.pathname === '/api/groq' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        const postBody = JSON.stringify({
          model: payload.model || 'llama-3.1-8b-instant',
          messages: payload.messages,
          max_tokens: payload.max_tokens || 800,
          temperature: payload.temperature || 0.7
        });
        const groqReq = require('https').request(groqUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` }
        }, (groqRes) => {
          let data = '';
          groqRes.on('data', c => data += c);
          groqRes.on('end', () => {
            res.writeHead(groqRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(data);
          });
        });
        groqReq.on('error', () => { res.writeHead(502); res.end(JSON.stringify({error:'Groq proxy error'})); });
        groqReq.write(postBody);
        groqReq.end();
      } catch { res.writeHead(400); res.end(JSON.stringify({error:'Invalid request'})); }
    });
    return;
  }

  // Her ziyarette login sayfası göster
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(loginPage(''));
});

server.listen(PORT, '0.0.0.0', () => {
  const ifaces = require('os').networkInterfaces();
  const ips = [];
  Object.values(ifaces).flat().forEach(i => {
    if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
  });

  console.log('\n========================================');
  console.log('  Binance Futures Filtre - Sunucu Acik');
  console.log('========================================\n');
  console.log('  Bilgisayar  : http://localhost:' + PORT);
  ips.forEach(ip => {
    console.log('  Telefon/Tablet: http://' + ip + ':' + PORT);
  });
  console.log('\n  Parola: ' + PASSWORD);
  console.log('\n  Durdurmak icin: Ctrl+C');
  console.log('========================================\n');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nHata: Port ${PORT} zaten kullaniliyor.`);
    console.error('Baska bir uygulama bu portu kullaniyor olabilir.\n');
  } else {
    console.error('Sunucu hatasi:', e.message);
  }
  process.exit(1);
});
