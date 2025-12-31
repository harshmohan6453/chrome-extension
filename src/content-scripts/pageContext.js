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
      let ScrollTrigger = window.ScrollTrigger || window.gsap?.ScrollTrigger;
      
      if (ScrollTrigger) {
        const triggers = ScrollTrigger.getAll() || [];
        console.log(`📊 Found ${triggers.length} ScrollTrigger instances`);
        
        triggers.forEach((trigger, index) => {
          try {
            const vars = trigger.vars || {};
            const animation = trigger.animation;
            
            // Extract animated properties safely
            const properties = [];
            if (animation?.vars && typeof animation.vars === 'object') {
              Object.keys(animation.vars).forEach(key => {
                if (!['onComplete', 'onUpdate', 'onStart', 'onReverseComplete'].includes(key)) {
                  properties.push(key);
                }
              });
            }
            
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
      window.__gsapAnimationCache__ = animations;
      
      window.postMessage({
        type: 'SCROLL_ANIMATIONS_DETECTED',
        animations: animations
      }, '*');
    }
    
    // Control animation playback
    if (event.data.type === 'CONTROL_ANIMATION') {
      const { animationId, action, value } = event.data;
      
      try {
        // Handle GSAP ScrollTrigger animations
        if (animationId.startsWith('gsap-st-')) {
          const index = parseInt(animationId.replace('gsap-st-', ''));
          const storedAnimations = window.__gsapAnimationCache__ || [];
          const animData = storedAnimations[index];
          
          if (!animData) {
            console.warn('❌ Animation data not found for:', animationId);
            return;
          }
          
          const targetSelector = animData.trigger?.element;
          let targetElement = null;
          
          // Find the target element
          try {
            if (targetSelector) {
              targetElement = document.querySelector(targetSelector);
            }
          } catch (e) {
            console.warn('Selector failed:', targetSelector);
          }
          
          // scrollTo: Just scroll to the element
          if (action === 'scrollTo') {
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              console.log('📜 Scrolled to:', targetSelector);
            } else {
              console.warn('❌ Element not found:', targetSelector);
            }
            return;
          }
          
          // For restart/setProgress: Find the GSAP trigger
          const ScrollTrigger = window.ScrollTrigger || window.gsap?.ScrollTrigger;
          if (!ScrollTrigger) {
            console.warn('ScrollTrigger not available');
            return;
          }
          
          const triggers = ScrollTrigger.getAll() || [];
          let trigger = null;
          
          // Find trigger by matching element
          if (targetElement) {
            trigger = triggers.find(t => t.trigger === targetElement);
          }
          
          // Fallback: try index if element match failed
          if (!trigger && triggers[index]) {
            trigger = triggers[index];
          }
          
          if (action === 'restart') {
            if (targetElement) {
              // Scroll element into view first
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Wait for scroll, then restart animation
            setTimeout(() => {
              if (trigger?.animation) {
                trigger.animation.progress(0);
                trigger.animation.restart();
                console.log('🔄 Restarted animation');
              } else if (targetElement) {
                // No trigger found - try scrolling away and back to re-trigger
                const rect = targetElement.getBoundingClientRect();
                const scrollBack = window.scrollY;
                window.scrollTo({ top: Math.max(0, scrollBack - window.innerHeight), behavior: 'instant' });
                setTimeout(() => {
                  targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  console.log('🔄 Re-triggered via scroll');
                }, 100);
              }
            }, 400);
            return;
          }
          
          if (action === 'setProgress') {
            if (trigger?.animation) {
              trigger.animation.progress(value);
              console.log(`⏩ Set progress to ${Math.round(value * 100)}%`);
            }
            return;
          }
          
          if (action === 'play') {
            if (trigger?.animation) {
              trigger.animation.play();
              console.log('▶️ Playing animation');
            }
            return;
          }
        }
        
        // Handle CSS scroll-timeline animations
        if (animationId.startsWith('css-scroll-')) {
          const index = parseInt(animationId.replace('css-scroll-', ''));
          let targetElement = null;
          let currentIndex = 0;
          
          // Find element with animation-timeline
          for (const el of document.querySelectorAll('*')) {
            const computed = window.getComputedStyle(el);
            const timeline = computed.animationTimeline;
            
            if (timeline && timeline !== 'auto' && timeline !== 'none') {
              if (currentIndex === index) {
                targetElement = el;
                break;
              }
              currentIndex++;
            }
          }
          
          if (!targetElement) {
            console.warn('CSS animation element not found:', animationId);
            return;
          }
          
          const animations = targetElement.getAnimations();
          
          if (action === 'restart') {
            animations.forEach(anim => {
              anim.cancel();
              anim.play();
            });
            console.log('🔄 Restarted CSS animation');
          }
          
          if (action === 'setProgress') {
            animations.forEach(anim => {
              if (anim.effect?.getTiming().duration !== 'auto') {
                const duration = anim.effect.getTiming().duration;
                anim.currentTime = duration * value;
              }
            });
            console.log(`⏩ Set CSS animation progress to ${Math.round(value * 100)}%`);
          }
        }
      } catch (err) {
        console.error('Error controlling animation:', err);
      }
    }
  });
  
  console.log('✅ Page context detector ready');
})();
