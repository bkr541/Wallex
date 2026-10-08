import { DEFAULTS, getAppearance, hydrateAppearance } from './appearance';
import { flushCloudWrites, loadCloudSnapshot, syncPlaidSettings, syncProfile, syncRecurringOverride, syncRules, syncUserSettings } from './cloud';
import { hydrateOnboarding } from './onboarding';
import { getProfile, hydrateProfile } from './profile';
import { getRules, hydrateRules, rulesAreDefault } from './rules';
import { getOverrides, hydrateOverrides, type Override } from './recurringOverrides';
import { getMobileView, hydrateMobileView } from './viewState';
import { wallex, type PlaidSettings } from './wallex';

const readObject = (key: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export async function hydrateCloudUser(userId: string, email: string) {
  await flushCloudWrites(userId);
  const snapshot = await loadCloudSnapshot(userId);

  if (snapshot.profile) {
    const remote = {
      firstName: snapshot.profile.first_name,
      lastName: snapshot.profile.last_name,
      preferredName: snapshot.profile.preferred_name,
      email,
      phone: snapshot.profile.phone,
      photo: snapshot.profile.photo_data,
    };
    const local = getProfile();
    const localHasDetails = local.email.toLowerCase() === email.toLowerCase() && Boolean(local.preferredName || local.phone || local.photo);
    const remoteHasDetails = Boolean(remote.preferredName || remote.phone || remote.photo);
    if (localHasDetails && !remoteHasDetails) await syncProfile(local);
    else hydrateProfile(remote);
  }

  if (snapshot.settings) {
    const localAppearance = getAppearance();
    const remoteAppearance = {
      theme: snapshot.settings.theme,
      accent: snapshot.settings.accent,
      textSize: snapshot.settings.text_size,
      reduceMotion: snapshot.settings.reduce_motion,
    };
    const localCustomized = JSON.stringify(localAppearance) !== JSON.stringify(DEFAULTS);
    const remoteDefault = JSON.stringify(remoteAppearance) === JSON.stringify(DEFAULTS);
    if (localCustomized && remoteDefault) {
      await syncUserSettings({
        theme: localAppearance.theme,
        accent: localAppearance.accent,
        text_size: localAppearance.textSize,
        reduce_motion: localAppearance.reduceMotion,
      });
    } else hydrateAppearance(remoteAppearance);

    const localMobile = getMobileView();
    if (localMobile && snapshot.settings.view_mode === 'desktop') await syncUserSettings({ view_mode: 'mobile' });
    else hydrateMobileView(snapshot.settings.view_mode === 'mobile');

    const localClosed = readObject('wallex-overview-closed') as Record<string, boolean>;
    if (Object.keys(localClosed).length && !Object.keys(snapshot.settings.overview_closed ?? {}).length) {
      await syncUserSettings({ overview_closed: localClosed });
    } else {
      localStorage.setItem('wallex-overview-closed', JSON.stringify(snapshot.settings.overview_closed ?? {}));
    }

    const localNotifications = readObject('wallex-notification-preferences');
    if (Object.keys(localNotifications).length) await syncUserSettings({ notification_preferences: localNotifications });
    else localStorage.setItem('wallex-notification-preferences', JSON.stringify(snapshot.settings.notification_preferences ?? {}));
    hydrateOnboarding(email, snapshot.settings.onboarding_completed);
  }

  // Rules: the account's copy wins, unless it has none yet and this computer does.
  if (snapshot.rules !== undefined) {
    const remoteHasRules = !!snapshot.rules && Object.keys(snapshot.rules).length > 0;
    const local = getRules();
    if (!remoteHasRules && !rulesAreDefault(local)) await syncRules(local);
    else if (remoteHasRules) hydrateRules(snapshot.rules);
  }

  const localOverrides = getOverrides();
  if (Object.keys(localOverrides).length && snapshot.overrides.length === 0) {
    await Promise.all(Object.entries(localOverrides).map(([id, value]) => syncRecurringOverride(id, value)));
  } else {
    const remote = Object.fromEntries(snapshot.overrides.map((row) => [
      row.recurring_id,
      {
        ...(row.label ? { label: row.label } : {}),
        ...(row.kind ? { kind: row.kind } : {}),
        ...(row.hide_reason ? { hide: row.hide_reason } : {}),
      } satisfies Override,
    ]));
    hydrateOverrides(remote);
  }

  if (snapshot.plaidSettings && wallex.available()) {
    const local = await wallex.getStatus();
    if (local.ok && !snapshot.plaidSettings.bank_id && local.data.clientId) {
      await syncPlaidSettings({
        environment: local.data.environment,
        clientId: local.data.clientId,
        secret: '',
        products: local.data.products,
        countries: local.data.countries,
        language: local.data.language,
        webhookUrl: local.data.webhookUrl,
        redirectUri: local.data.redirectUri,
      }, local.data.bankId);
    } else {
      const remote: PlaidSettings = {
        environment: snapshot.plaidSettings.environment,
        clientId: local.ok ? local.data.clientId : '',
        secret: '',
        products: snapshot.plaidSettings.products,
        countries: snapshot.plaidSettings.country_codes,
        language: snapshot.plaidSettings.language,
        webhookUrl: snapshot.plaidSettings.webhook_url ?? '',
        redirectUri: snapshot.plaidSettings.redirect_uri ?? '',
      };
      await wallex.saveSettings({ settings: remote, bankId: snapshot.plaidSettings.bank_id ?? 'ins_56' });
    }
    if (local.ok && local.data.connections.length) {
      const synced = await wallex.syncConnections();
      if (!synced.ok) throw new Error(synced.error);
    }
  }
}
