export const round2 = (v: number) => Math.round(v * 100) / 100;

export function buildPriorityOrder(
  order: string[],
  othersTypes: string[],
): { group: string; types: string[] }[] {
  return order.map((group) => {
    if (group === 'others') {
      return { group: 'others', types: othersTypes };
    }
    return { group, types: [group] };
  });
}

export function allocatePaid<T extends { paymentType: string; amount: number }>(
  lineItems: T[],
  totalPaid: number,
  priorityOrder: { group: string; types: string[] }[],
): (T & { paidAmount: number; dueAmount: number })[] {
  const result: (T & { paidAmount: number; dueAmount: number })[] = [];
  let remaining = round2(totalPaid);

  for (const pg of priorityOrder) {
    const items = lineItems.filter((i) => pg.types.includes(i.paymentType));
    for (const item of items) {
      if (remaining >= item.amount) {
        result.push({ ...item, paidAmount: item.amount, dueAmount: 0 });
        remaining = round2(remaining - item.amount);
      } else {
        result.push({
          ...item,
          paidAmount: remaining,
          dueAmount: round2(item.amount - remaining),
        });
        remaining = 0;
      }
    }
  }

  // Handle items not matched by any priority group (catch-all)
  const matchedTypes = new Set(result.map((r) => r.paymentType));
  const unmatched = lineItems.filter((i) => !matchedTypes.has(i.paymentType));
  for (const item of unmatched) {
    if (remaining >= item.amount) {
      result.push({ ...item, paidAmount: item.amount, dueAmount: 0 });
      remaining = round2(remaining - item.amount);
    } else {
      result.push({
        ...item,
        paidAmount: remaining,
        dueAmount: round2(item.amount - remaining),
      });
      remaining = 0;
    }
  }

  return result;
}
