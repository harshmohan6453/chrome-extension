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
    
    // Control animation playback
    if (event.data.type === 'CONTROL_ANIMATION') {
      const { animationId, action, value } = event.data;
      
      try {
        let ScrollTrigger = window.ScrollTrigger || window.gsap?.ScrollTrigger;
        if (!ScrollTrigger) return;
        
        const triggers = ScrollTrigger.getAll() || [];
        const index = parseInt(animationId.replace('gsap-st-', ''));
        const trigger = triggers[index];
        
        if (!trigger) {
          console.warn('Trigger not found:', animationId);
          return;
        }
        
        switch (action) {
          case 'restart':
            // Restart the animation by refreshing the trigger
            trigger.refresh();
            if (trigger.animation) {
              trigger.animation.restart();
            }
            console.log('🔄 Restarted animation:', animationId);
            break;
            
          case 'play':
            // Play the animation (set progress to 1)
            if (trigger.animation) {
              trigger.animation.play();
            }
            console.log('▶️ Playing animation:', animationId);
            break;
            
          case 'setProgress':
            // Set animation progress (0-1)
            if (trigger.animation) {
              trigger.animation.progress(value);
            }
            console.log(`⏩ Set progress to ${value * 100}%:`, animationId);
            break;
            
          case 'scrollTo':
            // Scroll to trigger position
            const scrollY = trigger.start;
            window.scrollTo({
              top: scrollY,
              behavior: 'smooth'
            });
            console.log('📜 Scrolled to trigger:', animationId);
            break;
        }
      } catch (err) {
        console.error('Error controlling GSAP animation:', err);
      }
    }
    
    // Control CSS animations (css-scroll-timeline, regular CSS animations)
    if (event.data.type === 'CONTROL_ANIMATION' && animationId.startsWith('css-scroll-')) {
      try {
        // Find the element by parsing the animation ID
        const index = parseInt(animationId.replace('css-scroll-', ''));
        const elements = document.querySelectorAll('*');
        let targetElement = null;
        let currentIndex = 0;
        
        // Find element with animation-timeline
        for (const el of elements) {
          const computed = window.getComputedStyle(el);
          const animationTimeline = computed.animationTimeline;
          
          if (animationTimeline && animationTimeline !== 'auto' && animationTimeline !== 'none') {
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
        
        // Use Web Animations API to control CSS animations
        const animations = targetElement.getAnimations();
        
        if (animations.length === 0) {
          console.warn('No animations found on element:', animationId);
          return;
        }
        
        switch (action) {
          case 'restart':
            // Restart CSS animation
            animations.forEach(anim => {
              anim.cancel();
              anim.play();
            });
            console.log('🔄 Restarted CSS animation:', animationId);
            break;
            
          case 'setProgress':
            // Set animation progress using currentTime
            animations.forEach(anim => {
              if (anim.effect && anim.effect.getTiming().duration !== 'auto') {
                const duration = anim.effect.getTiming().duration;
                anim.currentTime = duration * value;
              }
            });
            console.log(`⏩ Set CSS animation progress to ${value * 100}%:`, animationId);
            break;
        }
      } catch (err) {
        console.error('Error controlling CSS animation:', err);
      }
    }
  });
  
  console.log('✅ Page context detector ready');
})();
