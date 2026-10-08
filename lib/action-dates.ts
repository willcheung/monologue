export function actionDateBounds(fromValue?: string, toValue?: string) {
  function parse(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const from = parse(fromValue);
  const to = parse(toValue);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(toValue ?? "")) to.setHours(23, 59, 59, 999);
  return { from, to };
}
