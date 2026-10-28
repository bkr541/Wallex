import { useMemo } from 'react';
import { useLoanLinks, reconcileLinks } from './loanLinks';
import { useLoanPayments } from './loanPayments';
import { useLoanRoles } from './loanRoles';
import { useLoans } from './loans';
import type { LoanObligationData } from './obligations';
import type { Load } from './useTransactions';

// Everything the obligation selector needs from the Loans page, as one object that changes only when a loan, a link, a
// recorded payment or the bank's transactions do. Overview, Schedule and Forecast all read their loans through this.
export function useLoanObligationData(load: Load): LoanObligationData {
  const loans = useLoans();
  const links = useLoanLinks();
  const payments = useLoanPayments();
  const roles = useLoanRoles();
  return useMemo(() => {
    const live = load.state === 'live';
    const views = reconcileLinks(links, live ? load.allTransactions : null, { knownAccountIds: new Set(live ? load.allAccounts.map((a) => a.id) : []) });
    return { loans, links, views, payments, roles };
  }, [loans, links, payments, roles, load]);
}
