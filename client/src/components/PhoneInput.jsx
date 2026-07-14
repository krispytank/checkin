import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils.js';

const EA_COUNTRIES = [
  { code: 'KE', name: 'Kenya', dial: '+254', maxDigits: 9 },
  { code: 'UG', name: 'Uganda', dial: '+256', maxDigits: 9 },
  { code: 'TZ', name: 'Tanzania', dial: '+255', maxDigits: 9 },
  { code: 'RW', name: 'Rwanda', dial: '+250', maxDigits: 9 },
  { code: 'BI', name: 'Burundi', dial: '+257', maxDigits: 8 },
  { code: 'SS', name: 'South Sudan', dial: '+211', maxDigits: 9 },
  { code: 'CD', name: 'DR Congo', dial: '+243', maxDigits: 9 },
];

export default function PhoneInput({ value, onChange, placeholder = '712 345 678', className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const parseValue = (val) => {
    if (!val) return { dial: '+254', local: '' };
    const country = EA_COUNTRIES.find(c => val.startsWith(c.dial));
    if (country) {
      return { dial: country.dial, local: val.slice(country.dial.length) };
    }
    return { dial: '+254', local: val.replace(/^\+?\d{0,3}/, '') };
  };

  const { dial, local } = parseValue(value);
  const selectedCountry = EA_COUNTRIES.find(c => c.dial === dial) || EA_COUNTRIES[0];
  const maxLen = selectedCountry.maxDigits;

  const filteredCountries = EA_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  const handleLocalChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    if (raw.length > maxLen) raw = raw.slice(0, maxLen);
    onChange(`${dial}${raw}`);
  };

  const handleCountrySelect = (country) => {
    let raw = local.replace(/\D/g, '').replace(/^0+/, '');
    if (raw.length > country.maxDigits) raw = raw.slice(0, country.maxDigits);
    onChange(`${country.dial}${raw}`);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative flex ${className}`}>
      {/* Country selector */}
      <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 rounded-l-lg border border-r-0 bg-muted/50 px-2 py-2 text-sm',
              'hover:bg-muted transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
            )}
          >
            <span className="text-xs font-medium">{selectedCountry.code}</span>
            <span className="text-xs text-muted-foreground">{selectedCountry.dial}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            className="z-50 w-56 rounded-xl border border-border/50 bg-card p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="p-2 border-b border-border/50">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredCountries.map(country => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                    'hover:bg-accent focus:bg-accent focus:outline-none',
                    country.code === selectedCountry.code && 'bg-primary/10'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-xs">{country.code}</span>
                    <span>{country.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{country.dial}</span>
                    {country.code === selectedCountry.code && <Check className="h-3 w-3 text-primary" />}
                  </span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">No countries found</p>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Phone number input */}
      <div className="relative flex-1">
        <input
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={handleLocalChange}
          placeholder={placeholder}
          maxLength={maxLen}
          className="w-full rounded-r-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}
