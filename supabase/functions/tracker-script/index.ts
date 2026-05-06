// Serves the public tracking snippet as JS.
// Cookieless, GDPR-friendly. Respects consent, DNT and GPC.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const TRACK_ENDPOINT = `${SUPABASE_URL}/functions/v1/track-visit`;
const FORGET_ENDPOINT = `${SUPABASE_URL}/functions/v1/forget-visitor`;

const SCRIPT = `(function(){
  try {
    var s = document.currentScript;
    var siteKey = (s && s.getAttribute('data-site')) || new URLSearchParams((s && s.src.split('?')[1]) || '').get('site');
    if (!siteKey) return;
    var endpoint = '__TRACK_ENDPOINT__';
    var forgetEndpoint = '__FORGET_ENDPOINT__';

    // Privacy signals — abort completely
    try {
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1') return;
      if (navigator.globalPrivacyControl === true) return;
    } catch(e) {}

    // Consent gating: tracking only runs if explicitly granted
    var consentAttr = s && s.getAttribute('data-consent');
    var consentGranted = consentAttr === 'granted';

    function uuid() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4).toString(16);
      });
    }

    // Cookieless: client_seed lives only in sessionStorage (cleared on tab close)
    // Server combines it with hashed IP + UA + day to derive a stable visitor_id for the session
    var clientSeed = null;
    var sid = null;
    try {
      clientSeed = sessionStorage.getItem('ml_seed');
      if (!clientSeed) { clientSeed = uuid(); sessionStorage.setItem('ml_seed', clientSeed); }
      sid = sessionStorage.getItem('ml_sid');
      var lastSeen = parseInt(sessionStorage.getItem('ml_sid_t') || '0', 10);
      if (!sid || (Date.now() - lastSeen) > 30*60*1000) {
        sid = uuid();
        sessionStorage.setItem('ml_sid', sid);
      }
      sessionStorage.setItem('ml_sid_t', String(Date.now()));
    } catch(e) {
      clientSeed = clientSeed || uuid();
      sid = sid || uuid();
    }

    function post(payload, useBeacon) {
      var ok = false;
      if (useBeacon) {
        try {
          if (navigator.sendBeacon) {
            var blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
            ok = navigator.sendBeacon(endpoint, blob);
          }
        } catch(e) {}
      }
      if (!ok) {
        try {
          return fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload),
            keepalive: true,
            mode: 'cors'
          }).then(function(r){ return r.json().catch(function(){ return null; }); });
        } catch(e) {}
      }
      return null;
    }

    var visitId = null;
    var visitorId = null;
    var startedAt = Date.now();
    var maxScroll = 0;
    var sentInitial = false;
    var sentFinal = false;

    function getScrollPct() {
      var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      if (h <= 0) return 100;
      return Math.min(100, Math.round((window.scrollY / h) * 100));
    }
    window.addEventListener('scroll', function(){
      var p = getScrollPct();
      if (p > maxScroll) maxScroll = p;
    }, { passive: true });

    function sendInitial(extra) {
      if (!consentGranted) return;
      if (sentInitial && !extra) return;
      sentInitial = true;
      startedAt = Date.now();
      var params = new URLSearchParams(window.location.search);
      var mlE = params.get('ml_e');
      if (mlE) {
        try {
          params.delete('ml_e');
          var qs = params.toString();
          var newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        } catch(e) {}
      }
      var payload = {
        type: 'pageview',
        site_key: siteKey,
        client_seed: clientSeed,
        session_id: sid,
        url: window.location.href,
        referrer: document.referrer || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        screen_w: window.innerWidth,
        screen_h: window.innerHeight,
        consent: true,
        ml_e: mlE,
        email: (extra && extra.email) || null
      };
      var p = post(payload, false);
      if (p && p.then) {
        p.then(function(res){
          if (res && res.visit_id) visitId = res.visit_id;
          if (res && res.visitor_id) visitorId = res.visitor_id;
        });
      }
    }

    function sendUpdate(isFinal) {
      if (!consentGranted || !visitId) return;
      if (sentFinal && isFinal) return;
      if (isFinal) sentFinal = true;
      post({
        type: 'update',
        site_key: siteKey,
        visit_id: visitId,
        duration_ms: Date.now() - startedAt,
        scroll_depth: maxScroll,
        ended: !!isFinal
      }, isFinal);
    }

    setInterval(function(){
      if (document.visibilityState === 'visible') sendUpdate(false);
      try { sessionStorage.setItem('ml_sid_t', String(Date.now())); } catch(e) {}
    }, 15000);

    window.addEventListener('pagehide', function(){ sendUpdate(true); });
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') sendUpdate(false);
    });

    window.MailLead = {
      consent: function() { consentGranted = true; sendInitial(); },
      revoke: function() { consentGranted = false; },
      identify: function(email) {
        if (!consentGranted) return;
        sentInitial = false;
        sendInitial({ email: email });
      },
      forget: function() {
        try {
          var body = JSON.stringify({ site_key: siteKey, client_seed: clientSeed, visitor_id: visitorId });
          if (navigator.sendBeacon) {
            navigator.sendBeacon(forgetEndpoint, new Blob([body], { type: 'text/plain' }));
          } else {
            fetch(forgetEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true });
          }
          sessionStorage.removeItem('ml_seed');
          sessionStorage.removeItem('ml_sid');
          sessionStorage.removeItem('ml_sid_t');
        } catch(e) {}
      },
      sessionId: sid
    };

    if (consentGranted) sendInitial();
  } catch(e) {}
})();`
  .replace("__TRACK_ENDPOINT__", TRACK_ENDPOINT)
  .replace("__FORGET_ENDPOINT__", FORGET_ENDPOINT);

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(SCRIPT, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
});
