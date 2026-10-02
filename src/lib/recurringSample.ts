import type { Analysis, Confidence, Kind, Recurring } from './recurring';

// Example relationships shown until a bank is connected. They are the ones found by reading
// ten Chase statements by hand, so they show what the detector is aiming for.
const item = (
  name: string,
  kind: Kind,
  confidence: Confidence,
  amountLabel: string,
  cadenceLabel: string,
  summary: string,
  monthly: number | null,
  notes: string[],
): Recurring => ({
  id: name,
  name,
  kind,
  confidence,
  logos: [],
  amountLabel,
  cadenceLabel,
  summary,
  monthly,
  active: true,
  notes,
  recent: [],
  schedule: [],
});

const ITEMS: Recurring[] = [
  item('Progressive', 'bill', 'confirmed', '$223–243', '~19th', 'Insurance · recurring', 230, [
    'Repeated insurance premium pattern. Treat as a fixed monthly bill.',
  ]),
  item('Verizon Wireless', 'bill', 'likely', '$97–133', '~29th', 'Phone bill', 120, [
    'Amount varies within a fairly narrow range. Useful for bill forecasting.',
  ]),
  item('IRS', 'bill', 'confirmed', '$150', '~1st', 'Tax payment', 150, ['Stable recurring amount, separate from discretionary spending.']),
  item('Mastercard payment', 'debt', 'likely', '$118–147', '~26th', 'Credit-card payment', 125, [
    'If the card account is also linked, count this as a transfer, not spending, to avoid double counting.',
  ]),
  item('J Max Davis Attorneys', 'bill', 'likely', '$240–300', '~3rd', 'Recurring service obligation', 260, [
    'Repeated service payment, typically in the mid-$200 range.',
  ]),
  item('EarnIn repayments', 'debt', 'confirmed', 'Variable', '2 patterns · ~15th, ~30th', 'Debt / advance repayments', null, [
    'Several repayments land on each payday. Treated as one event per payday.',
  ]),
  item('Affirm', 'installment', 'likely', '$57.41', '~monthly', 'Installment', 57, [
    'Temporary recurring obligation. It should drop out of the forecast when paid off.',
  ]),
  item('Lost Lands installments', 'installment', 'confirmed', '$21.53 · $43.35', 'every 2 weeks', 'Event installment plan', 140, [
    'The bank tags these as recurring card purchases. Two installments land together each time.',
  ]),
  item('Midjourney', 'usage', 'confirmed', '$32.40 + extras', '~30th', 'Subscription + usage', 32, [
    'The bank tags these as recurring. Smaller $4.32 charges appear in some periods and are treated as extras.',
  ]),
  item('Output', 'subscription', 'confirmed', '$14.99', '~25th', 'Audio subscription', 15, ['Clean recurring pattern, tagged by the bank.']),
  item('GoWilder', 'subscription', 'confirmed', '$5', '2 patterns · ~6th, ~19th', 'Membership', 10, [
    '2 separate recurring patterns detected. These could be two plans, an add-on, or two billing relationships.',
  ]),
  item('OpenAI / ChatGPT', 'subscription', 'confirmed', '$20', '~11th', 'AI subscription', 20, ['Tagged by the bank. A duplicate-subscription check candidate.']),
  item('Anthropic / Claude', 'usage', 'confirmed', '$20 + usage', '~16th', 'Subscription + usage', 20, [
    'A steady $20 subscription, plus many roughly $25 usage charges treated as variable.',
  ]),
  item('Suno', 'usage', 'confirmed', '$10 + extras', '~21st', 'Subscription + usage', 10, ['Base charge plus smaller extras that look like credits.']),
  item('Hypeddit', 'subscription', 'confirmed', '$20', '~20th', 'Music marketing', 20, ['Consistent pattern with a near-fixed price.']),
  item('OpenArt', 'subscription', 'confirmed', '$14–15', '~14th', 'Creative tool', 14, ['Recurring across several statements.']),
  item('Glibatree', 'subscription', 'confirmed', '$20', '~16th', 'Software', 20, ['Repeated across multiple months at a stable amount.']),
  item('Wispr Flow', 'subscription', 'new', '$15', '~19th', 'New recurring candidate', 15, [
    'Only two cycles so far. Likely newly started software.',
  ]),
  item('Soundtrap', 'subscription', 'likely', '$9.99', '~7th', 'Software subscription', 10, ['Billed through PayPal at a stable small amount.']),
  item('Spotify', 'subscription', 'likely', '$13–14', '~14th', 'Streaming', 14, ['Small month-to-month change. Useful for price-change alerts.']),
  item('Audimee', 'subscription', 'likely', '$12–25', '~30th', 'Audio tool', 12, ['Price changes over time.']),
  item('Waves', 'subscription', 'likely', '$7.99', '~30th', 'Audio tool', 8, ['Recurring small software charge.']),
  item('BeaconsAI', 'subscription', 'likely', '$10', '~25th', 'Service subscription', 10, ['Several consecutive months. Could be inactive if charges stop.']),
  item('GoDaddy', 'subscription', 'likely', '$20–22', '~25th', 'Domain / hosting', 21, ['Repeated web-service charges.']),
  item('Walmart+', 'subscription', 'likely', '$98', 'annual', 'Annual membership', 8, ['Likely annual, so it belongs in a renewal calendar.']),
  item('Apple.com Bill', 'aggregator', 'review', 'Multiple', 'many price points', 'Billing aggregator', null, [
    'Apple is a billing wrapper. Underlying services should be split if you can identify them.',
  ]),
  item('Google services', 'aggregator', 'review', '$2.99 / $19.99', '2 patterns', 'Multiple recurring products', null, [
    'More than one subscription appears to sit behind these charges.',
  ]),
  item('Fastspring', 'aggregator', 'review', '$24.99', '~6th', 'Processor-billed software', null, [
    'The underlying product may need a manual label.',
  ]),
  item('Patreon', 'aggregator', 'review', 'Multiple', '~7th', 'Memberships', null, [
    'Several price points, so possibly multiple memberships.',
  ]),
  item('Unidentified PayPal payment', 'aggregator', 'review', '~$111–122', '~19th', 'Needs identification', null, [
    'Repeats around the same point each month, but the underlying merchant is not clear.',
  ]),
  item('Shell Oil', 'habit', 'habit', '$21 avg', '126 charges', 'Recurring habit · $3,245 total', null, [
    'Frequent, with no fixed billing cadence. A spending habit, not a bill.',
  ]),
  item('Walmart', 'habit', 'habit', '$33 avg', '41 charges', 'Recurring habit · $1,368 total', null, [
    'Frequent, with no fixed billing cadence. A spending habit, not a bill.',
  ]),
  item('Atlanta Eagle', 'habit', 'habit', '$17 avg', '49 charges', 'Recurring habit · $826 total', null, [
    'Frequent, with no fixed billing cadence. A spending habit, not a bill.',
  ]),
];

const counts: Record<Confidence, number> = { confirmed: 0, likely: 0, new: 0, review: 0, habit: 0 };
for (const i of ITEMS) counts[i.confidence]++;

export const SAMPLE_ANALYSIS: Analysis = {
  items: ITEMS,
  counts,
  monthlyTotal: ITEMS.filter((i) => i.confidence !== 'review' && i.confidence !== 'habit').reduce((s, i) => s + (i.monthly ?? 0), 0),
  earliest: null,
  latest: null,
  monthsOfHistory: 0,
};
