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

    var sent = false;
    function send(extra) {
      if (sent && !extra) return;
      sent = true;
      var params = new URLSearchParams(window.location.search);
      var payload = {
        site_key: siteKey,
        visitor_id: vid,
        url: window.location.href,
        referrer: document.referrer || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        email: (extra && extra.email) || null
      };
      var ok = false;
      try {
        if (navigator.sendBeacon) {
          // Use text/plain (CORS-safelisted) — sendBeacon rejects application/json silently
          var blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
          ok = navigator.sendBeacon(endpoint, blob);
        }
      } catch(e) {}
      if (!ok) {
        try {
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload),
            keepalive: true,
            mode: 'cors'
          });
        } catch(e) {}
      }
    }

    window.MailLead = {
      identify: function(email) { sent = false; send({ email: email }); },
      consent: function() { send(); },
      visitorId: vid
    };

    if (!requireConsent) send();
  } catch(e) {}
})();`.replace("__TRACK_ENDPOINT__", TRACK_ENDPOINT);

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(SCRIPT, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
