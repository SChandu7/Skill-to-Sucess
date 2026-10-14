/* SkillToSuccess — frontend configuration.
 * Business details (prices, contacts, referral rules) come from the API (/site/), which the admin edits.
 * Only technical switches live here.
 */
window.STS = window.STS || {};

// Where the Django server is.
//  ''                              -> same domain as the website (Nginx proxies /api to Django)
//  'https://api.chandus7.in'       -> website on GitHub Pages / another host, Django on its own domain (current)
var STS_API_ORIGIN = 'https://api.chandus7.in';

STS.config = {
  API_ORIGIN: STS_API_ORIGIN,
  API_BASE: STS_API_ORIGIN + '/api/skilltosuccess',
  DOMAIN: location.host,
  SITE_CACHE_SECONDS: 60,            // how long the public catalogue is reused between pages
  CHAT_REMOTE: true,                 // try the Gemini assistant on the server; falls back to built-in answers
  ASSISTANT: 'Mitra'
};
