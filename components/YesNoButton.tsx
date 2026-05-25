'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  getYesNoButtonStyle,
  type YesNoSide,
} from '@/lib/categories';

type YesNoButtonProps = {
  side: YesNoSide;
  children: ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function YesNoButtonGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex gap-2 w-full ${className}`.trim()}>{children}</div>
  );
}

export function YesNoButton({
  side,
  children,
  active = false,
  href,
  onClick,
  disabled = false,
  className = '',
}: YesNoButtonProps) {
  const style = getYesNoButtonStyle(side, active);
  const mergedClass = `hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={mergedClass} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={mergedClass}
      style={style}
    >
      {children}
    </button>
  );
}
