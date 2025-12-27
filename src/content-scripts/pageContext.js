// This script runs in the PAGE context (not isolated like content scripts)
// It can access window.ScrollTrigger and other page variables

(function() {
  console.log('🌍 Page context detector loaded');
  
  // Helper to get element selector (only serializable data)
  function getElementSelector(element) {
    if (!element) return 'unknown';
    
    try {
      if (element.id) {
        return `#${element.id}`;
      }
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).slice(0, 2);
        if (classes.length > 0 && classes[0]) {
          return `.${classes.join('.')}`;
        }
      }
      return element.tagName ? element.tagName.toLowerCase() : 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }
  
  function detectScrollAnimations() {
    const animations = [];
    
    try {
      // Check for GSAP ScrollTrigger
      let ScrollTrigger = null;
      if (window.ScrollTrigger) {
        ScrollTrigger = window.ScrollTrigger;
      } else if (window.gsap?.ScrollTrigger) {
        ScrollTrigger = window.gsap.ScrollTrigger;
      }
      
      if (ScrollTrigger) {
        const triggers = ScrollTrigger.getAll() || [];
        console.log(`📊 Found ${triggers.length} ScrollTrigger instances in page context`);
        
        triggers.forEach((trigger, index) => {
          try {
            const vars = trigger.vars || {};
            const animation = trigger.animation;
            
            // Extract animated properties
            const properties = [];
            if (animation && animation.vars) {
              Object.keys(animation.vars).forEach(key => {
                if (key !== 'onComplete' && key !== 'onUpdate' && key !== 'onStart' && key !== 'onReverseComplete') {
                  properties.push(key);
                }
              });
            }
            
            // Only use serializable data (strings, numbers, booleans)
            animations.push({
              id: `gsap-st-${index}`,
              library: 'gsap-scrolltrigger',
              element: getElementSelector(trigger.trigger),
              trigger: {
                element: getElementSelector(trigger.trigger),
                start: vars.start ? String(vars.start) : 'top bottom',
                end: vars.end ? String(vars.end) : 'bottom top',
                scrub: vars.scrub !== undefined ? vars.scrub : false,
                pin: !!vars.pin,
                toggleActions: vars.toggleActions ? String(vars.toggleActions) : undefined,
              },
              animation: {
                type: 'js',
                properties: properties.length > 0 ? properties : ['transform', 'opacity'],
                duration: animation?.duration?.() || animation?.vars?.duration || null,
                easing: vars.ease ? String(vars.ease) : 'none',
                delay: animation?.vars?.delay || 0,
              },
              markers: !!vars.markers,
            });
          } catch (err) {
            console.warn('Error processing trigger:', err);
          }
        });
      }
    } catch (error) {
      console.warn('Error in detectScrollAnimations:', error);
    }
    
    return animations;
  }
  
  // Listen for requests from content script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'DETECT_SCROLL_ANIMATIONS') {
      const animations = detectScrollAnimations();
      
      // Send back only serializable data
      window.postMessage({
        type: 'SCROLL_ANIMATIONS_DETECTED',
        animations: animations
      }, '*');
    }
  });
  
  console.log('✅ Page context detector ready');
})();
