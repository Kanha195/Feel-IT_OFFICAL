/* Feel It Nepal — Dowie + Snowie preloader (nav-safe) */
(() => {
  'use strict';
  const loader = document.getElementById('pageLoader');
  const status = document.getElementById('loaderStatus');
  if (!loader) return;

  const messages = [
    'getting your Nepal adventure ready…',
    'packing the map…',
    'checking the mountain roads…',
    'Dowie & Snowie are ready to ride.'
  ];

  let messageTimer = null;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    if (messageTimer) window.clearInterval(messageTimer);
    if (status) status.textContent = 'Dowie & Snowie are ready to ride.';
    loader.classList.add('loader-done');
    // Hard remove so it can NEVER block clicks or look like a stuck page
    window.setTimeout(() => {
      try { loader.remove(); } catch (e) {}
    }, 500);
  };

  if (status) {
    let i = 0;
    status.textContent = messages[0];
    messageTimer = window.setInterval(() => {
      i = (i + 1) % messages.length;
      status.textContent = messages[i];
    }, 1050);
  }

  if (document.readyState === 'complete') {
    window.setTimeout(finish, 280);
  } else {
    window.addEventListener('load', () => window.setTimeout(finish, 280), { once: true });
  }
  // Failsafe — never trap the visitor
  window.setTimeout(finish, 4500);
})();
