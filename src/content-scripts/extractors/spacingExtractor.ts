export interface SpacingInfo {
  margin: string;
  padding: string;
  width: string;
  height: string;
  position: string;
  display: string;
}

export const extractSpacing = (element: HTMLElement): SpacingInfo => {
  const computed = window.getComputedStyle(element);

  return {
    margin: `${computed.marginTop} ${computed.marginRight} ${computed.marginBottom} ${computed.marginLeft}`,
    padding: `${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`,
    width: computed.width,
    height: computed.height,
    position: computed.position,
    display: computed.display,
  };
};

// Detect common spacing values (simplified grid detection)
// TODO: Implement sophisticated grid detection logic as per P0 requirement
export const detectSpacingSystem = () => {
  const spacings = new Set<number>();
  const elements = document.querySelectorAll('*');
  
  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    const keys: (keyof CSSStyleDeclaration)[] = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'];
    
    keys.forEach(key => {
      const val = parseInt(style[key] as string);
      if (val > 0) spacings.add(val);
    });
  });

  return Array.from(spacings).sort((a, b) => a - b);
};
