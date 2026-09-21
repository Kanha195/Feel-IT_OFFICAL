/* feelit-upgrade.js — load AFTER script.js (index.html only):
   <script src="feelit-upgrade.js"></script>
   Additive: wraps a few functions from script.js, changes nothing else.
   No timers, no animation loops, no polling — it only runs on clicks. */
(() => {
  'use strict';

  /* ---- Business rules: edit here ---- */
  const RULES = {
    localFactor: 0.6,  // Nepali-resident price = visitor price × this (unless the tour has price_local)
    depositPct: 0.3,   // 30% now, remainder due in person on Day 1
    roundTo: 100       // NPR rounding for the derived local price
  };
  window.FI_RULES = RULES; // read by the admin panel's profit view

  /* ---- EmailJS (public identifiers, meant to live in client code) ---- */
  Object.assign(EMAILJS_CONFIG, { publicKey: 'wDN-iPgsFnYecariG', serviceId: 'service_h2b4s5n' });
  const TEMPLATES = { booking: '', contact: '' }; // paste your EmailJS template IDs to switch emails on
  if (TEMPLATES.booking) {
    Object.assign(EMAILJS_CONFIG, {
      bookingTemplateId: TEMPLATES.booking,
      contactTemplateId: TEMPLATES.contact || TEMPLATES.booking,
      enabled: true
    });
    initEmailJS();
  }

  /* ---- Helpers ---- */
  const $ = id => document.getElementById(id);
  const list = v => (Array.isArray(v) ? v : (s => s.includes('\n') ? s.split('\n') : s.split(','))(String(v || ''))).map(s => String(s).trim()).filter(Boolean);

  function daysOf(t) {
    const s = String(t.duration || '');
    if (/hour|half|full/i.test(s)) return 1;
    const m = s.match(/(\d+)/);
    return m ? Math.max(1, +m[1]) : 1;
  }
  function addDays(iso, n) { // pure UTC math — no timezone drift
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  }
  const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  function quote(t, type, n, opt) {
    const base = Number(t.price) || 0;
    const unit = type === 'local'
      ? (Number(t.price_local) || Math.round(base * RULES.localFactor / RULES.roundTo) * RULES.roundTo)
      : base;
    const total = unit * n;
    const payNow = opt === 'deposit' ? Math.round(total * RULES.depositPct) : total;
    return { unit, total, payNow, due: total - payNow };
  }

  // Real scarcity only: counts actual bookings against the tour's max_slots.
  // Returns null (no message shown) if max_slots is unset or the query fails.
  async function slotsLeft(t, date) {
    const cap = Number(t.max_slots) || 0;
    if (!cap) return null;
    const { data, error } = await supabaseClient.from('bookings').select('travelers, status').eq('tour_id', t.id).eq('date', date);
    if (error || !data) return null;
    const used = data.filter(b => !/cancel/i.test(b.status || '')).reduce((s, b) => s + (Number(b.travelers) || 0), 0);
    return Math.max(0, cap - used);
  }

  document.head.insertAdjacentHTML('beforeend', `<style>
    .fi-box{display:grid;gap:10px;margin:0 0 16px}
    .fi-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .fi-seg label{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:10px;font-size:13px;cursor:pointer;display:flex;gap:6px;align-items:flex-start}
    .fi-seg label:has(input:checked){border-color:#22d3ee;background:rgba(34,211,238,.1)}
    .fi-sum,.fi-pay{border-radius:10px;padding:12px;background:rgba(128,128,128,.1);font-size:14px;line-height:1.6;margin:10px 0}
    .fi-h{margin:14px 0 6px;font-size:14px}
    .fi-no{padding-left:20px;margin:0 0 14px;font-size:14px;list-style:'✕  '}
    .fi-warn{color:#f59e0b;font-weight:600;font-size:13px;min-height:0}
    .fi-card-local{font-size:12px;color:var(--ink-soft);margin:-8px 0 10px}
  </style>`);

  /* ---- Tour cards (main grid): show the Nepali-resident price under the visitor price,
     so people can see it while browsing, before opening a tour. ---- */
  const _renderTours = window.renderTours;
  window.renderTours = function () {
    _renderTours();
    const list = activeFilter === 'All' ? tours : tours.filter(x => x.region === activeFilter);
    document.querySelectorAll('#tourGrid .card').forEach((card, i) => {
      const t = list[i], priceEl = card.querySelector('.card-price');
      if (!t || !priceEl) return;
      const base = Number(t.price) || 0;
      const local = Number(t.price_local) || Math.round(base * RULES.localFactor / RULES.roundTo) * RULES.roundTo;
      priceEl.insertAdjacentHTML('afterend',
        `<div class="fi-card-local">🇳🇵 Nepali resident: ${fmtNPR(local)} <small>/ person</small></div>`);
    });
  };

  /* ---- Tour modal: included/excluded, tourist/local, 100% / 30%, return date, slots ---- */
  const _open = window.openTour;
  let slotTimer, slotToken = 0;

  window.openTour = function (id) {
    _open(id);
    const t = tours.find(x => x.id === id), m = $('modalContent');
    const inc = m && m.querySelector('.include-list'), price = m && m.querySelector('.card-price');
    if (!t || !inc || !price) return;

    inc.insertAdjacentHTML('beforebegin', '<h4 class="fi-h">What’s included</h4>');
    const ex = list(t.excludes);
    if (ex.length) inc.insertAdjacentHTML('afterend',
      `<h4 class="fi-h">What’s not included</h4><ul class="fi-no">${ex.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);

    price.insertAdjacentHTML('beforebegin', `
      <div class="fi-box" id="fiBox">
        <div class="fi-seg">
          <label><input type="radio" name="fiType" value="tourist" checked>Visitor from abroad</label>
          <label><input type="radio" name="fiType" value="local">Nepali resident</label>
        </div>
        <div class="fi-seg">
          <label><input type="radio" name="fiOpt" value="full" checked>Pay 100% now</label>
          <label><input type="radio" name="fiOpt" value="deposit">Pay ${Math.round(RULES.depositPct * 100)}% now, rest on Day 1</label>
        </div>
        <div class="fi-sum" id="fiSum"></div>
        <div class="fi-warn" id="fiSlots"></div>
      </div>`);

    const upd = () => refresh(t);
    ['fiBox', 'tourDate', 'tourTravelers'].forEach(i => $(i).addEventListener('input', upd)); // elements are recreated per open, so no listener build-up
    upd();
  };

  function choice() {
    const q = n => document.querySelector(`input[name=${n}]:checked`).value;
    return { type: q('fiType'), opt: q('fiOpt') };
  }

  function refresh(t) {
    const { type, opt } = choice();
    const n = Math.min(6, Math.max(1, parseInt($('tourTravelers').value, 10) || 1));
    const date = $('tourDate').value, q = quote(t, type, n, opt), days = daysOf(t);

    document.querySelector('#modalContent .card-price').innerHTML =
      `${fmtNPR(q.unit)} <small>/ person · ${type === 'local' ? 'Nepali resident rate' : 'visitor rate'}</small>`;

    $('fiSum').innerHTML =
      `Total <strong>${fmtNPR(q.total)}</strong> · Pay now <strong>${fmtNPR(q.payNow)}</strong>` +
      (q.due ? `<br>${fmtNPR(q.due)} due in person on Day 1` : '') +
      (date ? `<br>${days > 1 ? `Departs ${fmtDate(date)} → back ${fmtDate(addDays(date, days - 1))}` : `Ride date ${fmtDate(date)}`}` : '') +
      (type === 'local' ? '<br><small>Resident rate: please carry your Nepali citizenship card or licence at check-in.</small>' : '');

    clearTimeout(slotTimer);
    const tok = ++slotToken;
    $('fiSlots').textContent = '';
    if (date && Number(t.max_slots) > 0) {
      slotTimer = setTimeout(async () => {
        const left = await slotsLeft(t, date);
        const el = $('fiSlots');
        if (tok !== slotToken || left === null || left > 3 || !el) return;
        el.textContent = left ? `Only ${left} spot${left > 1 ? 's' : ''} left on this date` : 'This date is fully booked — please pick another day';
      }, 400);
    }
  }

  /* ---- Checkout ---- */
  window.goToCheckout = async function (id) {
    const t = tours.find(x => x.id === id);
    if (!t) return;
    const date = $('tourDate').value;
    const n = parseInt($('tourTravelers').value || '1', 10);
    if (!date) return showToast('Please select a tour date.', 'error');
    if (!n || n < 1 || n > 6) return showToast('Travelers must be between 1 and 6.', 'error');

    const left = await slotsLeft(t, date);
    if (left !== null && n > left) return showToast(left ? `Only ${left} spot(s) left on that date.` : 'That date is fully booked.', 'error');

    const { type, opt } = choice();
    const q = quote(t, type, n, opt);
    const sessionUser = await checkActiveAuthUser();
    pendingBooking = {
      tourId: t.id, title: t.title, date, travelers: n, total: q.total, sessionUser, paymentMethod: null,
      type, option: opt, payNow: q.payNow, due: q.due, returnDate: addDays(date, daysOf(t) - 1)
    };
    renderPaymentMethodSelector();
  };

  const _sel = window.renderPaymentMethodSelector, _form = window.renderPaymentForm;
  window.renderPaymentMethodSelector = function () { _sel(); breakdown(); };
  window.renderPaymentForm = function () {
    if (!pendingBooking || !pendingBooking.paymentMethod) return _form();
    _form(); breakdown();
  };

  function breakdown() {
    const b = pendingBooking, sub = document.querySelector('#modalContent .sub');
    if (!b || !b.option || !sub) return;
    sub.innerHTML = sub.innerHTML.replace('Total:', 'Full price:');
    const hint = document.querySelector('#modalContent .qr-hint');
    if (hint) hint.innerHTML = hint.innerHTML.replace('the exact amount above', 'the “Pay now” amount');
    sub.insertAdjacentHTML('afterend',
      `<div class="fi-pay"><strong>Pay now: ${fmtNPR(b.payNow)}</strong> (${b.option === 'deposit' ? Math.round(RULES.depositPct * 100) + '% deposit' : '100%'})` +
      (b.due ? `<br>Due in person on Day 1: ${fmtNPR(b.due)}` : '') +
      `<br>Return date: ${fmtDate(b.returnDate)}</div>`);
  }

  window.submitFinalBooking = async function () {
    const b = pendingBooking;
    const name = $('bkName').value.trim(), email = $('bkEmail').value.trim();
    const phone = $('bkPhone').value.trim(), txnRef = $('bkTxnRef').value.trim();
    if (!name || !email || !phone || !txnRef) return showToast('Please complete all fields including your transaction reference ID.', 'error');
    if (!isValidEmail(email)) return showToast('Please enter a valid email address.', 'error');
    if (!$('bkAgreeTerms').checked) return showToast('Please confirm you’ve paid and agree to the Terms & Conditions.', 'error');
    if (!b || !b.paymentMethod) return showToast('Something went wrong — please start the booking again.', 'error');

    const restore = setBusy($('submitBookingBtn'), 'Submitting…');
    const ref = 'FEEL-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const legacy = {
      ref, tour_id: b.tourId, tour_title: b.title, date: b.date, travelers: b.travelers, total: b.total,
      name, email, phone, txn_ref: txnRef, payment_method: b.paymentMethod, status: 'Pending', guide: null, guide_phone: null
    };
    const extra = { traveler_type: b.type, payment_option: b.option, amount_paid: b.payNow, amount_due: b.due, return_date: b.returnDate };

    let { error } = await supabaseClient.from('bookings').insert([{ ...legacy, ...extra }]);
    if (error && /column|schema/i.test(error.message || '')) {
      // supabase-upgrade.sql not run yet: save in the old shape so no booking is ever lost
      const note = `${b.type} | ${b.option} | paid ${b.payNow} | due Day 1 ${b.due} | return ${b.returnDate}`;
      ({ error } = await supabaseClient.from('bookings').insert([{ ...legacy, txn_ref: `${txnRef} | ${note}` }]));
    }
    if (error) {
      console.error('Booking failed', error);
      showToast(`Could not submit your booking — please try again or contact us directly: ${error.message}`, 'error');
      restore();
      return;
    }

    notifyByEmail(EMAILJS_CONFIG.bookingTemplateId, {
      to_email: CONTACT_INFO.email, booking_ref: ref, tour_title: b.title, date: b.date, return_date: b.returnDate,
      travelers: b.travelers, total: b.total, pay_now: b.payNow, due_day1: b.due, traveler_type: b.type,
      customer_name: name, customer_email: email, customer_phone: phone,
      payment_method: PAYMENT_METHODS[b.paymentMethod]?.label || b.paymentMethod, txn_ref: txnRef
    });

    restore();
    showToast('Payment details submitted!', 'success');
    $('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeOverlay()">&times;</button>
      <h2>Payment submitted — pending verification</h2>
      <p class="sub">Your booking reference: <strong>${ref}</strong></p>
      <div class="pending-box">
        <p style="margin:4px 0;">We’ve received your payment details for <strong>${esc(b.title)}</strong>, departing <strong>${esc(fmtDate(b.date))}</strong> and returning <strong>${esc(fmtDate(b.returnDate))}</strong>.</p>
        <p style="margin:4px 0;">Paid now: <strong>${fmtNPR(b.payNow)}</strong>${b.due ? ` · Due in person on Day 1: <strong>${fmtNPR(b.due)}</strong>` : ''}</p>
        <p style="margin:4px 0;">Our team verifies each transaction reference and assigns your rider by hand — never automatically.</p>
        <p style="margin:4px 0;font-size:13px;color:var(--ink-soft);">Once confirmed, your rider’s details appear under <strong>My Account</strong>, and we’ll reach you at ${esc(email)}.</p>
      </div>
      <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">Done</button>`;
    pendingBooking = null;
  };
})();
