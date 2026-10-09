/* Feel It Ops loader */
(async function(){
  const files = ['ops-c0.js', 'ops-c1.js', 'ops-c2.js'];
  for (const f of files) {
    const r = await fetch(f + '?v=2');
    const code = await r.text();
    const s = document.createElement('script');
    s.text = code;
    document.body.appendChild(s);
  }
})();
