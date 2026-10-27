import type { TxnWithBalance } from './balances';
import type { LinkedAccount } from './wallex';

export async function buildTransactionsWorkbook(rows: TxnWithBalance[], accounts: LinkedAccount[]) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Wallex';
  const sheet = workbook.addWorksheet('Transactions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const byAccount = new Map(accounts.map((account) => [account.id, account]));
  const detailLabels = [...new Set(rows.flatMap((row) => row.details.map((detail) => detail.label)))];
  const headers = [
    'Date', 'Authorized Date', 'Merchant', 'Category', 'Channel', 'Status',
    'Money In', 'Money Out', 'Amount', 'Estimated Balance',
    'Bank', 'Account', 'Account Last Four', 'Account Type', 'Account Subtype',
    'Transaction ID', 'Account ID', 'Category Key', 'Category Detail Key', 'Logo URLs',
    ...detailLabels.map((label) => `Detail: ${label}`),
  ];
  const date = (value: string | null) => value ? new Date(`${value}T00:00:00Z`) : null;
  const values = rows.map((row) => {
    const account = byAccount.get(row.accountId);
    return [
      date(row.date), date(row.authorizedDate), row.merchant, row.category, row.channel,
      row.pending ? 'Pending' : 'Posted', Math.max(row.amount, 0), Math.max(-row.amount, 0),
      row.amount, row.balance, account?.institution ?? '', account?.name ?? row.details.find((detail) => detail.label === 'Account')?.value ?? '',
      account?.mask ?? '', account?.type ?? '', account?.subtype ?? '',
      row.id, row.accountId, row.categoryKey, row.categoryDetailKey, row.logos.join('\n'),
      ...detailLabels.map((label) => row.details.filter((detail) => detail.label === label).map((detail) => detail.value).join('\n')),
    ];
  });
  sheet.addTable({
    name: 'Transactions', ref: 'A1', headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: headers.map((name) => ({ name, filterButton: true })), rows: values,
  });
  sheet.columns.forEach((column, index) => {
    column.width = index < 2 ? 16 : index === 2 || index >= 15 ? 32 : 24;
    if (index < 2) column.numFmt = 'mm/dd/yyyy';
    if (index >= 6 && index <= 9) column.numFmt = '#,##0.00;[Red](#,##0.00);0.00';
  });
  sheet.getRow(1).height = 32;
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.getCell('J1').note = 'Estimated from the current account balance and transaction order. Within-day ordering is approximate. Pending transactions have no balance. Amounts use the currency in the transaction details.';
  return workbook.xlsx.writeBuffer();
}

export async function downloadTransactions(rows: TxnWithBalance[], accounts: LinkedAccount[], sample: boolean) {
  const buffer = await buildTransactionsWorkbook(rows, accounts);
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wallex-${sample ? 'sample-' : ''}transactions-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
