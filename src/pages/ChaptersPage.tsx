import { useMemo } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { CHAPTERS, getChapter, type ChapterCardSpec } from '@/data/chapters';
import { SONG_PRESETS } from '@/data/presets';
import { generateChordVoicing } from '@/music/voicing';
import { useStore } from '@/state/store';
import { PlayableDiagram } from '@/components/PlayableDiagram';

export function ChaptersPage() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const stringSet = useStore((s) => s.stringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const loadSong = useStore((s) => s.loadSong);

  const chapter = useMemo(() => getChapter(chapterId), [chapterId]);

  const openChart = (presetId: string) => {
    const preset = SONG_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    loadSong(preset);
    navigate('/sequence');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Harmony Studies</h1>
        <p>
          A progressive drop 2 curriculum in the spirit of Bret Willmott&rsquo;s harmony method —
          from raw inversions to reharmonized standards. Toggle string sets and Avoid b9 to compare
          voicings as you work.
        </p>
      </div>

      <nav className="chapter-toc" aria-label="Chapters">
        {CHAPTERS.map((c) => (
          <NavLink
            key={c.id}
            to={`/chapters/${c.id}`}
            className={({ isActive }) =>
              `btn btn-sm${isActive || (!chapterId && c.number === 1) ? ' btn-primary' : ''}`
            }
          >
            {c.number}. {c.title}
          </NavLink>
        ))}
      </nav>

      <section className="progression" style={{ marginBottom: 28 }}>
        <h2 style={{ marginTop: 0 }}>
          Chapter {chapter.number}: {chapter.title}
        </h2>
        <p className="muted" style={{ margin: 0, maxWidth: '74ch' }}>
          {chapter.concept}
        </p>
      </section>

      {chapter.studyCharts && chapter.studyCharts.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <h2 className="section-title">Study charts</h2>
          <div className="row" style={{ gap: 14, alignItems: 'stretch' }}>
            {chapter.studyCharts.map((chart) => (
              <div key={chart.presetId} className="progression" style={{ flex: '1 1 280px', margin: 0 }}>
                <h3 style={{ marginTop: 0 }}>{chart.label}</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  {chart.note}
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => openChart(chart.presetId)}>
                  Open in Sequence Builder →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {chapter.sections.map((section) => (
        <section key={section.id} className="assignment-section">
          <h2 className="section-title">{section.title}</h2>
          <p className="section-note">{section.note}</p>
          {section.groups.map((group, gi) => (
            <div key={gi} className="assignment-group">
              <h3>{group.title}</h3>
              {group.note && <p className="muted" style={{ fontSize: 13 }}>{group.note}</p>}
              <div className="assignment-grid">
                {group.cards.map((card, ci) => (
                  <ChapterCard key={ci} card={card} stringSet={stringSet} highlightAvoid={avoidB9} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function ChapterCard({
  card,
  stringSet,
  highlightAvoid,
}: {
  card: ChapterCardSpec;
  stringSet: 'middle' | 'upper';
  highlightAvoid: boolean;
}) {
  const voicing = generateChordVoicing(card.root, card.chordType, card.inversion, stringSet);
  if (!voicing) {
    return (
      <div className="chord-card missing" aria-disabled>
        <div className="card-caption">{card.caption}</div>
        <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
          No voicing on this set
        </div>
      </div>
    );
  }
  return (
    <PlayableDiagram
      chord={{
        fingering: voicing,
        rootDisplay: card.root,
        chordType: card.chordType,
        symbol: voicing.symbol,
        inversion: voicing.inversion,
        stringSet,
        leadNote: card.leadNote ?? null,
        targetTopNote: card.leadNote ?? null,
      }}
      caption={card.caption}
      highlightAvoid={highlightAvoid}
    />
  );
}
