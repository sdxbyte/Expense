import React, { useState, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { COUNTRIES, CountryOption, DEFAULT_COUNTRY } from '../data/countries';

interface CountryPhoneInputProps {
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  value,
  onChange,
  required = true,
  disabled = false,
  className = '',
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');

  // Parse initial value if passed
  useEffect(() => {
    if (!value) return;
    
    // Check if value starts with any known country dialCode
    const matched = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (matched) {
      setSelectedCountry(matched);
      // Strip dialCode from national number
      const local = value.slice(matched.dialCode.length).trim();
      setNationalNumber(local);
    } else {
      setNationalNumber(value);
    }
  }, []);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const country = COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
    setSelectedCountry(country);
    
    const formatted = `${country.dialCode} ${nationalNumber.trim()}`.trim();
    onChange(formatted);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow digits, spaces, hyphens, and parentheses
    setNationalNumber(rawVal);
    
    const formatted = `${selectedCountry.dialCode} ${rawVal.trim()}`.trim();
    onChange(formatted);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex rounded-xl overflow-hidden bg-slate-950 border border-slate-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
        {/* Country Selector Dropdown */}
        <div className="relative flex items-center bg-slate-900 border-r border-slate-800 hover:bg-slate-850 transition-colors shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200">
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-indigo-400 font-bold">{selectedCountry.dialCode}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none ml-0.5" />
          </div>

          <select
            value={selectedCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Select Country Code"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-slate-900 bg-white"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code} className="bg-slate-900 text-white py-1">
                {country.flag} {country.name} ({country.dialCode})
              </option>
            ))}
          </select>
        </div>

        {/* National Phone Input */}
        <input
          type="tel"
          required={required}
          disabled={disabled}
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={`e.g. ${selectedCountry.placeholder}`}
          className="w-full px-3.5 py-2 text-xs bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
        <span className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
          <span>Country: <strong className="text-slate-200">{selectedCountry.name}</strong></span>
        </span>
        <span>
          Selected Code: <strong className="text-indigo-300">{selectedCountry.dialCode}</strong>
        </span>
      </div>
    </div>
  );
};
