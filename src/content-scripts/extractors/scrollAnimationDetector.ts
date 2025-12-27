import { ScrollAnimationData } from '../../store';

/**
 * Scroll Animation Detector
 * Detects and analyzes scroll-based animations from various libraries and implementations
 */

// GSAP ScrollTrigger Detection
function detectGSAPScrollTrigger(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    // Check if GSAP and ScrollTrigger are available in multiple possible locations
    let ScrollTrigger = null;
    
    // Check window.ScrollTrigger
    if (typeof window !== 'undefined' && (window as any).ScrollTrigger) {
      ScrollTrigger = (window as any).ScrollTrigger;
      console.log('📍 Found ScrollTrigger at window.ScrollTrigger');
    }
    // Check gsap.ScrollTrigger (common on gsap.com)
    else if (typeof window !== 'undefined' && (window as any).gsap?.ScrollTrigger) {
      ScrollTrigger = (window as any).gsap.ScrollTrigger;
      console.log('📍 Found ScrollTrigger at gsap.ScrollTrigger');
    }
    
    if (ScrollTrigger) {
      const triggers = ScrollTrigger.getAll();
      console.log(`📊 Found ${triggers?.length || 0} ScrollTrigger instances`);
      
      if (!triggers || triggers.length === 0) {
        return animations;
      }
      
      triggers.forEach((trigger: any, index: number) => {
        try {
          const vars = trigger.vars || {};
          const animation = trigger.animation;
          
          // Extract animated properties from the tween
          const properties: string[] = [];
          if (animation && animation.vars) {
            Object.keys(animation.vars).forEach(key => {
              if (key !== 'onComplete' && key !== 'onUpdate' && key !== 'onStart') {
                properties.push(key);
              }
            });
          }
          
          animations.push({
            id: `gsap-st-${index}`,
            library: 'gsap-scrolltrigger',
            element: trigger.trigger ? getElementSelector(trigger.trigger) : 'unknown',
            trigger: {
              element: trigger.trigger ? getElementSelector(trigger.trigger) : 'unknown',
              start: vars.start?.toString() || 'top bottom',
              end: vars.end?.toString() || 'bottom top',
              scrub: vars.scrub !== undefined ? vars.scrub : false,
              pin: !!vars.pin,
              toggleActions: vars.toggleActions,
            },
            animation: {
              type: 'js',
              properties: properties.length > 0 ? properties : ['transform', 'opacity'],
              duration: animation?.duration?.() || animation?.vars?.duration || null,
              easing: animation?.vars?.ease || vars.ease || 'none',
              delay: animation?.vars?.delay || 0,
            },
            markers: !!vars.markers,
          });
        } catch (err) {
          console.warn('Error processing ScrollTrigger:', err);
        }
      });
    } else {
      console.log('❌ ScrollTrigger not found on window or gsap object');
    }
  } catch (error) {
    console.warn('Error detecting GSAP ScrollTrigger:', error);
  }
  
  return animations;
}

// Framer Motion Viewport Animation Detection
function detectFramerMotionScroll(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    // Look for Framer Motion viewport animations
    const framerElements = document.querySelectorAll('[data-framer-appear-id], [data-framer-name]');
    
    framerElements.forEach((el, index) => {
      try {
        // Check for Framer-specific properties
        const framerData = (el as any).__framer;
        
        if (framerData?.viewport || el.hasAttribute('data-framer-appear-id')) {
          const viewport = framerData?.viewport || {};
          
          animations.push({
            id: `framer-${index}`,
            library: 'framer-motion',
            element: getElementSelector(el),
            trigger: {
              element: getElementSelector(el),
              start: viewport.margin || '0px',
              end: 'auto',
              scrub: false,
              pin: false,
              once: viewport.once !== false,
            },
            animation: {
              type: 'js',
              properties: ['opacity', 'transform'],
              duration: viewport.amount || null,
              easing: 'ease',
              delay: 0,
            },
            markers: false,
          });
        }
      } catch (err) {
        console.warn('Error processing Framer Motion element:', err);
      }
    });
  } catch (error) {
    console.warn('Error detecting Framer Motion:', error);
  }
  
  return animations;
}

// Locomotive Scroll Detection
function detectLocomotiveScroll(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    // Check for Locomotive Scroll instance
    const locomotiveElements = document.querySelectorAll('[data-scroll]');
    
    locomotiveElements.forEach((el, index) => {
      try {
        const speed = el.getAttribute('data-scroll-speed') || '0';
        const direction = el.getAttribute('data-scroll-direction') || 'vertical';
        const delay = el.getAttribute('data-scroll-delay') || '0';
        const scrollClass = el.getAttribute('data-scroll-class');
        const repeat = el.getAttribute('data-scroll-repeat') === 'true';
        
        animations.push({
          id: `locomotive-${index}`,
          library: 'locomotive',
          element: getElementSelector(el),
          trigger: {
            element: getElementSelector(el),
            start: 'enter viewport',
            end: 'leave viewport',
            scrub: true,
            pin: false,
            repeat,
          },
          animation: {
            type: 'transform',
            properties: [direction === 'horizontal' ? 'translateX' : 'translateY'],
            duration: null,
            easing: 'linear',
            delay: parseFloat(delay),
            speed: parseFloat(speed),
          },
          markers: false,
          className: scrollClass || undefined,
        });
      } catch (err) {
        console.warn('Error processing Locomotive element:', err);
      }
    });
  } catch (error) {
    console.warn('Error detecting Locomotive Scroll:', error);
  }
  
  return animations;
}

// AOS (Animate On Scroll) Detection
function detectAOS(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    const aosElements = document.querySelectorAll('[data-aos]');
    
    aosElements.forEach((el, index) => {
      try {
        const aosName = el.getAttribute('data-aos') || 'fade';
        const duration = el.getAttribute('data-aos-duration') || '400';
        const easing = el.getAttribute('data-aos-easing') || 'ease';
        const delay = el.getAttribute('data-aos-delay') || '0';
        const offset = el.getAttribute('data-aos-offset') || '120';
        const once = el.getAttribute('data-aos-once') === 'true';
        
        animations.push({
          id: `aos-${index}`,
          library: 'aos',
          element: getElementSelector(el),
          trigger: {
            element: getElementSelector(el),
            start: `top bottom-${offset}px`,
            end: 'auto',
            scrub: false,
            pin: false,
            once,
          },
          animation: {
            type: 'css',
            properties: [aosName],
            duration: parseInt(duration),
            easing,
            delay: parseInt(delay),
          },
          markers: false,
          animationName: aosName,
        });
      } catch (err) {
        console.warn('Error processing AOS element:', err);
      }
    });
  } catch (error) {
    console.warn('Error detecting AOS:', error);
  }
  
  return animations;
}

// Intersection Observer Detection
function detectIntersectionObserver(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    // This is tricky - we need to hook into IntersectionObserver to track usage
    // For now, we'll look for common patterns and attributes
    const observedElements = document.querySelectorAll('[data-observe], .fade-in, .slide-in, .animate-on-scroll');
    
    observedElements.forEach((el, index) => {
      try {
        const classList = Array.from(el.classList);
        const animationClasses = classList.filter(c => 
          c.includes('fade') || c.includes('slide') || c.includes('animate')
        );
        
        if (animationClasses.length > 0) {
          animations.push({
            id: `io-${index}`,
            library: 'intersection-observer',
            element: getElementSelector(el),
            trigger: {
              element: getElementSelector(el),
              start: 'enter viewport',
              end: 'auto',
              scrub: false,
              pin: false,
              threshold: 0.1,
            },
            animation: {
              type: 'css',
              properties: animationClasses,
              duration: null,
              easing: 'ease',
              delay: 0,
            },
            markers: false,
          });
        }
      } catch (err) {
        console.warn('Error processing IO element:', err);
      }
    });
  } catch (error) {
    console.warn('Error detecting Intersection Observer:', error);
  }
  
  return animations;
}

// ScrollMagic Detection
function detectScrollMagic(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    if (typeof window !== 'undefined' && (window as any).ScrollMagic) {
      // ScrollMagic detection would require access to controller instances
      // This is a placeholder for future implementation
      console.info('ScrollMagic detected but extraction not yet implemented');
    }
  } catch (error) {
    console.warn('Error detecting ScrollMagic:', error);
  }
  
  return animations;
}

// CSS Scroll Timeline Detection (Experimental)
function detectCSSScrollTimeline(): ScrollAnimationData[] {
  const animations: ScrollAnimationData[] = [];
  
  try {
    // Look for elements with animation-timeline property
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((el, index) => {
      try {
        const computed = window.getComputedStyle(el);
        const animationTimeline = (computed as any).animationTimeline;
        
        if (animationTimeline && animationTimeline !== 'auto' && animationTimeline !== 'none') {
          animations.push({
            id: `css-scroll-${index}`,
            library: 'css-scroll-timeline',
            element: getElementSelector(el),
            trigger: {
              element: getElementSelector(el),
              start: 'auto',
              end: 'auto',
              scrub: true,
              pin: false,
            },
            animation: {
              type: 'css',
              properties: [computed.animationName],
              duration: parseFloat(computed.animationDuration) * 1000 || null,
              easing: computed.animationTimingFunction,
              delay: parseFloat(computed.animationDelay) * 1000 || 0,
            },
            markers: false,
            animationName: computed.animationName,
          });
        }
      } catch (err) {
        // Silently ignore - this is experimental
      }
    });
  } catch (error) {
    console.warn('Error detecting CSS Scroll Timeline:', error);
  }
  
  return animations;
}

// Helper: Generate CSS selector for element
function getElementSelector(element: Element): string {
  if (!element) return 'unknown';
  
  try {
    // Use ID if available
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Use class if available
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0 && classes[0]) {
        return `.${classes.join('.')}`;
      }
    }
    
    // Use tag name with nth-of-type
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === element.tagName
      );
      const index = siblings.indexOf(element);
      return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }
    
    return element.tagName.toLowerCase();
  } catch (err) {
    return 'unknown';
  }
}

// Main Export: Detect all scroll animations
export function detectAllScrollAnimations(): ScrollAnimationData[] {
  console.log('🔍 Starting scroll animation detection...');
  
  const allAnimations: ScrollAnimationData[] = [];
  
  // Run all detectors
  const detectors = [
    { name: 'GSAP ScrollTrigger', fn: detectGSAPScrollTrigger },
    { name: 'Framer Motion', fn: detectFramerMotionScroll },
    { name: 'Locomotive Scroll', fn: detectLocomotiveScroll },
    { name: 'AOS', fn: detectAOS },
    { name: 'Intersection Observer', fn: detectIntersectionObserver },
    { name: 'ScrollMagic', fn: detectScrollMagic },
    { name: 'CSS Scroll Timeline', fn: detectCSSScrollTimeline },
  ];
  
  detectors.forEach(({ name, fn }) => {
    try {
      const detected = fn();
      if (detected.length > 0) {
        console.log(`✅ ${name}: Found ${detected.length} animations`);
        allAnimations.push(...detected);
      }
    } catch (error) {
      console.warn(`Error running ${name} detector:`, error);
    }
  });
  
  console.log(`🎉 Total scroll animations detected: ${allAnimations.length}`);
  
  return allAnimations;
}

// Export individual detectors for testing
export {
  detectGSAPScrollTrigger,
  detectFramerMotionScroll,
  detectLocomotiveScroll,
  detectAOS,
  detectIntersectionObserver,
  detectScrollMagic,
  detectCSSScrollTimeline,
};
