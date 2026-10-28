let beanCount = 0;

export function nextBeanGradientId(): string {
  beanCount += 1;
  return `bean-gradient-${beanCount}`;
}
