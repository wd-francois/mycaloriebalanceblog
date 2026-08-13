import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const STEPS = [
  ['Open any day on the calendar', 'Tap any date on the Home screen to open the day log.'],
  ['Choose what to log', 'Pick from Meal, Exercise, Sleep, or Measurements and fill in the details.'],
  ['Review your progress', 'Go to Insights to see charts for calories, nutrition, weight, and sleep over time.'],
  [
    'Not sure of your calorie needs?',
    'Use the Calorie Calculator to estimate your daily target from your BMR and activity level.',
    '/calorie-calculator/',
    'Open Calorie Calculator',
  ],
  ['Set your goals', 'Head to Settings → Profile & Goals to set your daily calorie, protein, and weight targets.'],
];

function WelcomeCard({ onNavigate }) {
  const markSeen = useMutation(api.userSettings.markWelcomeSeen);

  const openGuide = () => {
    markSeen();
    onNavigate?.('help');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
          <h2 className="text-white font-bold text-base">Welcome to My Calorie Balance Pro</h2>
          <p className="text-blue-100 text-xs mt-1">Here's how to get started</p>
        </div>

        {/* Steps */}
        <div className="p-5 flex flex-col gap-4">
          {STEPS.map(([title, desc, href, linkLabel], i) => (
            <div key={title} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                {href && (
                  <a
                    href={href}
                    className="inline-block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    {linkLabel} →
                  </a>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={() => markSeen()}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Let's go
            </button>
            <button
              onClick={openGuide}
              className="w-full py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              View the full Help &amp; Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Isolated so a query failure can't crash the home screen, and so we can tell
// "still loading" (undefined) apart from "no settings row yet" (null) — the
// latter means a brand-new account that hasn't dismissed the welcome card.
export default function ProWelcomeModal({ onNavigate }) {
  const settings = useQuery(api.userSettings.get);

  if (settings === undefined) return null;
  if (settings?.hasSeenWelcome) return null;

  return <WelcomeCard onNavigate={onNavigate} />;
}
