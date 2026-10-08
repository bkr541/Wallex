import { buildPatterns, filtersFromRules, isIncome, makeScope, type Bubble } from './patterns';
import type { Analysis } from './recurring';
import type { Rules } from './rules';
import type { LinkedAccount, Txn } from './wallex';

// What each rule is doing to the person's own numbers right now, found by working the figures out with the rule
// on and off. Plain calculation: the wording lives in the Rules tab.

export interface RuleImpacts {
  days: number; // the period the figures below cover
  effectiveDays: number;
  partial: boolean;
  hasCredit: boolean;
  spendingPerMonth: number; // total spending with the rules as they are
  cardPaymentsPerMonth: number; // what counting payments to linked cards would add (or is adding)
  ignoredPerMonth: number; // spending left out because of ignored merchants
  incomePay: number; // monthly income counting only pay the bank tags as income
  incomeAll: number; // monthly income counting every deposit that is not your own money moving
  bills: number; // bills drawn with the rules as they are
  merchants: number;
  hiddenByMinimum: number; // bills and merchants under the minimum
  billsFromCategories: number; // bills that are bills only because of a category rule
  candidates: Bubble[]; // every bill and merchant in the period, ignored ones included, biggest first
}

export function computeImpacts(txns: Txn[], accounts: LinkedAccount[], analysis: Analysis, rules: Rules): RuleImpacts {
  const filters = filtersFromRules(rules);

  const spending = (r: Rules) => {
    const scope = makeScope(txns, accounts, filters, r);
    let sum = 0;
    for (const t of txns) if (scope.inView(t) && scope.isSpending(t)) sum -= t.amount;
    return sum * scope.toMonthly;
  };
  const income = (r: Rules) => {
    const scope = makeScope(txns, accounts, filters, r);
    let sum = 0;
    for (const t of txns) if (scope.inView(t) && isIncome(t, scope)) sum += t.amount;
    return sum * scope.toMonthly;
  };

  const now = buildPatterns(txns, accounts, filters, analysis, rules);
  const noMinimum = buildPatterns(txns, accounts, { ...filters, minAmount: 0 }, analysis, rules);
  const noIgnores = buildPatterns(txns, accounts, { ...filters, minAmount: 0 }, analysis, { ...rules, ignoredMerchants: [] });
  const noBillCategories = buildPatterns(txns, accounts, filters, analysis, { ...rules, billCategories: [] });

  return {
    days: now.scope.days,
    effectiveDays: now.scope.effectiveDays,
    partial: now.scope.partial,
    hasCredit: now.hasCredit,
    spendingPerMonth: spending(rules),
    cardPaymentsPerMonth: Math.max(0, spending({ ...rules, countCardPayments: true }) - spending({ ...rules, countCardPayments: false })),
    ignoredPerMonth: rules.ignoredMerchants.length ? Math.max(0, spending({ ...rules, ignoredMerchants: [] }) - spending(rules)) : 0,
    incomePay: income({ ...rules, incomeFrom: 'pay' }),
    incomeAll: income({ ...rules, incomeFrom: 'all' }),
    bills: now.bills.length,
    merchants: now.merchants.length,
    hiddenByMinimum: Math.max(0, noMinimum.bills.length + noMinimum.merchants.length - (now.bills.length + now.merchants.length)),
    billsFromCategories: Math.max(0, now.bills.length - noBillCategories.bills.length),
    candidates: [...noIgnores.bills, ...noIgnores.merchants].sort((a, b) => b.amount - a.amount),
  };
}
