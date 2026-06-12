import { useState } from 'react';

// ── Accordion section ──────────────────────────────────────────────────────────
function Section({ emoji, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-xl shrink-0">{emoji}</span>
        <span className="flex-1 text-sm font-bold text-gray-900 dark:text-white">{title}</span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── FAQ item ───────────────────────────────────────────────────────────────────
function Q({ q, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 pb-3">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-2 text-left py-1">
        <svg className={`w-4 h-4 mt-0.5 shrink-0 text-blue-500 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{q}</span>
      </button>
      {open && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1.5 ml-6">{children}</p>}
    </div>
  );
}

// ── Feature pill ───────────────────────────────────────────────────────────────
function Pill({ color, children }) {
  const colors = {
    blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    teal:   'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${colors[color] ?? colors.blue}`}>
      {children}
    </span>
  );
}

// ── Step ───────────────────────────────────────────────────────────────────────
function Step({ n, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
        {children && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{children}</p>}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ProHelp({ onBack }) {
  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Help &amp; Guide</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Everything you need to know about My Calorie Balance Pro</p>
          </div>
        </div>

        {/* About */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-base font-bold mb-1">My Calorie Balance Pro</p>
          <p className="text-sm text-blue-100 leading-relaxed">
            A complete health tracking platform — log meals, workouts, sleep, and body measurements.
            Connect with a coach who can build custom programs, monitor your progress, and send feedback.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Nutrition', 'Exercise', 'Sleep', 'Measurements', 'Photos', 'Coaching'].map(t => (
              <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20">{t}</span>
            ))}
          </div>
        </div>

        {/* Quick start */}
        <Section emoji="🚀" title="Quick Start" defaultOpen>
          <Step n="1" title="Open any day on the calendar">
            Tap any date on the Home screen to open the day log.
          </Step>
          <Step n="2" title="Choose what to log">
            Pick from Meal, Exercise, Sleep, or Measurements and fill in the details.
          </Step>
          <Step n="3" title="Review your progress">
            Go to Insights to see charts for calories, nutrition, weight, and sleep over time.
          </Step>
          <Step n="4" title="Set your goals">
            Head to Settings → Profile &amp; Goals to set your daily calorie, protein, and weight targets.
          </Step>
        </Section>

        {/* Logging entries */}
        <Section emoji="📋" title="Logging Entries">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tap any day on the calendar to open the day log, then choose an entry type.</p>

          <div className="flex flex-col gap-3 mt-1">
            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0">🍽️</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Meal</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Log food with name, amount, and nutritional info — calories, protein, carbs, fat, fibre. The AI button opens your preferred AI assistant pre-filled with the meal details for instant macro estimates.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0">🏋️</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Exercise</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add exercises with individual set rows — each set has its own Load and Reps. Use "+ Add Set" to log multiple sets. Tap "Load coach program" to pre-fill the form with a program your coach assigned you.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0">😴</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sleep</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Log bedtime and wake time. The app calculates your sleep duration automatically. Rate your quality as Poor, Fair, Good, or Excellent.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0">📏</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Measurements</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track body weight, girth measurements (neck, shoulders, chest, waist, hips, thigh, arm, calf), and skinfold sites for body composition tracking.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[var(--color-bg-subtle)] rounded-xl p-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Deleting entries</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tap "View Entries" inside any day log to see all logged entries. Hover or long-press an entry to reveal the delete button.</p>
          </div>
        </Section>

        {/* Insights */}
        <Section emoji="📊" title="Insights">
          <p className="text-sm text-gray-500 dark:text-gray-400">The Insights tab shows charts and trends across your logged data.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              ['Calorie balance', 'Daily intake vs your goal'],
              ['Nutrition trends', 'Protein, carbs, fat over time'],
              ['Weight progress', 'Body weight chart over time'],
              ['Sleep patterns', 'Duration and quality trends'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-gray-50 dark:bg-[var(--color-bg-subtle)] rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Photos */}
        <Section emoji="📷" title="Progress Photos">
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload progress photos to track visual changes over time. Photos are stored securely in the cloud and only visible to you (and your coach if connected).</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Access the Photos tab from the bottom navigation.</p>
        </Section>

        {/* Tools */}
        <Section emoji="🔧" title="Tools">
          <p className="text-sm text-gray-500 dark:text-gray-400">The Tools tab gives you quick access to calculators and reference guides:</p>
          <div className="flex flex-wrap gap-1.5">
            {['TDEE Calculator', 'Macro Calculator', 'BMI / BMR', 'Body Fat %', 'Unit Converters', 'Portion Guide', '1RM Calculator'].map(t => (
              <Pill key={t} color="blue">{t}</Pill>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">All tools open in-page — no external navigation required.</p>
        </Section>

        {/* Coach features */}
        <Section emoji="👨‍💼" title="Coach Features">
          <p className="text-sm text-gray-500 dark:text-gray-400">Switch to Coach role in Settings → Account to access coach features.</p>

          <div className="flex flex-col gap-3 mt-1">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Clients tab</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Invite clients by email. Once they accept, you can view their full log — meals, exercise, sleep, and measurements — and leave comments on individual entries. A notification badge appears when clients have new activity.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Programs tab — Library</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Build workout programs with exercises, per-set targets (load &amp; reps), notes, and video links. Programs are saved to your library and can be assigned to any client at any time using the <strong>Assign</strong> button on each card.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Building a program</p>
              <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
                <p>1. Tap <strong>New program</strong> → enter a name and optional description.</p>
                <p>2. Add exercises — each card has a SET / LOAD / REPS table. Use <strong>+ Add Set</strong> to add more set rows.</p>
                <p>3. Optionally assign directly to clients from the editor, or save first and assign later from the library.</p>
                <p>4. Clients will see the program in their <em>Load coach program</em> picker when logging exercise.</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Messages</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send direct messages to clients. Clients receive a notification badge on their Home tab.</p>
            </div>
          </div>
        </Section>

        {/* Client features */}
        <Section emoji="🧑‍💪" title="Client Features">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Accepting a coach invite</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">When your coach sends an invite, a full-screen prompt appears on your Home tab. Accept to link your account to your coach, or decline if the invite wasn't expected.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Load coach program</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">When logging an exercise entry, tap <strong>Load coach program</strong> at the top of the form. Pick a program your coach assigned you and the exercises will pre-fill automatically. You can then adjust sets, load, and reps as needed before saving.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Coach feedback</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Coach comments appear below the relevant entry in your day log. A notification badge on your Home tab alerts you to new feedback.</p>
            </div>
          </div>
        </Section>

        {/* Settings */}
        <Section emoji="⚙️" title="Settings">
          <div className="flex flex-col gap-2.5">
            {[
              ['Profile & Goals', 'Set your display name, daily calorie goal, protein goal, and target weight.'],
              ['App Preferences', 'Toggle dark mode, choose weight/length units (kg/lbs, cm/in), and set date/time format.'],
              ['AI Assistant', 'Choose which AI service (ChatGPT, Claude, Gemini, Grok) opens when you tap the AI button on a meal entry. Customise the prompt format and language.'],
              ['Account', 'Switch between Client and Coach role. Sign out of your account.'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section emoji="❓" title="Frequently Asked Questions">
          <Q q="How do I invite a client?">
            Go to the Clients tab and tap Invite Client. Enter their email address — they'll receive an email with a link to create an account and accept the invite. Once accepted they appear in your client list.
          </Q>
          <Q q="My client accepted the invite but I still see 'Pending' — why?">
            This can happen if the client created their account before you sent the invite. Try asking them to sign out and back in — this triggers the invite link to their account.
          </Q>
          <Q q="How do I load a coach program when logging exercise?">
            Open any day, tap Exercise, and look for the "Load coach program" button at the top of the form. It only appears if your coach has assigned at least one program to you.
          </Q>
          <Q q="Can I use the app on desktop?">
            Yes. The app is fully responsive and works in any browser. Coaches in particular benefit from the wider layout when building programs or reviewing client data.
          </Q>
          <Q q="Where is my data stored?">
            All data is stored securely in Convex — a cloud database. Your data syncs in real-time across devices. You need an account to access Pro features.
          </Q>
          <Q q="How do I switch from Client to Coach mode?">
            Go to Settings → Account → Account role and toggle to Coach. The navigation will update immediately to show the Clients and Programs tabs.
          </Q>
          <Q q="Can I delete an entry I logged by mistake?">
            Yes. Open the day, tap "View Entries", then hover (or long-press on mobile) the entry to reveal the × delete button.
          </Q>
          <Q q="What does the AI button do on the meal form?">
            It opens your configured AI assistant (ChatGPT, Claude, etc.) with a pre-written prompt asking for the nutritional breakdown of the food you entered. Paste the result back into the form.
          </Q>
          <Q q="Can a client have multiple coaches?">
            Not currently. A client account is linked to one coach at a time.
          </Q>
        </Section>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 dark:text-gray-700 pb-2">
          My Calorie Balance Pro · Need more help? Contact us at support@mycaloriebalance.com
        </p>

      </div>
    </div>
  );
}
