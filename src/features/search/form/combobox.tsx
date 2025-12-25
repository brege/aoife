import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import type { MediaSearchValues } from '../../../providers/types';
import type { SuggestionEntry } from './suggestions';

type ControlledComboboxProps = {
  name: keyof MediaSearchValues;
  label: string;
  placeholder: string;
  required?: boolean;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  suggestions: SuggestionEntry[];
  isLoading: boolean;
  dataTestId?: string;
  onSelect?: (value: string) => void;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
};

const ControlledCombobox = ({
  name,
  label,
  placeholder,
  required,
  layout,
  bandPlacement,
  suggestions,
  isLoading,
  dataTestId,
  onSelect,
  onInputChange,
  onSubmit,
}: ControlledComboboxProps) => {
  const { control } = useFormContext<MediaSearchValues>();
  const watchedValue = useWatch({ control, name });
  const { field } = useController({ control, name });
  const value = typeof watchedValue === 'string' ? watchedValue : '';
  const comboboxPlacementClass =
    layout === 'band' ? `band-${bandPlacement}` : 'stack';

  return (
    <Combobox
      value={value}
      onChange={(nextValue) => {
        const resolvedValue = nextValue ?? '';
        field.onChange(resolvedValue);
        onSelect?.(resolvedValue);
        onSubmit?.();
      }}
      as="div"
      className={`combobox ${comboboxPlacementClass}`.trim()}
    >
      <Combobox.Input
        type="text"
        value={value}
        onChange={(event) => {
          field.onChange(event);
          onInputChange?.(event.target.value);
        }}
        placeholder={placeholder}
        aria-label={label}
        className="form-input"
        required={required}
        data-testid={dataTestId}
      />
      {suggestions.length > 0 && (
        <Combobox.Options className="combobox-options">
          {suggestions.map((suggestion) => {
            return (
              <Combobox.Option
                key={suggestion.id}
                value={suggestion.value}
                className={({ active }) =>
                  `combobox-option${active ? ' active' : ''}`
                }
              >
                <span className="combobox-option-label">
                  {suggestion.label}
                </span>
              </Combobox.Option>
            );
          })}
        </Combobox.Options>
      )}
      {isLoading && suggestions.length === 0 && (
        <div className="combobox-loading">Searching...</div>
      )}
    </Combobox>
  );
};

export { ControlledCombobox };
