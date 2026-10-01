import type { Bank } from './wallex';

// Plaid institution IDs (used by Sandbox) plus a routing number so Link can pre-select the bank.
export const BANKS: Bank[] = [
  { id: 'ins_56', name: 'Chase', routingNumber: '021000021' },
  { id: 'ins_127989', name: 'Bank of America', routingNumber: '026009593' },
  { id: 'ins_127991', name: 'Wells Fargo', routingNumber: '121000248' },
  { id: 'ins_5', name: 'Citibank', routingNumber: '021000089' },
  { id: 'ins_128026', name: 'Capital One', routingNumber: '031176110' },
  { id: 'ins_127990', name: 'U.S. Bank', routingNumber: '042000013' },
  { id: 'ins_13', name: 'PNC', routingNumber: '043000096' },
  { id: 'ins_14', name: 'TD Bank', routingNumber: '031101266' },
  { id: 'ins_130888', name: 'Truist', routingNumber: '061000104' },
  { id: 'ins_25', name: 'Ally Bank', routingNumber: '124003116' },
  { id: 'ins_15', name: 'Navy Federal Credit Union', routingNumber: '256074974' },
  { id: 'ins_33', name: 'Discover', routingNumber: '031100649' },
  { id: 'ins_11', name: 'Charles Schwab', routingNumber: '121202211' },
];
