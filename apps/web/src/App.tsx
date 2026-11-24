import { useState } from 'react';
import { useSubscription } from '@trpc/tanstack-react-query';
import type { Specialty } from '@hotline/shared';
import { useTRPC } from './trpc';

// Scaffold only: proves the realtime path end to end in a browser.
// Real copy, layout and booking flow come with the design step.

// TODO(design): emergency number depends on the clinic's country; move to settings.
const EMERGENCY_NUMBER = '112';

const SITUATIONS: { specialty: Specialty; label: string }[] = [
  { specialty: 'trauma', label: 'Injury' },
  { specialty: 'pediatrics', label: 'Sick child' },
  { specialty: 'gp', label: 'Feeling unwell' },
];

export function App() {
  const [specialty, setSpecialty] = useState<Specialty>('gp');

  return (
    <main>
      <p role="alert" className="emergency">
        Severe bleeding, chest pain or trouble breathing? Call{' '}
        <a href={`tel:${EMERGENCY_NUMBER}`}>{EMERGENCY_NUMBER}</a> now.
      </p>
      <h1>Hotline Clinic</h1>
      <div className="situations">
        {SITUATIONS.map((s) => (
          <button
            key={s.specialty}
            aria-pressed={s.specialty === specialty}
            onClick={() => setSpecialty(s.specialty)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <LiveFeed specialty={specialty} />
    </main>
  );
}

function LiveFeed({ specialty }: { specialty: Specialty }) {
  const trpc = useTRPC();
  const [log, setLog] = useState<string[]>([]);
  const sub = useSubscription(
    trpc.availability.onChange.subscriptionOptions(
      { specialty },
      { onData: (e) => setLog((l) => [JSON.stringify(e), ...l].slice(0, 10)) },
    ),
  );

  return (
    <section>
      <p className={`status status-${sub.status}`}>
        {sub.status === 'pending' ? 'Live' : sub.status === 'error' ? 'Offline' : 'Reconnecting…'}
      </p>
      <ul className="log">
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
