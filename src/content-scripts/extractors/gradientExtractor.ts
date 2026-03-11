import { ThemeGradientKind, ThemeGradientSource } from '../../utils/themeStudio';

const isGradientValue = (value: string) => /(?:linear|radial|conic)-gradient\(/i.test(value);

const selectorForElement = (element: Element): string => {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const classNames = Array.from(element.classList)
    .filter((className) => !className.startsWith('di-'))
    .slice(0, 2);

  if (classNames.length > 0) {
    return `${element.tagName.toLowerCase()}.${classNames.map((name) => CSS.escape(name)).join('.')}`;
  }

  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();

  const index = Array.from(parent.children).indexOf(element) + 1;
  return `${parent.tagName.toLowerCase()} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
};

const getGradientKind = (computed: CSSStyleDeclaration): ThemeGradientKind => {
  const backgroundClip = `${computed.backgroundClip} ${computed.getPropertyValue('-webkit-background-clip')}`.toLowerCase();
  const textFillColor = computed.getPropertyValue('-webkit-text-fill-color').trim().toLowerCase();
  const transparentText =
    computed.color === 'rgba(0, 0, 0, 0)' ||
    computed.color === 'transparent' ||
    textFillColor === 'rgba(0, 0, 0, 0)' ||
    textFillColor === 'transparent';

  return backgroundClip.includes('text') || transparentText ? 'text' : 'background';
};

export const extractGradients = (): ThemeGradientSource[] => {
  const elements = document.querySelectorAll('*');
  const gradients = new Map<
    string,
    {
      value: string;
      kind: ThemeGradientKind;
      count: number;
      sampleSelectors: Set<string>;
    }
  >();

  elements.forEach((element) => {
    const computed = window.getComputedStyle(element);
    const backgroundImage = computed.backgroundImage;
    if (!backgroundImage || backgroundImage === 'none' || !isGradientValue(backgroundImage)) return;

    const kind = getGradientKind(computed);
    const key = `${kind}:${backgroundImage}`;
    const current =
      gradients.get(key) ||
      {
        value: backgroundImage,
        kind,
        count: 0,
        sampleSelectors: new Set<string>(),
      };

    current.count += 1;
    if (current.sampleSelectors.size < 6) {
      current.sampleSelectors.add(selectorForElement(element));
    }

    gradients.set(key, current);
  });

  return Array.from(gradients.values())
    .map((entry) => ({
      value: entry.value,
      kind: entry.kind,
      count: entry.count,
      sampleSelectors: Array.from(entry.sampleSelectors),
    }))
    .sort((left, right) => right.count - left.count);
};
