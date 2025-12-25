export const extractTechnologies = (): string[] => {
  const techs = new Set<string>();

  // --- 1. DOM & Meta Tag Analysis ---
  const getMeta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
  const generator = getMeta('generator')?.toLowerCase() || '';

  // CMS / Generators
  if (generator.includes('wordpress')) techs.add('WordPress');
  if (generator.includes('webflow')) techs.add('Webflow');
  if (generator.includes('wix')) techs.add('Wix');
  if (generator.includes('shopify') || window.location.host.includes('myshopify')) techs.add('Shopify');
  if (generator.includes('gatsby')) techs.add('Gatsby');
  if (generator.includes('joomla')) techs.add('Joomla');
  if (generator.includes('drupal')) techs.add('Drupal');
  if (document.querySelector('#squarespace-headers')) techs.add('Squarespace');

  // Frameworks (DOM Markers)
  if (document.querySelector('[data-reactroot], [id="react-root"]')) techs.add('React');
  if (document.querySelector('#__next')) { techs.add('Next.js'); techs.add('React'); }
  if (document.querySelector('[data-v-app], [id="app"]')) techs.add('Vue.js'); // generic id=app matches others too but common
  if (document.querySelector('#__nuxt')) { techs.add('Nuxt.js'); techs.add('Vue.js'); }
  if (document.querySelector('[ng-version], [ng-app]')) techs.add('Angular');
  if (document.querySelector('script[type="text/x-handlebars-template"]')) techs.add('Handlebars');

  // --- 2. Stylesheets & UI Libraries ---
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  const linkHrefs = links.map(l => (l as HTMLLinkElement).href.toLowerCase());

  if (linkHrefs.some(h => h.includes('bootstrap'))) techs.add('Bootstrap');
  if (linkHrefs.some(h => h.includes('tailwind'))) techs.add('Tailwind CSS');
  if (linkHrefs.some(h => h.includes('bulma'))) techs.add('Bulma');
  if (linkHrefs.some(h => h.includes('foundation'))) techs.add('Foundation');
  if (linkHrefs.some(h => h.includes('materialize'))) techs.add('Materialize');
  if (linkHrefs.some(h => h.includes('font-awesome'))) techs.add('Font Awesome');
  if (linkHrefs.some(h => h.includes('animate.css'))) techs.add('Animate.css');

  // --- 3. Script Source Analysis ---
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const scriptSrcs = scripts.map(s => (s as HTMLScriptElement).src.toLowerCase());

  // Libraries
  if (scriptSrcs.some(s => s.includes('jquery'))) techs.add('jQuery');
  if (scriptSrcs.some(s => s.includes('lodash') || s.includes('underscore'))) techs.add('Lodash');
  if (scriptSrcs.some(s => s.includes('moment'))) techs.add('Moment.js');
  if (scriptSrcs.some(s => s.includes('axios'))) techs.add('Axios');
  if (scriptSrcs.some(s => s.includes('alpine'))) techs.add('Alpine.js');
  if (scriptSrcs.some(s => s.includes('gsap'))) techs.add('GSAP');
  if (scriptSrcs.some(s => s.includes('three'))) techs.add('Three.js');
  if (scriptSrcs.some(s => s.includes('d3'))) techs.add('D3.js');
  if (scriptSrcs.some(s => s.includes('chart.js'))) techs.add('Chart.js');

  // Ads/Analytics
  if (scriptSrcs.some(s => s.includes('google-analytics') || s.includes('gtag'))) techs.add('Google Analytics');
  if (scriptSrcs.some(s => s.includes('googletagmanager'))) techs.add('Google Tag Manager');
  if (scriptSrcs.some(s => s.includes('fbevents') || s.includes('facebook'))) techs.add('Facebook Pixel');
  if (scriptSrcs.some(s => s.includes('hotjar'))) techs.add('Hotjar');
  if (scriptSrcs.some(s => s.includes('segment'))) techs.add('Segment');

  // --- 4. Heuristics (Class Names) ---
  const bodyClass = document.body.className;
  if (bodyClass.includes('wp-')) techs.add('WordPress');
  
  // Tailwind Heuristic: High volume of utility classes
  const allElements = document.querySelectorAll('*');
  let tailwindCount = 0;
  for (let i = 0; i < Math.min(allElements.length, 100); i++) {
      const cls = allElements[i].className;
      if (typeof cls === 'string' && (cls.includes('flex ') || cls.includes('text-') || cls.includes('bg-') || cls.includes('p-'))) {
          tailwindCount++;
      }
  }
  if (tailwindCount > 10) techs.add('Tailwind CSS');

  // --- 5. Protocol & CDNs ---
  if (document.querySelector('meta[property^="og:"]')) techs.add('Open Graph');
  if (document.querySelector('link[type="application/rss+xml"]')) techs.add('RSS');
  
  if (scriptSrcs.some(s => s.includes('cloudflareinsights') || s.includes('cdn-cgi'))) techs.add('Cloudflare');
  if (scriptSrcs.some(s => s.includes('cdnjs.cloudflare.com'))) techs.add('cdnjs');
  if (scriptSrcs.some(s => s.includes('unpkg.com'))) techs.add('unpkg');
  if (scriptSrcs.some(s => s.includes('jsdelivr.net'))) techs.add('jsDelivr');
  if (scriptSrcs.some(s => s.includes('vercel-analytics') || s.includes('/_vercel/'))) techs.add('Vercel');
  if (scriptSrcs.some(s => s.includes('netlify'))) techs.add('Netlify');

  // --- 6. Marketing, Analytics & A/B Testing ---
  if (scriptSrcs.some(s => s.includes('optimizely'))) techs.add('Optimizely');
  if (scriptSrcs.some(s => s.includes('visualwebsiteoptimizer') || s.includes('vwo.com'))) techs.add('VWO');
  if (scriptSrcs.some(s => s.includes('hotjar'))) techs.add('Hotjar');
  if (scriptSrcs.some(s => s.includes('hubspot') || s.includes('hs-scripts'))) techs.add('HubSpot');
  if (scriptSrcs.some(s => s.includes('marketo'))) techs.add('Marketo');
  if (scriptSrcs.some(s => s.includes('mailchimp') || s.includes('chimpstatic'))) techs.add('Mailchimp');
  if (scriptSrcs.some(s => s.includes('segment.com') || s.includes('segment.io'))) techs.add('Segment');
  if (scriptSrcs.some(s => s.includes('mixpanel'))) techs.add('Mixpanel');
  if (scriptSrcs.some(s => s.includes('newrelic'))) techs.add('New Relic');

  // --- 7. Advertising ---
  if (scriptSrcs.some(s => s.includes('doubleclick') || s.includes('googlesyndication'))) techs.add('Google Ads');
  if (scriptSrcs.some(s => s.includes('facebook') && s.includes('fbevents'))) techs.add('Facebook Pixel');
  if (scriptSrcs.some(s => s.includes('ads-twitter'))) techs.add('Twitter Ads');
  if (scriptSrcs.some(s => s.includes('linkedin') && s.includes('insight'))) techs.add('LinkedIn Insight Tag');
  if (scriptSrcs.some(s => s.includes('taboola'))) techs.add('Taboola');
  if (scriptSrcs.some(s => s.includes('outbrain'))) techs.add('Outbrain');

  // --- 8. Widgets & Comments ---
  if (scriptSrcs.some(s => s.includes('disqus'))) techs.add('Disqus');
  if (scriptSrcs.some(s => s.includes('intercom'))) techs.add('Intercom');
  if (scriptSrcs.some(s => s.includes('drift'))) techs.add('Drift');
  if (scriptSrcs.some(s => s.includes('zendesk'))) techs.add('Zendesk');
  if (scriptSrcs.some(s => s.includes('chat in') || s.includes('tidio'))) techs.add('Live Chat');

  // --- 9. E-commerce & Payments ---
  if (scriptSrcs.some(s => s.includes('stripe'))) techs.add('Stripe');
  if (scriptSrcs.some(s => s.includes('paypal'))) techs.add('PayPal');
  if (scriptSrcs.some(s => s.includes('braintree'))) techs.add('Braintree');
  if (scriptSrcs.some(s => s.includes('klarna'))) techs.add('Klarna');
  if (document.querySelector('script[type="text/x-magento-init"]')) techs.add('Magento');
  if (document.querySelector('link[href*="woocommerce"]')) techs.add('WooCommerce');
  if (scriptSrcs.some(s => s.includes('bigcommerce'))) { techs.add('BigCommerce'); }

  // --- 10. Security ---
  if (scriptSrcs.some(s => s.includes('recaptcha') || s.includes('g-recaptcha'))) techs.add('reCAPTCHA');
  if (scriptSrcs.some(s => s.includes('hcaptcha'))) techs.add('hCaptcha');
  if (scriptSrcs.some(s => s.includes('onetrust'))) techs.add('OneTrust'); // Privacy/Security

  return Array.from(techs);
};
