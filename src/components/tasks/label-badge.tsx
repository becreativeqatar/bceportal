'use client';

interface LabelBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'default';
}

export function LabelBadge({ name, color, size = 'default' }: LabelBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {name}
    </span>
  );
}
