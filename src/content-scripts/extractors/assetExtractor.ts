import { AssetData } from '../../store';

export const extractAssets = (): AssetData[] => {
  const assets: AssetData[] = [];
  const processedUrls = new Set<string>();

  const addAsset = (type: AssetData['type'], url: string, dimensions?: string) => {
    // Resolve relative URLs
    try {
        const fullUrl = new URL(url, document.baseURI).href;
        
        if (processedUrls.has(fullUrl)) return;
        processedUrls.add(fullUrl);

        assets.push({
            type,
            url: fullUrl,
            dimensions,
            count: 1
        });
    } catch (e) {
        // invalid url, ignore
    }
  };

  // 1. Images
  document.querySelectorAll('img').forEach((img) => {
    if (img.src) {
        addAsset('image', img.src, `${img.naturalWidth}x${img.naturalHeight}`);
    }
  });

  // 2. SVGs
  // Inline SVGs are hard to "download" as files unless we serialize them.
  // For now, let's look for object tags or img tags with svg sources.
  // If it's an inline SVG, we could blob it.
  document.querySelectorAll('svg').forEach((svg) => {
     // Check if it's substantial
     const rect = svg.getBoundingClientRect();
     if (rect.width > 10 && rect.height > 10) {
        // We can try to serialize it to a data URI
        const s = new XMLSerializer().serializeToString(svg);
        const encoded = btoa(unescape(encodeURIComponent(s)));
        addAsset('svg', `data:image/svg+xml;base64,${encoded}`, `${Math.round(rect.width)}x${Math.round(rect.height)}`);
     }
  });

  // 3. Background Images
  // We already scan all elements for colors; we can check background-image too.
  // This is expensive to querySelectorAll('*') again if strict. 
  // Let's sample or use the existing Walker if we were integrated.
  // For now, let's do a "smart" scan of likely candidates (divs, sections)
  const elements = document.querySelectorAll('div, section, header, footer, a, button, span');
  elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundImage;
      if (bg && bg !== 'none' && bg.startsWith('url(')) {
          // extract url
          const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1]) {
             addAsset('background', match[1], '');
          }
      }
  });

  return assets;
};
