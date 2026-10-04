import PlumpIcon, { type PlumpName } from './PlumpIcon';

// A heading for a group of things, with its icon at the left, used across the pages so every group reads the same way.
export default function SectionTitle({
  icon,
  as: Tag = 'h2',
  className = 'text-lg font-semibold',
  iconClass = 'h-6 w-6',
  children,
}: {
  icon: PlumpName;
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag className={`flex items-center gap-3 ${className}`}>
      <PlumpIcon name={icon} className={`${iconClass} shrink-0 text-muted`} />
      {children}
    </Tag>
  );
}
