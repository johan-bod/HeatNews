import { TOPICS, type Topic } from '@/data/keywords/taxonomy';

const TOPIC_ICONS: Partial<Record<Topic, string>> = {
  politics: '🏛',
  economy: '📈',
  technology: '💻',
  climate: '🌍',
  sports: '⚽',
  health: '🏥',
  education: '📚',
  culture: '🎭',
  crime: '🔒',
  energy: '⚡',
  transport: '🚄',
  housing: '🏠',
  agriculture: '🌾',
  defense: '🛡',
  immigration: '🌐',
  science: '🔬',
  entertainment: '🎬',
  finance: '💰',
  labor: '👷',
  environment: '🌱',
  diplomacy: '🤝',
  religion: '⛪',
  social: '👥',
  media: '📰',
  legal: '⚖️',
};

interface TopicPickerProps {
  selected: Topic[];
  onChange: (topics: Topic[]) => void;
  max?: number;
}

export default function TopicPicker({ selected, onChange, max = 10 }: TopicPickerProps) {
  const toggle = (topic: Topic) => {
    if (selected.includes(topic)) {
      onChange(selected.filter(t => t !== topic));
    } else if (selected.length < max) {
      onChange([...selected, topic]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-ivory-200/60">
          Pick topics you care about
        </p>
        <span className="font-body text-xs text-ivory-200/40">
          {selected.length}/{max}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {TOPICS.map(topic => {
          const isSelected = selected.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => toggle(topic)}
              className={`
                flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-center
                transition-all duration-200
                ${isSelected
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border-ivory-200/10 bg-navy-900/50 text-ivory-200/50 hover:border-ivory-200/30 hover:text-ivory-200/70'
                }
                ${!isSelected && selected.length >= max ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={!isSelected && selected.length >= max}
            >
              <span className="text-lg">{TOPIC_ICONS[topic] || '📄'}</span>
              <span className="font-body text-[11px] capitalize leading-tight">{topic}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
