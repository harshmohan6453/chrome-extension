// Red Flag Detector - SEO, UX, Accessibility, and Mobile Issues
// Provides actionable warnings for developers and clients

export interface RedFlag {
  id: string;
  category: 'seo' | 'ux' | 'accessibility' | 'mobile' | 'performance';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  element?: string;
  count?: number;
  recommendation: string;
}

export function detectRedFlags(): RedFlag[] {
  const flags: RedFlag[] = [];

  // ============================================
  // 1. SEO ISSUES
  // ============================================

  // Check H1 tags
  const h1Tags = document.querySelectorAll('h1');
  if (h1Tags.length === 0) {
    flags.push({
      id: 'seo-missing-h1',
      category: 'seo',
      severity: 'critical',
      title: 'Missing H1 Tag',
      description: 'No H1 tag found on the page',
      recommendation: 'Add exactly one H1 tag as the main page heading',
    });
  } else if (h1Tags.length > 1) {
    flags.push({
      id: 'seo-multiple-h1',
      category: 'seo',
      severity: 'warning',
      title: 'Multiple H1 Tags',
      description: `Found ${h1Tags.length} H1 tags on the page`,
      count: h1Tags.length,
      recommendation: 'Use only one H1 tag per page for better SEO',
    });
  }

  // Check heading hierarchy
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const headingLevels = headings.map(h => parseInt(h.tagName.substring(1)));
  
  for (let i = 1; i < headingLevels.length; i++) {
    const diff = headingLevels[i] - headingLevels[i - 1];
    if (diff > 1) {
      flags.push({
        id: 'seo-heading-skip',
        category: 'seo',
        severity: 'warning',
        title: 'Broken Heading Hierarchy',
        description: `Heading skips from H${headingLevels[i - 1]} to H${headingLevels[i]}`,
        recommendation: 'Use sequential heading levels (H1 → H2 → H3)',
      });
      break;
    }
  }

  // Check meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    flags.push({
      id: 'seo-missing-meta-description',
      category: 'seo',
      severity: 'critical',
      title: 'Missing Meta Description',
      description: 'No meta description found',
      recommendation: 'Add a meta description (150-160 characters)',
    });
  } else {
    const content = metaDescription.getAttribute('content') || '';
    if (content.length < 50) {
      flags.push({
        id: 'seo-short-meta-description',
        category: 'seo',
        severity: 'warning',
        title: 'Short Meta Description',
        description: `Meta description is only ${content.length} characters`,
        recommendation: 'Use 150-160 characters for optimal display',
      });
    }
  }

  // Check title tag
  const title = document.querySelector('title');
  if (!title || !title.textContent?.trim()) {
    flags.push({
      id: 'seo-missing-title',
      category: 'seo',
      severity: 'critical',
      title: 'Missing Title Tag',
      description: 'No title tag found',
      recommendation: 'Add a descriptive title tag (50-60 characters)',
    });
  }

  // Check images without alt text
  const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])'));
  if (imagesWithoutAlt.length > 0) {
    flags.push({
      id: 'seo-missing-alt',
      category: 'seo',
      severity: 'warning',
      title: 'Images Without Alt Text',
      description: `${imagesWithoutAlt.length} images missing alt attributes`,
      count: imagesWithoutAlt.length,
      recommendation: 'Add descriptive alt text to all images',
    });
  }

  // Check for "click here" links
  const badLinks = Array.from(document.querySelectorAll('a')).filter(link => {
    const text = link.textContent?.toLowerCase().trim() || '';
    return ['click here', 'here', 'read more', 'more'].includes(text);
  });
  
  if (badLinks.length > 0) {
    flags.push({
      id: 'seo-generic-links',
      category: 'seo',
      severity: 'info',
      title: 'Generic Link Text',
      description: `${badLinks.length} links use generic text like "click here"`,
      count: badLinks.length,
      recommendation: 'Use descriptive link text that explains the destination',
    });
  }

  // ============================================
  // DEEP SEO CHECKS (Additional)
  // ============================================
  
  // Check title length
  if (title && title.textContent) {
    const titleLength = title.textContent.trim().length;
    if (titleLength > 60) {
      flags.push({
        id: 'seo-title-too-long',
        category: 'seo',
        severity: 'warning',
        title: 'Title Tag Too Long',
        description: `Title is ${titleLength} characters (recommended: 50-60)`,
        recommendation: 'Shorten title to 50-60 characters to avoid truncation in search results',
      });
    }
    if (titleLength < 30) {
      flags.push({
        id: 'seo-title-too-short',
        category: 'seo',
        severity: 'info',
        title: 'Title Tag Too Short',
        description: `Title is only ${titleLength} characters`,
        recommendation: 'Use 50-60 characters to maximize SEO value',
      });
    }
  }

  // Check meta description length
  if (metaDescription) {
    const descContent = metaDescription.getAttribute('content') || '';
    if (descContent.length > 160) {
      flags.push({
        id: 'seo-meta-desc-too-long',
        category: 'seo',
        severity: 'warning',
        title: 'Meta Description Too Long',
        description: `Meta description is ${descContent.length} characters (recommended: 150-160)`,
        recommendation: 'Shorten to 150-160 characters to avoid truncation',
      });
    }
  }

  // Check canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    flags.push({
      id: 'seo-missing-canonical',
      category: 'seo',
      severity: 'warning',
      title: 'Missing Canonical URL',
      description: 'No canonical link tag found',
      recommendation: 'Add <link rel="canonical" href="..."> to prevent duplicate content issues',
    });
  }

  // Check Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (!ogTitle && !ogDescription && !ogImage) {
    flags.push({
      id: 'seo-missing-og-tags',
      category: 'seo',
      severity: 'warning',
      title: 'Missing Open Graph Tags',
      description: 'No Open Graph meta tags found',
      recommendation: 'Add og:title, og:description, og:image for better social media sharing',
    });
  } else {
    if (!ogImage) {
      flags.push({
        id: 'seo-missing-og-image',
        category: 'seo',
        severity: 'info',
        title: 'Missing Open Graph Image',
        description: 'No og:image meta tag found',
        recommendation: 'Add og:image for social media preview images',
      });
    }
  }

  // Check Twitter Card tags
  const twitterCard = document.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) {
    flags.push({
      id: 'seo-missing-twitter-card',
      category: 'seo',
      severity: 'info',
      title: 'Missing Twitter Card',
      description: 'No Twitter Card meta tags found',
      recommendation: 'Add twitter:card meta tag for better Twitter previews',
    });
  }

  // Check for robots meta tag
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) {
    const content = robots.getAttribute('content') || '';
    if (content.includes('noindex')) {
      flags.push({
        id: 'seo-noindex',
        category: 'seo',
        severity: 'critical',
        title: 'Page Set to Noindex',
        description: 'Robots meta tag contains "noindex"',
        recommendation: 'Remove noindex if you want this page to appear in search results',
      });
    }
    if (content.includes('nofollow')) {
      flags.push({
        id: 'seo-nofollow',
        category: 'seo',
        severity: 'warning',
        title: 'Page Set to Nofollow',
        description: 'Robots meta tag contains "nofollow"',
        recommendation: 'Links on this page won\'t pass SEO value',
      });
    }
  }

  // Check for structured data (JSON-LD)
  const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLd.length === 0) {
    flags.push({
      id: 'seo-missing-structured-data',
      category: 'seo',
      severity: 'info',
      title: 'Missing Structured Data',
      description: 'No JSON-LD structured data found',
      recommendation: 'Add Schema.org structured data for rich search results',
    });
  }

  // Check language attribute
  const htmlLang = document.documentElement.getAttribute('lang');
  if (!htmlLang) {
    flags.push({
      id: 'seo-missing-lang',
      category: 'seo',
      severity: 'warning',
      title: 'Missing Language Attribute',
      description: 'No lang attribute on <html> element',
      recommendation: 'Add lang="en" (or appropriate language) to <html> tag',
    });
  }

  // Check for empty links
  const emptyLinks = Array.from(document.querySelectorAll('a')).filter(a => {
    const href = a.getAttribute('href');
    return !href || href === '#' || href === 'javascript:void(0)';
  });
  
  if (emptyLinks.length > 3) {
    flags.push({
      id: 'seo-empty-links',
      category: 'seo',
      severity: 'warning',
      title: 'Empty or Placeholder Links',
      description: `${emptyLinks.length} links have empty or placeholder hrefs`,
      count: emptyLinks.length,
      recommendation: 'Add meaningful URLs to all links or use buttons for non-navigation actions',
    });
  }

  // Check for broken internal links (404 potential)
  const internalLinks = Array.from(document.querySelectorAll('a[href^="/"]'));
  const brokenLinkPatterns = internalLinks.filter(a => {
    const href = a.getAttribute('href') || '';
    return href.includes('undefined') || href.includes('null') || href.endsWith('/.');
  });
  
  if (brokenLinkPatterns.length > 0) {
    flags.push({
      id: 'seo-potential-broken-links',
      category: 'seo',
      severity: 'warning',
      title: 'Potentially Broken Links',
      description: `${brokenLinkPatterns.length} links may be broken (contain undefined/null)`,
      count: brokenLinkPatterns.length,
      recommendation: 'Check and fix these internal links',
    });
  }

  // Check for images without dimensions
  const imagesWithoutDimensions = Array.from(document.querySelectorAll('img')).filter(img => {
    return !img.hasAttribute('width') && !img.hasAttribute('height');
  });
  
  if (imagesWithoutDimensions.length > 5) {
    flags.push({
      id: 'seo-images-no-dimensions',
      category: 'seo',
      severity: 'info',
      title: 'Images Without Dimensions',
      description: `${imagesWithoutDimensions.length} images missing width/height attributes`,
      count: imagesWithoutDimensions.length,
      recommendation: 'Add width and height attributes to prevent layout shifts (CLS)',
    });
  }

  // Check for duplicate titles/descriptions in meta
  const allMetaDescriptions = document.querySelectorAll('meta[name="description"]');
  if (allMetaDescriptions.length > 1) {
    flags.push({
      id: 'seo-duplicate-meta-desc',
      category: 'seo',
      severity: 'warning',
      title: 'Duplicate Meta Descriptions',
      description: `Found ${allMetaDescriptions.length} meta description tags`,
      count: allMetaDescriptions.length,
      recommendation: 'Use only one meta description per page',
    });
  }

  // Check for favicon
  const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (!favicon) {
    flags.push({
      id: 'seo-missing-favicon',
      category: 'seo',
      severity: 'info',
      title: 'Missing Favicon',
      description: 'No favicon link found',
      recommendation: 'Add a favicon for better branding and bookmarks',
    });
  }

  // Check for external links without rel="noopener"
  const externalLinks = Array.from(document.querySelectorAll('a[target="_blank"]')).filter(a => {
    const rel = a.getAttribute('rel') || '';
    return !rel.includes('noopener') && !rel.includes('noreferrer');
  });
  
  if (externalLinks.length > 0) {
    flags.push({
      id: 'seo-external-links-security',
      category: 'seo',
      severity: 'warning',
      title: 'External Links Missing Security',
      description: `${externalLinks.length} external links missing rel="noopener"`,
      count: externalLinks.length,
      recommendation: 'Add rel="noopener noreferrer" to target="_blank" links for security',
    });
  }

  // Check for too many H2 tags
  const h2Tags = document.querySelectorAll('h2');
  
  if (h2Tags.length > 15) {
    flags.push({
      id: 'seo-too-many-h2',
      category: 'seo',
      severity: 'info',
      title: 'Many H2 Tags',
      description: `Page has ${h2Tags.length} H2 headings`,
      count: h2Tags.length,
      recommendation: 'Consider if all H2s are necessary; too many dilutes importance',
    });
  }

  // Check for empty headings
  const emptyHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(h => {
    return !h.textContent?.trim();
  });
  
  if (emptyHeadings.length > 0) {
    flags.push({
      id: 'seo-empty-headings',
      category: 'seo',
      severity: 'warning',
      title: 'Empty Headings',
      description: `${emptyHeadings.length} headings have no text content`,
      count: emptyHeadings.length,
      recommendation: 'Add meaningful text to all headings or remove empty ones',
    });
  }

  // Check for keywords in URL-like patterns
  const currentUrl = window.location.href.toLowerCase();
  if (currentUrl.includes('?') && currentUrl.includes('id=')) {
    flags.push({
      id: 'seo-non-descriptive-url',
      category: 'seo',
      severity: 'info',
      title: 'Non-Descriptive URL',
      description: 'URL contains query parameters instead of descriptive paths',
      recommendation: 'Consider using clean, descriptive URLs for better SEO',
    });
  }

  // Check charset
  const charset = document.querySelector('meta[charset]');
  if (!charset) {
    flags.push({
      id: 'seo-missing-charset',
      category: 'seo',
      severity: 'warning',
      title: 'Missing Charset Declaration',
      description: 'No charset meta tag found',
      recommendation: 'Add <meta charset="UTF-8"> at the start of <head>',
    });
  }

  // Check for hreflang (for multilingual sites)
  const hreflang = document.querySelector('link[hreflang]');
  const multipleLanguages = document.querySelectorAll('[lang]').length > 2;
  if (multipleLanguages && !hreflang) {
    flags.push({
      id: 'seo-missing-hreflang',
      category: 'seo',
      severity: 'info',
      title: 'Missing Hreflang Tags',
      description: 'Multilingual content detected but no hreflang tags found',
      recommendation: 'Add hreflang tags for language targeting in search engines',
    });
  }

  // Check text-to-HTML ratio (very simplified)
  const bodyText = document.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const htmlSize = document.documentElement.outerHTML.length;
  const textRatio = (bodyText.length / htmlSize) * 100;
  
  if (textRatio < 10) {
    flags.push({
      id: 'seo-low-text-ratio',
      category: 'seo',
      severity: 'info',
      title: 'Low Text-to-HTML Ratio',
      description: `Text content is only ${textRatio.toFixed(1)}% of page size`,
      recommendation: 'Add more meaningful text content for better SEO',
    });
  }

  // ============================================
  // 2. UX ANTI-PATTERNS
  // ============================================

  // Check for alert/confirm/prompt in scripts
  const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '').join(' ');
  if (scripts.includes('alert(') || scripts.includes('confirm(') || scripts.includes('prompt(')) {
    flags.push({
      id: 'ux-native-dialogs',
      category: 'ux',
      severity: 'warning',
      title: 'Native Browser Dialogs',
      description: 'Using alert(), confirm(), or prompt()',
      recommendation: 'Use custom modal dialogs for better UX',
    });
  }

  // Check forms without labels
  const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
  const inputsWithoutLabels = Array.from(inputs).filter(input => {
    const id = input.getAttribute('id');
    if (!id) return true;
    const label = document.querySelector(`label[for="${id}"]`);
    return !label && !input.closest('label');
  });

  if (inputsWithoutLabels.length > 0) {
    flags.push({
      id: 'ux-missing-labels',
      category: 'ux',
      severity: 'warning',
      title: 'Form Fields Without Labels',
      description: `${inputsWithoutLabels.length} form fields missing labels`,
      count: inputsWithoutLabels.length,
      recommendation: 'Add labels to all form inputs for better UX',
    });
  }

  // Check for buttons that look like links
  const suspiciousButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
    const computed = window.getComputedStyle(btn);
    return computed.textDecoration === 'underline' || computed.border === 'none';
  });

  if (suspiciousButtons.length > 5) {
    flags.push({
      id: 'ux-button-link-confusion',
      category: 'ux',
      severity: 'info',
      title: 'Buttons Styled as Links',
      description: `${suspiciousButtons.length} buttons may look like links`,
      count: suspiciousButtons.length,
      recommendation: 'Make buttons look like buttons for clarity',
    });
  }

  // ============================================
  // 3. ACCESSIBILITY ISSUES
  // ============================================

  // Check for missing ARIA labels on interactive elements
  const interactiveWithoutAria = Array.from(
    document.querySelectorAll('button, a, input, select, textarea')
  ).filter(el => {
    const hasAriaLabel = el.hasAttribute('aria-label');
    const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
    const hasText = (el.textContent?.trim().length || 0) > 0;
    const hasAlt = el.hasAttribute('alt');
    
    return !hasAriaLabel && !hasAriaLabelledBy && !hasText && !hasAlt;
  });

  if (interactiveWithoutAria.length > 0) {
    flags.push({
      id: 'a11y-missing-aria',
      category: 'accessibility',
      severity: 'warning',
      title: 'Interactive Elements Without Labels',
      description: `${interactiveWithoutAria.length} interactive elements have no accessible labels`,
      count: interactiveWithoutAria.length,
      recommendation: 'Add aria-label or visible text to all interactive elements',
    });
  }

  // Check contrast (simplified - just flag light text on light bg)
  const suspiciousContrast = Array.from(document.querySelectorAll('*')).filter(el => {
    const computed = window.getComputedStyle(el);
    const color = computed.color;
    const bgColor = computed.backgroundColor;
    
    // Very basic check - just for demonstration
    if (color.includes('rgb') && bgColor.includes('rgb')) {
      const textBrightness = color.match(/\d+/g)?.reduce((a, b) => a + parseInt(b), 0) || 0;
      const bgBrightness = bgColor.match(/\d+/g)?.reduce((a, b) => a + parseInt(b), 0) || 0;
      
      return Math.abs(textBrightness - bgBrightness) < 150;
    }
    return false;
  });

  if (suspiciousContrast.length > 10) {
    flags.push({
      id: 'a11y-low-contrast',
      category: 'accessibility',
      severity: 'info',
      title: 'Potential Contrast Issues',
      description: 'Some text may have insufficient contrast',
      recommendation: 'Ensure text contrast ratio is at least 4.5:1',
    });
  }

  // ============================================
  // 4. MOBILE ISSUES
  // ============================================

  // Check viewport meta tag
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    flags.push({
      id: 'mobile-missing-viewport',
      category: 'mobile',
      severity: 'critical',
      title: 'Missing Viewport Meta Tag',
      description: 'No viewport meta tag found',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    });
  }

  // Check for small text
  const smallText = Array.from(document.querySelectorAll('p, span, div, li')).filter(el => {
    const computed = window.getComputedStyle(el);
    const fontSize = parseFloat(computed.fontSize);
    return fontSize < 12;
  });

  if (smallText.length > 10) {
    flags.push({
      id: 'mobile-small-text',
      category: 'mobile',
      severity: 'warning',
      title: 'Text Too Small',
      description: `${smallText.length} elements have font size < 12px`,
      count: smallText.length,
      recommendation: 'Use minimum 14px font size for mobile readability',
    });
  }

  // Check touch target size
  const smallTargets = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  });

  if (smallTargets.length > 5) {
    flags.push({
      id: 'mobile-small-targets',
      category: 'mobile',
      severity: 'warning',
      title: 'Touch Targets Too Small',
      description: `${smallTargets.length} interactive elements smaller than 44x44px`,
      count: smallTargets.length,
      recommendation: 'Make touch targets at least 44x44px for mobile',
    });
  }

  // ============================================
  // 5. PERFORMANCE HINTS
  // ============================================

  // Check large images
  const largeImages = Array.from(document.querySelectorAll('img')).filter(img => {
    const src = img.getAttribute('src') || '';
    // Check if it's a data URL and estimate size
    if (src.startsWith('data:')) {
      return src.length > 100000; // Roughly 75KB
    }
    return false;
  });

  if (largeImages.length > 0) {
    flags.push({
      id: 'perf-large-images',
      category: 'performance',
      severity: 'info',
      title: 'Large Inline Images',
      description: `${largeImages.length} images embedded as large data URLs`,
      count: largeImages.length,
      recommendation: 'Use external image files and optimize with modern formats (WebP, AVIF)',
    });
  }

  // Check DOM size
  const domSize = document.querySelectorAll('*').length;
  if (domSize > 1500) {
    flags.push({
      id: 'perf-large-dom',
      category: 'performance',
      severity: 'warning',
      title: 'Large DOM Size',
      description: `Page has ${domSize} DOM nodes`,
      count: domSize,
      recommendation: 'Reduce DOM size to < 1500 nodes for better performance',
    });
  }

  // Check blocking scripts in head
  const blockingScripts = document.querySelectorAll('head script:not([async]):not([defer])');
  if (blockingScripts.length > 0) {
    flags.push({
      id: 'perf-blocking-scripts',
      category: 'performance',
      severity: 'warning',
      title: 'Render-Blocking Scripts',
      description: `${blockingScripts.length} scripts in <head> without async/defer`,
      count: blockingScripts.length,
      recommendation: 'Add async or defer attributes to non-critical scripts',
    });
  }

  // ============================================
  // ADDITIONAL PERFORMANCE CHECKS (PageSpeed-like)
  // ============================================

  // Check for images not using modern formats (WebP, AVIF)
  const allImages = Array.from(document.querySelectorAll('img'));
  const oldFormatImages = allImages.filter(img => {
    const src = img.getAttribute('src') || '';
    const srcLower = src.toLowerCase();
    return srcLower.endsWith('.jpg') || srcLower.endsWith('.jpeg') || 
           srcLower.endsWith('.png') || srcLower.endsWith('.gif');
  });
  
  if (oldFormatImages.length > 5) {
    flags.push({
      id: 'perf-old-image-formats',
      category: 'performance',
      severity: 'info',
      title: 'Images Using Old Formats',
      description: `${oldFormatImages.length} images use JPG/PNG/GIF instead of WebP/AVIF`,
      count: oldFormatImages.length,
      recommendation: 'Convert images to WebP or AVIF for 25-50% smaller file sizes',
    });
  }

  // Check for images without lazy loading
  const imagesWithoutLazy = allImages.filter(img => {
    const loading = img.getAttribute('loading');
    const src = img.getAttribute('src') || '';
    // Exclude small icons and images above the fold (first few)
    return !loading && !src.startsWith('data:') && src.length > 0;
  });
  
  if (imagesWithoutLazy.length > 5) {
    flags.push({
      id: 'perf-no-lazy-loading',
      category: 'performance',
      severity: 'warning',
      title: 'Images Without Lazy Loading',
      description: `${imagesWithoutLazy.length} images missing loading="lazy" attribute`,
      count: imagesWithoutLazy.length,
      recommendation: 'Add loading="lazy" to images below the fold to improve initial load time',
    });
  }

  // Check for third-party scripts (external domains)
  const currentDomain = window.location.hostname;
  const thirdPartyScripts = Array.from(document.querySelectorAll('script[src]')).filter(script => {
    const src = script.getAttribute('src') || '';
    try {
      const url = new URL(src, window.location.origin);
      return url.hostname !== currentDomain && 
             !url.hostname.includes(currentDomain) &&
             !currentDomain.includes(url.hostname);
    } catch {
      return false;
    }
  });
  
  if (thirdPartyScripts.length > 5) {
    flags.push({
      id: 'perf-many-third-party-scripts',
      category: 'performance',
      severity: 'warning',
      title: 'Many Third-Party Scripts',
      description: `${thirdPartyScripts.length} external scripts from other domains`,
      count: thirdPartyScripts.length,
      recommendation: 'Reduce third-party scripts or load them asynchronously to improve performance',
    });
  }

  // Check for iframes (often slow)
  const iframes = document.querySelectorAll('iframe');
  if (iframes.length > 3) {
    flags.push({
      id: 'perf-many-iframes',
      category: 'performance',
      severity: 'info',
      title: 'Multiple Iframes',
      description: `Page has ${iframes.length} iframes which can slow loading`,
      count: iframes.length,
      recommendation: 'Consider lazy-loading iframes or replacing with native implementations',
    });
  }

  // Check for excessive CSS (many stylesheets)
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  if (stylesheets.length > 10) {
    flags.push({
      id: 'perf-many-stylesheets',
      category: 'performance',
      severity: 'warning',
      title: 'Many CSS Stylesheets',
      description: `${stylesheets.length} separate stylesheet files`,
      count: stylesheets.length,
      recommendation: 'Bundle stylesheets to reduce HTTP requests',
    });
  }

  // Check for inline styles (can indicate lack of CSS architecture)
  const inlineStyles = document.querySelectorAll('[style]');
  if (inlineStyles.length > 50) {
    flags.push({
      id: 'perf-excessive-inline-styles',
      category: 'performance',
      severity: 'info',
      title: 'Many Inline Styles',
      description: `${inlineStyles.length} elements have inline styles`,
      count: inlineStyles.length,
      recommendation: 'Move inline styles to CSS classes for better caching',
    });
  }

  // Check for web fonts without font-display
  const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
  if (fontLinks.length > 0) {
    let hasDisplay = false;
    fontLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes('display=')) hasDisplay = true;
    });
    
    if (!hasDisplay) {
      flags.push({
        id: 'perf-fonts-no-display',
        category: 'performance',
        severity: 'warning',
        title: 'Web Fonts Without font-display',
        description: 'Google Fonts loaded without display parameter',
        recommendation: 'Add &display=swap to Google Fonts URLs to prevent FOIT',
      });
    }
  }

  // Check for videos without preload
  const videos = document.querySelectorAll('video');
  const videosWithoutPreload = Array.from(videos).filter(v => {
    const preload = v.getAttribute('preload');
    return preload === 'auto' || !preload;
  });
  
  if (videosWithoutPreload.length > 0) {
    flags.push({
      id: 'perf-video-preload',
      category: 'performance',
      severity: 'info',
      title: 'Videos Without Optimal Preload',
      description: `${videosWithoutPreload.length} videos may be loading unnecessarily`,
      count: videosWithoutPreload.length,
      recommendation: 'Add preload="none" or preload="metadata" to videos not immediately visible',
    });
  }

  // Check for excessive event listeners (performance drain)
  // This is a simplified check - just looking at onclick attributes
  const inlineEventHandlers = document.querySelectorAll('[onclick], [onmouseover], [onload], [onerror]');
  if (inlineEventHandlers.length > 20) {
    flags.push({
      id: 'perf-inline-handlers',
      category: 'performance',
      severity: 'info',
      title: 'Many Inline Event Handlers',
      description: `${inlineEventHandlers.length} elements have inline event handlers`,
      count: inlineEventHandlers.length,
      recommendation: 'Use addEventListener instead of inline handlers for better performance',
    });
  }

  // Check for document.write (blocks parsing)
  if (scripts.includes('document.write(')) {
    flags.push({
      id: 'perf-document-write',
      category: 'performance',
      severity: 'warning',
      title: 'Using document.write()',
      description: 'Scripts using document.write() can block page parsing',
      recommendation: 'Replace document.write() with DOM manipulation methods',
    });
  }

  console.log(`🚩 Detected ${flags.length} red flags`);
  return flags;
}
