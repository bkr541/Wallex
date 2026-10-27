import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildTransactionsWorkbook } from './exportTransactions';
import type { TxnWithBalance } from './balances';

test('Excel round trip preserves transaction fields, typed values, filters, and frozen headers', async () => {
  const base: TxnWithBalance = {
    id: 'txn-1', accountId: 'account-1', date: '2026-10-01', authorizedDate: null,
    merchant: '=SUM(A1:A2)', logos: ['https://example.com/logo.png'],
    category: 'Food & Drink', categoryKey: 'FOOD', categoryDetailKey: 'GROCERIES',
    channel: 'In Store', pending: false, amount: -84.32, balance: 100.50,
    details: [{ label: 'Currency', value: 'USD' }, { label: 'Bank Description', value: 'Store & more' }],
  };
  const buffer = await buildTransactionsWorkbook([
    base,
    { ...base, id: 'txn-2', amount: 500, pending: true, balance: null, authorizedDate: '2026-09-30', details: [{ label: 'Reference', value: '000123' }] },
  ], [{ id: 'account-1', name: 'Checking', mask: '0001', type: 'depository', subtype: 'checking', institution: 'Test Bank', current: 100.50, available: 100.50 }]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.worksheets.length, 1);
  const sheet = workbook.getWorksheet('Transactions')!;
  const headers = sheet.getRow(1).values as string[];
  const cell = (row: number, name: string) => sheet.getCell(row, headers.indexOf(name));
  assert.equal(sheet.rowCount, 3);
  assert.equal(cell(2, 'Merchant').value, '=SUM(A1:A2)');
  assert.equal(cell(2, 'Merchant').type, ExcelJS.ValueType.String);
  assert.equal(cell(2, 'Date').type, ExcelJS.ValueType.Date);
  assert.equal((cell(2, 'Date').value as Date).toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(cell(2, 'Authorized Date').value, null);
  assert.equal(cell(2, 'Money In').value, 0);
  assert.equal(cell(2, 'Money Out').value, 84.32);
  assert.equal(cell(3, 'Money In').value, 500);
  assert.equal(cell(3, 'Money Out').value, 0);
  assert.equal(cell(3, 'Estimated Balance').value, null);
  assert.equal(cell(3, 'Status').value, 'Pending');
  assert.equal(cell(2, 'Account Last Four').value, '0001');
  assert.equal(cell(3, 'Detail: Reference').value, '000123');
  assert.equal(cell(2, 'Detail: Bank Description').value, 'Store & more');
  assert.equal(cell(2, 'Logo URLs').value, base.logos[0]);
  assert.equal(sheet.views[0].state, 'frozen');
  assert.equal((sheet.views[0] as ExcelJS.WorksheetViewFrozen).ySplit, 1);
  assert.ok(sheet.getTable('Transactions'));
  for (let index = 0; index < headers.length - 1; index++) {
    assert.equal(sheet.getTable('Transactions').getColumn(index).filterButton, true);
  }
});
