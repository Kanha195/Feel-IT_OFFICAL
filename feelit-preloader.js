/* Feel It Nepal — Dowie + Snowie character preloader
   Keeps the existing page-load flow intact; only replaces the visual loader. */
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
  let hideTimer = null;
  let done = false;

  const startMessages = () => {
    if (!status || messageTimer) return;
    let i = 0;
    status.textContent = messages[0];
    messageTimer = window.setInterval(() => {
      i = (i + 1) % messages.length;
      status.textContent = messages[i];
    }, 1050);
  };

  const finish = () => {
    if (done) return;
    done = true;
    if (messageTimer) window.clearInterval(messageTimer);
    if (status) status.textContent = 'Dowie & Snowie are ready to ride.';
    loader.classList.add('loader-done');
    hideTimer = window.setTimeout(() => loader.remove(), 650);
  };

  startMessages();

  // Normal path: don't hold the visitor once the page is ready.
  if (document.readyState === 'complete') {
    window.requestAnimationFrame(() => window.setTimeout(finish, 280));
  } else {
    window.addEventListener('load', () => window.setTimeout(finish, 280), { once: true });
  }

  // Hard failsafe: even if a third-party resource stalls, the loader cannot
  // trap the visitor on a blank screen.
  window.setTimeout(finish, 5600);
})();
