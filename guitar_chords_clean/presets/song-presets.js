// Song presets use a lead-sheet style structure: sections contain bars, bars
// contain chord events placed by beat. Durations are measured in beats.
window.SONG_PRESETS = [
    {
        id: 'major-ii-v-i',
        title: 'Major ii-V-I',
        key: 'C',
        timeSignature: [4, 4],
        sections: [
            {
                id: 'main',
                name: 'Main',
                bars: [
                    { id: 'b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'D', chordType: 'min7' }] },
                    { id: 'b2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'dom7' }] },
                    { id: 'b3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'maj7' }] },
                    { id: 'b4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'maj6' }] }
                ]
            }
        ]
    },
    {
        id: 'minor-ii-v-i',
        title: 'Minor ii-V-i',
        key: 'C minor',
        timeSignature: [4, 4],
        sections: [
            {
                id: 'main',
                name: 'Main',
                bars: [
                    { id: 'b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'D', chordType: 'min7b5' }] },
                    { id: 'b2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'dom7b5' }] },
                    { id: 'b3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'min7' }] },
                    { id: 'b4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'min6' }] }
                ]
            }
        ]
    },
    {
        id: 'jazz-blues-f',
        title: 'Jazz Blues in F',
        key: 'F',
        timeSignature: [4, 4],
        sections: [
            {
                id: 'chorus',
                name: 'Chorus',
                bars: [
                    { id: 'b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'dom7' }] },
                    { id: 'b2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Bb', chordType: 'dom7' }] },
                    { id: 'b3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'dom7' }] },
                    { id: 'b4', beats: 4, chords: [{ beat: 1, duration: 2, root: 'C', chordType: 'min7' }, { beat: 3, duration: 2, root: 'F', chordType: 'dom7' }] },
                    { id: 'b5', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Bb', chordType: 'dom7' }] },
                    { id: 'b6', beats: 4, chords: [{ beat: 1, duration: 4, root: 'B', chordType: 'dim7' }] },
                    { id: 'b7', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'dom7' }] },
                    { id: 'b8', beats: 4, chords: [{ beat: 1, duration: 2, root: 'A', chordType: 'min7' }, { beat: 3, duration: 2, root: 'D', chordType: 'dom7' }] },
                    { id: 'b9', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'min7' }] },
                    { id: 'b10', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'dom7' }] },
                    { id: 'b11', beats: 4, chords: [{ beat: 1, duration: 2, root: 'F', chordType: 'dom7' }, { beat: 3, duration: 2, root: 'D', chordType: 'dom7' }] },
                    { id: 'b12', beats: 4, chords: [{ beat: 1, duration: 2, root: 'G', chordType: 'min7' }, { beat: 3, duration: 2, root: 'C', chordType: 'dom7' }] }
                ]
            }
        ]
    },
    {
        id: 'autumn-leaves-study',
        title: 'Autumn Leaves Study',
        key: 'G minor',
        timeSignature: [4, 4],
        sections: [
            {
                id: 'a',
                name: 'A',
                bars: [
                    { id: 'a1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'A', chordType: 'min7b5' }] },
                    { id: 'a2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'D', chordType: 'dom7' }] },
                    { id: 'a3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'min7' }] },
                    { id: 'a4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'dom7' }] },
                    { id: 'a5', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'maj7' }] },
                    { id: 'a6', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Bb', chordType: 'maj7' }] },
                    { id: 'a7', beats: 4, chords: [{ beat: 1, duration: 4, root: 'E', chordType: 'min7b5' }] },
                    { id: 'a8', beats: 4, chords: [{ beat: 1, duration: 4, root: 'A', chordType: 'dom7' }] }
                ]
            }
        ]
    },
    {
        id: 'rhythm-changes-a',
        title: 'Rhythm Changes A Section',
        key: 'Bb',
        timeSignature: [4, 4],
        sections: [
            {
                id: 'a',
                name: 'A',
                bars: [
                    { id: 'a1', beats: 4, chords: [{ beat: 1, duration: 2, root: 'Bb', chordType: 'maj7' }, { beat: 3, duration: 2, root: 'G', chordType: 'dom7' }] },
                    { id: 'a2', beats: 4, chords: [{ beat: 1, duration: 2, root: 'C', chordType: 'min7' }, { beat: 3, duration: 2, root: 'F', chordType: 'dom7' }] },
                    { id: 'a3', beats: 4, chords: [{ beat: 1, duration: 2, root: 'D', chordType: 'min7' }, { beat: 3, duration: 2, root: 'G', chordType: 'dom7' }] },
                    { id: 'a4', beats: 4, chords: [{ beat: 1, duration: 2, root: 'C', chordType: 'min7' }, { beat: 3, duration: 2, root: 'F', chordType: 'dom7' }] },
                    { id: 'a5', beats: 4, chords: [{ beat: 1, duration: 2, root: 'Bb', chordType: 'dom7' }, { beat: 3, duration: 2, root: 'Bb', chordType: 'dom7' }] },
                    { id: 'a6', beats: 4, chords: [{ beat: 1, duration: 2, root: 'Eb', chordType: 'maj7' }, { beat: 3, duration: 2, root: 'E', chordType: 'dim7' }] },
                    { id: 'a7', beats: 4, chords: [{ beat: 1, duration: 2, root: 'Bb', chordType: 'maj7' }, { beat: 3, duration: 2, root: 'G', chordType: 'dom7' }] },
                    { id: 'a8', beats: 4, chords: [{ beat: 1, duration: 2, root: 'C', chordType: 'min7' }, { beat: 3, duration: 2, root: 'F', chordType: 'dom7' }] }
                ]
            }
        ]
    },
    {
        id: 'all-the-things-study',
        title: 'All The Things Study',
        key: 'Ab',
        timeSignature: [4, 4],
        sections: [
            {
                id: 'a1',
                name: 'A1',
                bars: [
                    { id: 'a1b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'min7' }] },
                    { id: 'a1b2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Bb', chordType: 'min7' }] },
                    { id: 'a1b3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Eb', chordType: 'dom7' }] },
                    { id: 'a1b4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Ab', chordType: 'maj7' }] },
                    { id: 'a1b5', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Db', chordType: 'maj7' }] },
                    { id: 'a1b6', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'dom7' }] },
                    { id: 'a1b7', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'maj7' }] },
                    { id: 'a1b8', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'maj7' }] }
                ]
            },
            {
                id: 'a2',
                name: 'A2',
                bars: [
                    { id: 'a2b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'min7' }] },
                    { id: 'a2b2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'min7' }] },
                    { id: 'a2b3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Bb', chordType: 'dom7' }] },
                    { id: 'a2b4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Eb', chordType: 'maj7' }] },
                    { id: 'a2b5', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Ab', chordType: 'maj7' }] },
                    { id: 'a2b6', beats: 4, chords: [{ beat: 1, duration: 4, root: 'D', chordType: 'dom7' }] },
                    { id: 'a2b7', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'maj7' }] },
                    { id: 'a2b8', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'maj7' }] }
                ]
            },
            {
                id: 'bridge',
                name: 'Bridge',
                bars: [
                    { id: 'bb1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'A', chordType: 'min7' }] },
                    { id: 'bb2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'D', chordType: 'dom7' }] },
                    { id: 'bb3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'maj7' }] },
                    { id: 'bb4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'G', chordType: 'maj7' }] },
                    { id: 'bb5', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F#', chordType: 'min7' }] },
                    { id: 'bb6', beats: 4, chords: [{ beat: 1, duration: 4, root: 'B', chordType: 'dom7' }] },
                    { id: 'bb7', beats: 4, chords: [{ beat: 1, duration: 4, root: 'E', chordType: 'maj7' }] },
                    { id: 'bb8', beats: 4, chords: [{ beat: 1, duration: 4, root: 'E', chordType: 'maj7' }] }
                ]
            },
            {
                id: 'a3',
                name: 'A3',
                bars: [
                    { id: 'a3b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'F', chordType: 'min7' }] },
                    { id: 'a3b2', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Bb', chordType: 'min7' }] },
                    { id: 'a3b3', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Eb', chordType: 'dom7' }] },
                    { id: 'a3b4', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Ab', chordType: 'maj7' }] },
                    { id: 'a3b5', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Db', chordType: 'maj7' }] },
                    { id: 'a3b6', beats: 4, chords: [{ beat: 1, duration: 4, root: 'Db', chordType: 'min7' }] },
                    { id: 'a3b7', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'min7' }] },
                    { id: 'a3b8', beats: 4, chords: [{ beat: 1, duration: 4, root: 'B', chordType: 'dim7' }] }
                ]
            }
        ]
    }
];
