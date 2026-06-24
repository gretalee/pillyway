'use client';

import { useTranslations } from 'next-intl';
import { Tooltip } from '@/app/components/ui/tooltip';
import { cn } from '@/lib/utils';

const Countries = ({
  countries,
  className,
}: {
  countries: string[];
  className?: string;
}) => {
  const tCountries = useTranslations('countries');
  const tCodes = useTranslations('country_codes');

  const countriesString = countries.length
    ? countries.map((c) => tCodes(c)).join(' · ')
    : undefined;
  const countriesTooltip = countries.length
    ? countries.map((c) => tCountries(c)).join(', ')
    : undefined;

  const tooltipString = countriesTooltip
    ? `Verläuft durch: ${countriesTooltip}`
    : undefined;

  if (!countriesString) return null;
  if (!tooltipString) return null;

  return (
    <Tooltip content={tooltipString} aria-label={tooltipString} inline offset={10}>
      <span className={cn('text-base font-normal text-muted-foreground', className)}>
        {countriesString}
      </span>
    </Tooltip>
  );
};

export default Countries;
