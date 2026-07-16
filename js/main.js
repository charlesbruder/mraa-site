/* MRAA — Main JavaScript */
(function () {
  'use strict';

  // Mobile nav toggle
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileOverlay = document.querySelector('.nav__mobile-overlay');
  if (hamburger && mobileOverlay) {
    hamburger.addEventListener('click', function () {
      mobileOverlay.classList.toggle('active');
      hamburger.classList.toggle('active');
      document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
    });
    mobileOverlay.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileOverlay.classList.remove('active');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // Tab switching
  document.querySelectorAll('[data-tab-group]').forEach(function (group) {
    var tabs = group.querySelectorAll('[data-tab]');
    var panels = group.querySelectorAll('[data-tab-panel]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var targetPanel = group.querySelector('[data-tab-panel="' + target + '"]');
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  });

  // Multi-step form
  document.querySelectorAll('[data-multistep]').forEach(function (form) {
    var panels = form.querySelectorAll('.multistep__panel');
    var steps = form.querySelectorAll('.multistep__step');
    var currentStep = 0;
    function showStep(n) {
      panels.forEach(function (p, i) { p.classList.toggle('active', i === n); });
      steps.forEach(function (s, i) {
        s.classList.remove('active', 'completed');
        if (i === n) s.classList.add('active');
        if (i < n) s.classList.add('completed');
      });
    }
    form.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (currentStep < panels.length - 1) { currentStep++; showStep(currentStep); }
      });
    });
    form.querySelectorAll('[data-prev]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (currentStep > 0) { currentStep--; showStep(currentStep); }
      });
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

// --- Self-cleaning dates: past-dated items hide themselves ---
window.MRAA_pruneDates = function (todayOverride) {
  function localISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var today = todayOverride || localISO(new Date());
  var month = today.slice(0, 7);
  document.querySelectorAll('[data-date]').forEach(function (el) {
    el.style.display = today > el.getAttribute('data-date') ? 'none' : '';
  });
  document.querySelectorAll('[data-month]').forEach(function (el) {
    el.style.display = month > el.getAttribute('data-month') ? 'none' : '';
  });
  document.querySelectorAll('[data-empty-note]').forEach(function (c) {
    var any = Array.prototype.some.call(c.querySelectorAll('[data-date]'), function (el) { return el.style.display !== 'none'; });
    var note = c.querySelector('.no-upcoming');
    if (!any && !note) {
      note = document.createElement('p');
      note.className = 'no-upcoming text-center text-muted';
      note.textContent = c.getAttribute('data-empty-note');
      c.appendChild(note);
    } else if (any && note) {
      note.remove();
    }
  });
  document.querySelectorAll('[data-hide-when-empty]').forEach(function (c) {
    var any = Array.prototype.some.call(c.querySelectorAll('[data-date], [data-month]'), function (el) { return el.style.display !== 'none'; });
    c.style.display = any ? '' : 'none';
  });
};
window.MRAA_pruneDates();
