'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from './theme-provider';

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  description: string;
  Icon: typeof Sun;
}> = [
  { value: 'system', label: 'System', description: 'Use device setting', Icon: Monitor },
  { value: 'light', label: 'Light', description: 'Light interface', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Dark interface', Icon: Moon },
];
const DEFAULT_THEME_OPTION = THEME_OPTIONS[0]!;

interface ThemeToggleProps {
  /** Compact mode renders a button; icon-only compact mode cycles through themes. */
  compact?: boolean;
  /** Show the current theme label beside the compact icon. */
  showLabel?: boolean;
  /** Direction the compact popover opens from the trigger. */
  menuPlacement?: 'top' | 'bottom';
}

function themeLabel(theme: Theme): string {
  return THEME_OPTIONS.find((option) => option.value === theme)?.label ?? 'System';
}

function nextTheme(theme: Theme): Theme {
  const index = THEME_OPTIONS.findIndex((option) => option.value === theme);
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length]?.value ?? DEFAULT_THEME_OPTION.value;
}

export function ThemeToggle({
  compact = false,
  showLabel = false,
  menuPlacement = 'top',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = THEME_OPTIONS.find((option) => option.value === theme) ?? DEFAULT_THEME_OPTION;
  const SelectedIcon = selected.Icon;
  const upcomingTheme = nextTheme(theme);
  const resolvedLabel = resolvedTheme === 'dark' ? 'dark' : 'light';
  const usesPopover = compact && showLabel;

  useEffect(() => {
    if (!open || !usesPopover) return undefined;

    function handlePointerDown(event: PointerEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, usesPopover]);

  if (compact) {
    return (
      <div ref={popoverRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => {
            if (usesPopover) {
              setOpen((value) => !value);
              return;
            }
            setTheme(upcomingTheme);
          }}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${
            showLabel ? 'min-w-0' : 'size-9'
          }`}
          style={
            {
              color: 'var(--theme-toggle-color, var(--text-secondary))',
              '--tw-ring-color': 'var(--brand-primary)',
            } as CSSProperties
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-toggle-hover-bg, var(--bg-hover))';
            e.currentTarget.style.color = 'var(--theme-toggle-hover-color, var(--text-primary))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--theme-toggle-color, var(--text-secondary))';
          }}
          title={
            usesPopover
              ? `Theme: ${themeLabel(theme)} (${resolvedLabel})`
              : `Theme: ${themeLabel(theme)} (${resolvedLabel}). Switch to ${themeLabel(upcomingTheme)}.`
          }
          aria-label={
            usesPopover
              ? `Theme: ${themeLabel(theme)}. Current resolved theme is ${resolvedLabel}.`
              : `Theme: ${themeLabel(theme)}. Current resolved theme is ${resolvedLabel}. Switch to ${themeLabel(upcomingTheme)}.`
          }
          aria-haspopup={usesPopover ? 'menu' : undefined}
          aria-expanded={usesPopover ? open : undefined}
        >
          <SelectedIcon
            className="size-4 shrink-0 transition-transform duration-150"
            aria-hidden="true"
          />
          {showLabel && <span className="truncate">{themeLabel(theme)}</span>}
        </button>

        {usesPopover && open && (
          <div
            role="menu"
            aria-label="Choose theme"
            className={`absolute right-0 z-50 w-48 rounded-lg border p-1 shadow-lg ${
              menuPlacement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
            }`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {THEME_OPTIONS.map((option) => {
              const active = theme === option.value;
              const Icon = option.Icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2"
                  style={
                    {
                      backgroundColor: active ? 'var(--bg-tertiary)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      '--tw-ring-color': 'var(--brand-primary)',
                    } as CSSProperties
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = active
                      ? 'var(--bg-tertiary)'
                      : 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = active
                      ? 'var(--bg-tertiary)'
                      : 'transparent';
                    e.currentTarget.style.color = active
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)';
                  }}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                      {option.description}
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg p-1"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
      role="radiogroup"
      aria-label={`Theme. Current resolved theme is ${resolvedLabel}.`}
    >
      {THEME_OPTIONS.map((option) => {
        const active = theme === option.value;
        const Icon = option.Icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2"
            style={
              {
                backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
                '--tw-ring-color': 'var(--brand-primary)',
              } as CSSProperties
            }
            aria-label={`${option.label} theme`}
            aria-pressed={active}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden capitalize sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
