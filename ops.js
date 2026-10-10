/* Feel It Ops loader v11 */
(async function(){
  try {
    const parts = ['ops-p0.js','ops-p1.js','ops-p2.js','ops-p3.js'];
    let code = '';
    for (const f of parts) {
      const r = await fetch(f + '?v=11');
      if (!r.ok) throw new Error('Failed to load ' + f + ' (' + r.status + ')');
      code += await r.text();
    }
    const s = document.createElement('script');
    s.text = code;
    document.body.appendChild(s);
  } catch (e) {
    document.body.innerHTML = '<div style="padding:40px;background:#0B0F19;color:#fff;font-family:system-ui;min-height:100vh"><h1>Ops load error</h1><p>' + String(e.message||e) + '</p><p>Hard refresh (Ctrl+Shift+R).</p><a href="index.html" style="color:#00F5D4">Guest site</a></div>';
  }
})();
