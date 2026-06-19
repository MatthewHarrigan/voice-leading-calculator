import { CHORD_CATEGORIES, CHORD_TYPES, type ChordTypeId } from '@/music/chords';
import { ENHARMONIC_CHOICES } from '@/music/notes';

interface NoteSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Use the sharp spelling as the option value (default) for engine calls. */
  id?: string;
  includeBlank?: boolean;
  blankLabel?: string;
  'aria-label'?: string;
}

export function NoteSelect({
  value,
  onChange,
  id,
  includeBlank,
  blankLabel = '—',
  'aria-label': ariaLabel,
}: NoteSelectProps) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
      {includeBlank && <option value="">{blankLabel}</option>}
      {ENHARMONIC_CHOICES.map((choice) => (
        <option key={choice.pc} value={choice.spellings[0]}>
          {choice.display}
        </option>
      ))}
    </select>
  );
}

interface ChordTypeSelectProps {
  value: ChordTypeId;
  onChange: (value: ChordTypeId) => void;
  id?: string;
  'aria-label'?: string;
}

export function ChordTypeSelect({ value, onChange, id, 'aria-label': ariaLabel }: ChordTypeSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as ChordTypeId)}
      aria-label={ariaLabel}
    >
      {CHORD_CATEGORIES.map((category) => (
        <optgroup key={category.category} label={category.label}>
          {category.types.map((id) => (
            <option key={id} value={id}>
              {CHORD_TYPES[id].name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
