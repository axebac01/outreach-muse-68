// Serves the public tracking snippet as JS.
// Usage: <script async src="https://<project>.functions.supabase.co/tracker-script?site=SITE_KEY"></script>
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const TRACK_ENDPOINT = `${SUPABASE_URL}/functions/v1/track-visit`;

const SCRIPT = `(function(){
  try {
    var s = document.currentScript;
    var siteKey = (s && s.getAttribute('data-site')) || new URLSearchParams((s && s.src.split('?')[1]) || '').get('site');
    if (!siteKey) return;
    var endpoint = '__TRACK_ENDPOINT__';
    var requireConsent = s && s.getAttribute('data-require-consent') === 'true';

    function uuid() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4).toString(16);
      });
    }
    function getCookie(name) {
      var m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
      return m ? decodeURIComponent(m[2]) : null;
    }
    function setCookie(name, value, days) {
      var d = new Date(); d.setTime(d.getTime() + days*24*60*60*1000);
      document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    }
    var vid = getCookie('ml_vid');
    if (!vid) { vid = uuid(); setCookie('ml_vid', vid, 365); }

    // Session id: kept in sessionStorage; resets when tab closes or after 30min idle
    var sid = null;
    try {
      var stored = sessionStorage.getItem('ml_sid');
      var lastSeen = parseInt(sessionStorage.getItem('ml_sid_t') || '0', 10);
      if (stored && (Date.now() - lastSeen) < 30*60*1000) sid = stored;
    } catch(e) {}
    if (!sid) sid = uuid();
    try {
      sessionStorage.setItem('ml_sid', sid);
      sessionStorage.setItem('ml_sid_t', String(Date.now()));
    } catch(e) {}

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
    var startedAt = Date.now();
    var maxScroll = 0;
    var sentInitial = false;
    var sentFinal = false;

    function getScrollPct() {
      var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      if (h <= 0) return 100;
      return Math.min(100, Math.round((window.scrollY / h) * 100));
    }

    function trackScroll() {
      var p = getScrollPct();
      if (p > maxScroll) maxScroll = p;
    }
    window.addEventListener('scroll', trackScroll, { passive: true });

    function sendInitial(extra) {
      if (sentInitial && !extra) return;
      sentInitial = true;
      startedAt = Date.now();
      var params = new URLSearchParams(window.location.search);
      var payload = {
        type: 'pageview',
        site_key: siteKey,
        visitor_id: vid,
        session_id: sid,
        url: window.location.href,
        referrer: document.referrer || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        screen_w: window.innerWidth,
        screen_h: window.innerHeight,
        email: (extra && extra.email) || null
      };
      var p = post(payload, false);
      if (p && p.then) {
        p.then(function(res){ if (res && res.visit_id) visitId = res.visit_id; });
      }
    }

    function sendUpdate(isFinal) {
      if (!visitId) return;
      if (sentFinal && isFinal) return;
      if (isFinal) sentFinal = true;
      var payload = {
        type: 'update',
        site_key: siteKey,
        visit_id: visitId,
        duration_ms: Date.now() - startedAt,
        scroll_depth: maxScroll,
        ended: !!isFinal
      };
      post(payload, isFinal);
    }

    // Heartbeat every 15s
    var hb = setInterval(function(){
      if (document.visibilityState === 'visible') sendUpdate(false);
      try { sessionStorage.setItem('ml_sid_t', String(Date.now())); } catch(e) {}
    }, 15000);

    // Final beacon
    function finalize() { sendUpdate(true); }
    window.addEventListener('pagehide', finalize);
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') sendUpdate(false);
    });

    window.MailLead = {
      identify: function(email) { sentInitial = false; sendInitial({ email: email }); },
      consent: function() { sendInitial(); },
      visitorId: vid,
      sessionId: sid
    };

    if (!requireConsent) sendInitial();
  } catch(e) {}
})();`.replace("__TRACK_ENDPOINT__", TRACK_ENDPOINT);

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
