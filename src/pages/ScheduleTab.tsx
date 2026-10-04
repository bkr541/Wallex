import SectionTitle from '../components/SectionTitle';

// The Schedule page. It has no content yet: this is the page the new nav item opens.
export default function ScheduleTab() {
  return (
    <div className="px-1 pb-10">
      <section className="space-y-2 px-3">
        <SectionTitle icon="calendar-check">Schedule</SectionTitle>
        <p className="font-support text-sm text-muted">Nothing here yet.</p>
      </section>
    </div>
  );
}
