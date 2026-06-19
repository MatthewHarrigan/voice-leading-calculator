// Interactive study chapters. Chapter 1 reproduces the original drop-2 inversion
// assignment exactly (34 groups / 180 cards). Chapters 2-6 continue the
// Willmott-style curriculum (section order follows Mel Bay 95112; the drill
// packaging is an engine-buildable extrapolation):
//   2  Voice-leading the inversions (top-voice ladder, two string-set b9 check)
//   3  Tensions on top: 9ths and altered 9ths
//   4  Voice-leading chord scales (ii-V-I with a fixed lead)
//   5  Subs, diminished tension and symmetry
//   6  Song examples and reharmonization

import { CHORD_TYPES, CORE_CHORD_TYPE_IDS, chordSymbol, type ChordTypeId } from '@/music/chords';
import { inversionName, type Inversion } from '@/music/voicing';

export interface ChapterCardSpec {
  root: string;
  chordType: ChordTypeId;
  inversion: Inversion;
  caption: string;
  leadNote?: string;
}

export interface ChapterGroup {
  title: string;
  note?: string;
  cards: ChapterCardSpec[];
}

export interface ChapterSection {
  id: string;
  title: string;
  note: string;
  groups: ChapterGroup[];
}

export interface ChapterStudyChart {
  presetId: string;
  label: string;
  note: string;
  optimize?: boolean;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  concept: string;
  sections: ChapterSection[];
  studyCharts?: ChapterStudyChart[];
}

// ---------- Chapter 1 ----------

const formula = (t: ChordTypeId) => CHORD_TYPES[t].formula;
const cSource = (t: ChordTypeId) => chordSymbol('C', t);

const chapter1: Chapter = {
  id: 'inversions',
  number: 1,
  title: 'Drop 2 Inversions',
  concept:
    'Learn every four-part chord type as a drop 2 voicing and memorise all four inversions. These drills deliberately include the b9 "avoid" voicings so you see and hear the full shape of each chord.',
  sections: [
    {
      id: 'approach-1',
      title: 'Approach 1',
      note: 'All 15 core chord types: root inversion in D, 1st inversion in C, 2nd inversion in B♭, and 3rd inversion in G.',
      groups: [
        { root: 'D', inversion: 0 as Inversion, label: 'D — Root inversion' },
        { root: 'C', inversion: 1 as Inversion, label: 'C — 1st inversion' },
        { root: 'Bb', inversion: 2 as Inversion, label: 'B♭ — 2nd inversion' },
        { root: 'G', inversion: 3 as Inversion, label: 'G — 3rd inversion' },
      ].map((g) => ({
        title: g.label,
        cards: CORE_CHORD_TYPE_IDS.map((t) => ({
          root: g.root,
          chordType: t,
          inversion: g.inversion,
          caption: `${cSource(t)}: ${formula(t)}`,
        })),
      })),
    },
    {
      id: 'approach-2',
      title: 'Approach 2',
      note: 'In F: play all four inversions of one chord type, then move to the next.',
      groups: CORE_CHORD_TYPE_IDS.map((t) => ({
        title: `F${CHORD_TYPES[t].symbol} — ${formula(t)}`,
        cards: ([0, 1, 2, 3] as Inversion[]).map((inv) => ({
          root: 'F',
          chordType: t,
          inversion: inv,
          caption: inversionName(inv),
        })),
      })),
    },
    {
      id: 'approach-3',
      title: 'Approach 3',
      note: 'A symmetrical voice-led drill for each chord type: C 1st inversion, A 2nd inversion, G♭ 3rd inversion, E♭ root inversion.',
      groups: CORE_CHORD_TYPE_IDS.map((t) => ({
        title: `${cSource(t)} symmetrical pattern`,
        cards: [
          { root: 'C', inversion: 1 as Inversion },
          { root: 'A', inversion: 2 as Inversion },
          { root: 'Gb', inversion: 3 as Inversion },
          { root: 'Eb', inversion: 0 as Inversion },
        ].map((step) => ({
          root: step.root,
          chordType: t,
          inversion: step.inversion,
          caption: `${step.root} ${inversionName(step.inversion)}`,
        })),
      })),
    },
  ],
};

// ---------- Chapter 2 ----------

const ladderTypes: ChordTypeId[] = ['maj7', 'dom7', 'min7', 'min7b5', 'dom7b9'];

const chapter2: Chapter = {
  id: 'voice-leading-inversions',
  number: 2,
  title: 'Voice-Leading the Inversions',
  concept:
    'Chapter 1 taught the shapes; now connect them. As you climb the inversions the top voice walks the chord (root → 3 → 5 → 7). Toggle Middle vs Upper string sets and watch the b9 flags — the same chord can be clean on one set and muddy on the other.',
  sections: [
    {
      id: 'top-voice-ladder',
      title: 'Top-voice ladder',
      note: 'Each chord type through all four inversions in C. The chord-tone label under the top string is your guide note.',
      groups: ladderTypes.map((t) => ({
        title: `C${CHORD_TYPES[t].symbol}`,
        cards: ([0, 1, 2, 3] as Inversion[]).map((inv) => ({
          root: 'C',
          chordType: t,
          inversion: inv,
          caption: inversionName(inv),
        })),
      })),
    },
  ],
};

// ---------- Chapter 3 ----------

const chapter3: Chapter = {
  id: 'tensions-on-top',
  number: 3,
  title: 'Tensions on Top — 9ths & Altered 9ths',
  concept:
    'Ninth chords are incomplete structures: the 9 replaces the root so the colour tone can sing on top. Hear a plain 7th become a 9th, then explore the altered dominants (♭9, ♯9) that drive minor cadences.',
  sections: [
    {
      id: 'seventh-to-ninth',
      title: '7th → 9th',
      note: 'Add the 9 on top of each quality. The 9 substitutes the root, lifting the colour tone to the melody.',
      groups: [
        {
          title: 'Major',
          cards: [
            { root: 'C', chordType: 'maj7' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cmaj7' },
            { root: 'C', chordType: 'maj9' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cmaj9 (9 on top)', leadNote: 'D' },
          ],
        },
        {
          title: 'Dominant',
          cards: [
            { root: 'C', chordType: 'dom7' as ChordTypeId, inversion: 0 as Inversion, caption: 'C7' },
            { root: 'C', chordType: 'dom9' as ChordTypeId, inversion: 0 as Inversion, caption: 'C9 (9 on top)', leadNote: 'D' },
          ],
        },
        {
          title: 'Minor',
          cards: [
            { root: 'C', chordType: 'min7' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cm7' },
            { root: 'C', chordType: 'min9' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cm9 (9 on top)', leadNote: 'D' },
          ],
        },
      ],
    },
    {
      id: 'altered-dominants',
      title: 'Altered dominants on G',
      note: 'The same G7 family with different ninths on top — natural 9, ♭9, then ♯9.',
      groups: [
        {
          title: 'G dominant family',
          cards: [
            { root: 'G', chordType: 'dom9' as ChordTypeId, inversion: 0 as Inversion, caption: 'G9', leadNote: 'A' },
            { root: 'G', chordType: 'dom7b9' as ChordTypeId, inversion: 0 as Inversion, caption: 'G7♭9', leadNote: 'Ab' },
            { root: 'G', chordType: 'dom7s9' as ChordTypeId, inversion: 0 as Inversion, caption: 'G7♯9', leadNote: 'Bb' },
          ],
        },
      ],
    },
  ],
  studyCharts: [
    {
      presetId: 'willmott-9ths-lead-study',
      label: 'Willmott 9ths Lead Study',
      note: 'A descending line of ninth and altered-ninth chords. Load it and optimise to keep the tension singing on top.',
      optimize: true,
    },
  ],
};

// ---------- Chapter 4 ----------

const chapter4: Chapter = {
  id: 'voice-leading-chord-scales',
  number: 4,
  title: 'Voice-Leading Chord Scales — ii-V-I',
  concept:
    'Fix a top line and let the chords change function beneath it. This is the heart of comping: the melody stays smooth while ii, V and I take turns supporting it.',
  sections: [
    {
      id: 'major-iivi-9ths',
      title: 'Major ii-V-I in 9ths',
      note: 'D-9 → G9 → Cmaj9 → C6/9, each with its colour tone on top.',
      groups: [
        {
          title: 'C major',
          cards: [
            { root: 'D', chordType: 'min9' as ChordTypeId, inversion: 0 as Inversion, caption: 'Dm9', leadNote: 'E' },
            { root: 'G', chordType: 'dom9' as ChordTypeId, inversion: 0 as Inversion, caption: 'G9', leadNote: 'A' },
            { root: 'C', chordType: 'maj9' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cmaj9', leadNote: 'D' },
            { root: 'C', chordType: 'maj69' as ChordTypeId, inversion: 0 as Inversion, caption: 'C6/9', leadNote: 'D' },
          ],
        },
      ],
    },
    {
      id: 'minor-iivi-tension',
      title: 'Minor ii-V-i with tension',
      note: 'Dm7♭5 → G7♭9 → Cm9 → Cm6/9 — the altered dominant pulls hard into the minor tonic.',
      groups: [
        {
          title: 'C minor',
          cards: [
            { root: 'D', chordType: 'min7b5' as ChordTypeId, inversion: 0 as Inversion, caption: 'Dm7♭5', leadNote: 'F' },
            { root: 'G', chordType: 'dom7b9' as ChordTypeId, inversion: 0 as Inversion, caption: 'G7♭9', leadNote: 'Db' },
            { root: 'C', chordType: 'min9' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cm9', leadNote: 'D' },
            { root: 'C', chordType: 'min69' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cm6/9', leadNote: 'D' },
          ],
        },
      ],
    },
  ],
  studyCharts: [
    {
      presetId: 'major-ii-v-i-9ths',
      label: 'Major ii-V-I 9ths',
      note: 'Load and optimise to see the smoothest path through the changes.',
      optimize: true,
    },
    {
      presetId: 'minor-ii-v-i',
      label: 'Minor ii-V-i',
      note: 'Compare the plain minor cadence with the 9ths version above.',
      optimize: true,
    },
  ],
};

// ---------- Chapter 5 ----------

const chapter5: Chapter = {
  id: 'subs-symmetry',
  number: 5,
  title: 'Subs, Diminished Tension & Symmetry',
  concept:
    'One shape, many roles. The tritone sub swaps a dominant for the one a tritone away; diminished sevenths repeat every minor third; and a half-diminished chord is just a minor 6th read from a different root.',
  sections: [
    {
      id: 'tritone-sub',
      title: 'Tritone substitution',
      note: 'G9 and D♭9 share the same guide tones and both resolve to Cmaj9.',
      groups: [
        {
          title: 'V and its tritone sub → I',
          cards: [
            { root: 'G', chordType: 'dom9' as ChordTypeId, inversion: 0 as Inversion, caption: 'G9 (V)', leadNote: 'A' },
            { root: 'Db', chordType: 'dom9' as ChordTypeId, inversion: 0 as Inversion, caption: 'D♭9 (subV)', leadNote: 'Eb' },
            { root: 'C', chordType: 'maj9' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cmaj9 (I)', leadNote: 'D' },
          ],
        },
      ],
    },
    {
      id: 'dim-symmetry',
      title: 'Diminished symmetry',
      note: 'The same diminished 7th shape repeats every minor third — C°7 = E♭°7 = G♭°7 = A°7.',
      groups: [
        {
          title: 'One diminished chord, four names',
          cards: [
            { root: 'C', chordType: 'dim7' as ChordTypeId, inversion: 0 as Inversion, caption: 'C°7' },
            { root: 'Eb', chordType: 'dim7' as ChordTypeId, inversion: 0 as Inversion, caption: 'E♭°7' },
            { root: 'Gb', chordType: 'dim7' as ChordTypeId, inversion: 0 as Inversion, caption: 'G♭°7' },
            { root: 'A', chordType: 'dim7' as ChordTypeId, inversion: 0 as Inversion, caption: 'A°7' },
          ],
        },
      ],
    },
    {
      id: 'halfdim-equals-m6',
      title: 'Half-diminished = minor 6th',
      note: 'A m7♭5 is the same four notes as a minor 6th built a minor third higher — Am7♭5 = Cm6.',
      groups: [
        {
          title: 'Two readings of one voicing',
          cards: [
            { root: 'A', chordType: 'min7b5' as ChordTypeId, inversion: 0 as Inversion, caption: 'Am7♭5' },
            { root: 'C', chordType: 'min6' as ChordTypeId, inversion: 0 as Inversion, caption: 'Cm6' },
          ],
        },
      ],
    },
  ],
};

// ---------- Chapter 6 ----------

const chapter6: Chapter = {
  id: 'song-examples',
  number: 6,
  title: 'Song Examples & Reharmonization',
  concept:
    'Put it together on real changes. Voice full forms with a guide-tone melody, then reharmonize using the ninths, subs and diminished tools from Chapters 3-5. Load each chart into the Sequence Builder and optimise.',
  sections: [],
  studyCharts: [
    {
      presetId: 'days-style-lead-note-study',
      label: 'Days-Style Lead Note Study',
      note: 'A 32-bar etude with a written top voice in every bar — the canonical guide-line workout.',
      optimize: true,
    },
    {
      presetId: 'blues-for-alice',
      label: 'Blues for Alice',
      note: 'A bird blues full of ii-Vs. Try reharmonizing bars with ninths and a passing diminished.',
      optimize: true,
    },
    {
      presetId: 'autumn-leaves-study',
      label: 'Autumn Leaves Study',
      note: 'Voice the changes in 7ths, then upgrade to 9ths and optimise the voice leading.',
      optimize: true,
    },
  ],
};

export const CHAPTERS: Chapter[] = [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6];

export function getChapter(id: string | undefined): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}
