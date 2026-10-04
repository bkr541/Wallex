// A set of transactions to narrow the Checking tab to, such as every charge from one merchant or bill.
export interface TxFilter {
  name: string; // what to call it in the banner, e.g. "Spotify"
  ids: string[]; // the transactions to show
}
