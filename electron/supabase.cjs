const config = require('./config.cjs');

async function rpc(name, authToken, body, supplied = {}) {
  const fallback = config.getSupabase();
  const url = supplied.url || fallback.url;
  const key = supplied.key || fallback.key;
  if (!url || !key) throw new Error('Supabase is not configured for secure Plaid storage.');
  if (!authToken) throw new Error('Sign in again before changing linked accounts.');
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (response.ok) return;
  let message = `Supabase rejected ${name} (${response.status}).`;
  try {
    const data = await response.json();
    if (data?.message) message = data.message;
  } catch {
    // Keep the status-based message.
  }
  throw new Error(message);
}

const storePlaidItem = (authToken, item, supplied) =>
  rpc('store_plaid_item', authToken, {
    p_item_id: item.itemId,
    p_institution_name: item.institutionName,
    p_access_token: item.accessToken,
  }, supplied);

const deletePlaidItem = (authToken, itemId, supplied) => rpc('delete_plaid_item', authToken, { p_item_id: itemId }, supplied);

module.exports = { storePlaidItem, deletePlaidItem };
