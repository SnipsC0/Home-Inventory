import { Fragment } from 'react';
import { Archive, ChevronRight, Home, Layers, Package } from 'lucide-react';
import SmartImage from './SmartImage';

export interface LocationLevel {
  name?: string | null;
  image?: string | null;
}

interface Props {
  room?: LocationLevel;
  cupboard?: LocationLevel;
  shelf?: LocationLevel;
  organizer?: LocationLevel;
  className?: string;
}

const LEVELS = [
  { key: 'room', Icon: Home },
  { key: 'cupboard', Icon: Archive },
  { key: 'shelf', Icon: Layers },
  { key: 'organizer', Icon: Package },
] as const;

/** Row of tiny thumbnails: room > cupboard > shelf > (organizer). */
export default function LocationPhotos({ className = '', ...levels }: Props) {
  const shown = LEVELS.filter(
    ({ key }) => key !== 'organizer' || levels.organizer?.name
  ).filter(({ key }) => levels[key]?.name || levels[key]?.image);

  if (shown.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {shown.map(({ key, Icon }, i) => {
        const level = levels[key]!;
        const name = level.name ?? '';
        const placeholder = (
          <Icon size={16} className="text-ha-text/40" aria-hidden />
        );
        return (
          <Fragment key={key}>
            {i > 0 && (
              <ChevronRight
                size={12}
                className="text-ha-text/40 flex-shrink-0"
                aria-hidden
              />
            )}
            {level.image ? (
              <SmartImage
                src={level.image}
                alt={name}
                width={96}
                wrapperClassName="w-10 h-10 rounded-md flex-shrink-0"
                fallback={placeholder}
              />
            ) : (
              <div
                title={name}
                className="w-10 h-10 rounded-md flex-shrink-0 bg-ha-secondary-bg flex items-center justify-center"
              >
                {placeholder}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
