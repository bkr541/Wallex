import SectionTitle from '../components/SectionTitle';
import { EditorialLogin, FloatingLogin, PhoneLogin, SplitLogin, StepsLogin } from '../components/auth/Variants';

const STYLES: { id: string; name: string; note: string; Component: () => React.ReactElement }[] = [
  { id: 'split', name: 'Split panel', note: 'A brand panel with three reasons to trust Wallex beside the form, and a sliding Log in / Sign up switch.', Component: SplitLogin },
  { id: 'floating', name: 'Floating card', note: 'A frosted card over soft colour, with a floating logo, floating labels and an underline switch.', Component: FloatingLogin },
  { id: 'steps', name: 'Steps', note: 'Log in is one screen. Sign up is two short steps with a progress rail: who you are, then a password.', Component: StepsLogin },
  { id: 'editorial', name: 'Editorial', note: 'No card at all: a huge headline, numbered underline fields that draw in, and a round arrow to go.', Component: EditorialLogin },
  { id: 'phone', name: 'Phone sheet', note: 'The brand fills a phone screen and the form rises from the bottom like a sheet, pill switch on top.', Component: PhoneLogin },
];

// Five takes on the screen people see when they open Wallex. Each has both forms: Log in asks for an email and a
// password; Sign up asks for first name, last name, email, password and a confirmation. The forms check what you
// type, but nothing is sent anywhere yet. Submitting only shows a confirmation.
export default function LoginTab() {
  return (
    <div className="space-y-12 px-1 pb-10">
      <div className="px-3">
        <SectionTitle icon="padlock-key">Login and sign up</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">
          Five ways to greet someone opening Wallex. Switch between Log in and Sign up in each one and try submitting
          with fields empty or passwords that do not match. This is a preview: nothing is sent anywhere.
        </p>
      </div>
      {STYLES.map((style, i) => (
        <section key={style.id}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
            <span className="font-support text-xs tracking-widest text-muted">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-base font-semibold">{style.name}</h3>
            <p className="font-support text-sm text-muted">{style.note}</p>
          </div>
          <div className="px-3">
            <style.Component />
          </div>
        </section>
      ))}
    </div>
  );
}
