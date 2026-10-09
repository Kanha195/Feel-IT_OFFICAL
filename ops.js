/* Feel It Ops loader v5 */
(async function(){
  const files = ['ops-c0.js', 'ops-c1.js', 'ops-c2.js'];
  for (const f of files) {
    const r = await fetch(f + '?v=5');
    if (!r.ok) { console.error('Missing', f, r.status); continue; }
    const code = await r.text();
    const s = document.createElement('script');
    s.text = code;
    document.body.appendChild(s);
  }
})();
