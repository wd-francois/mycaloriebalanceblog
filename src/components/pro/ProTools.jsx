import { useState, useMemo } from 'react';

const CARD = 'group block p-4 bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200';
const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

const CalcIcon = ({ color }) => (
  <svg className={`w-7 h-7 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const sections = [
  {
    id: 'calorie',
    title: 'Calorie & Nutrition Tools',
    subtitle: 'Essential calculators for tracking your nutrition',
    items: [
      {
        href: '/calorie-calculator/',
        title: 'Calorie Calculator',
        description: 'Calculate your BMR and TDEE using the Mifflin-St Jeor Equation',
        tags: 'calculator bmr tdee calories mifflin-st-jeor',
        external: false,
        hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-600',
        hoverTitle: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        icon: <CalcIcon color="text-blue-600 dark:text-blue-400" />,
      },
      {
        href: '/kilojoule-converter/',
        title: 'Kilojoule Converter',
        description: 'Convert between kilojoules (kJ) and kilocalories (kcal)',
        tags: 'converter kilojoules calories kj kcal',
        external: false,
        hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-600',
        hoverTitle: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
        icon: (
          <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ),
      },
      {
        href: '/portion-guide/',
        title: 'Hand Portion Guide',
        description: 'Use your hand as a measuring tool for portion control',
        tags: 'guide portion control hand measurement nutrition',
        external: false,
        hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-600',
        hoverTitle: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
        icon: (
          <svg className="w-7 h-7 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
          </svg>
        ),
      },
      {
        href: '/protein-calculator/',
        title: 'Protein Calculator',
        description: 'Calculate protein per calorie ratio for any food',
        tags: 'calculator protein calories ratio macros',
        external: false,
        hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-600',
        hoverTitle: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
        icon: <CalcIcon color="text-sky-600 dark:text-sky-400" />,
      },
    ],
  },
  {
    id: 'health',
    title: 'Health & Wellness Resources',
    subtitle: 'Reliable sources for health information and guidance',
    items: [
      {
        href: 'https://examine.com/',
        title: 'Examine.com',
        description: 'Science-based supplement research and analysis',
        tags: 'supplements research science evidence-based',
        external: true,
        hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-600',
        hoverTitle: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        icon: (
          <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        href: 'https://labdoor.com/',
        title: 'Labdoor',
        description: 'Independent supplement testing and quality ratings',
        tags: 'supplements testing quality independent',
        external: true,
        hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-600',
        hoverTitle: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
        icon: (
          <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
      },
      {
        href: 'https://exrx.net/Lists/Directory',
        title: 'ExRx.net',
        description: 'Comprehensive exercise library and database',
        tags: 'exercises workouts fitness library',
        external: true,
        hoverBorder: 'hover:border-yellow-300 dark:hover:border-yellow-600',
        hoverTitle: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400',
        icon: (
          <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
      },
      {
        href: 'https://pubmed.ncbi.nlm.nih.gov/',
        title: 'PubMed',
        description: 'Peer-reviewed studies in medicine, exercise science, and nutrition',
        tags: 'research pubmed science medicine exercise nutrition',
        external: true,
        hoverBorder: 'hover:border-yellow-300 dark:hover:border-yellow-600',
        hoverTitle: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400',
        icon: (
          <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        ),
      },
      {
        href: 'https://www.openpowerlifting.org/',
        title: 'World Powerlifting Records',
        description: 'Open archive of world powerlifting records and data',
        tags: 'powerlifting records data strength',
        external: true,
        hoverBorder: 'hover:border-yellow-300 dark:hover:border-yellow-600',
        hoverTitle: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400',
        icon: (
          <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        ),
      },
      {
        href: 'https://strengthlevel.com/strength-standards/',
        title: 'Strength Level',
        description: 'Compare your lifts to strength standards worldwide',
        tags: 'strength standards compare weightlifting powerlifting',
        external: true,
        hoverBorder: 'hover:border-yellow-300 dark:hover:border-yellow-600',
        hoverTitle: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400',
        icon: (
          <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'fitness',
    title: 'Fitness & Workout Tools',
    subtitle: 'Tools to track your fitness progress and plan workouts',
    items: [
      {
        href: 'https://www.calculator.net/body-fat-calculator.html',
        title: 'Body Fat Calculator',
        description: 'Estimate your body fat percentage using various measurement methods',
        tags: 'calculator body-fat measurements fitness',
        external: true,
        hoverBorder: 'hover:border-red-300 dark:hover:border-red-600',
        hoverTitle: 'group-hover:text-red-600 dark:group-hover:text-red-400',
        icon: (
          <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
      {
        href: 'https://www.topendsports.com/testing/density-jackson-pollock.htm',
        title: 'Skinfold Calculator',
        description: 'Calculate body fat using Jackson-Pollock skinfold equations',
        tags: 'calculator skinfold body-fat jackson-pollock fitness',
        external: true,
        hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-600',
        hoverTitle: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
        icon: (
          <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
      {
        href: 'https://www.calculator.net/one-rep-max-calculator.html',
        title: '1RM Calculator',
        description: 'Calculate your one-rep max for strength training',
        tags: 'calculator strength 1rm weightlifting',
        external: true,
        hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-600',
        hoverTitle: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
        icon: (
          <svg className="w-7 h-7 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: 'https://www.calculator.net/pace-calculator.html',
        title: 'Pace Calculator',
        description: 'Calculate running pace, time, and distance',
        tags: 'calculator running pace training',
        external: true,
        hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-600',
        hoverTitle: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
        icon: (
          <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: 'https://exrx.net/Calculators/MinuteRun',
        title: 'Cooper Test (VO2 Max)',
        description: 'Calculate VO2 max using the 12-minute run test',
        tags: 'calculator cooper test vo2 max running fitness cardiovascular',
        external: true,
        hoverBorder: 'hover:border-green-300 dark:hover:border-green-600',
        hoverTitle: 'group-hover:text-green-600 dark:group-hover:text-green-400',
        icon: (
          <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
    ],
  },
];

const ExternalIcon = () => (
  <svg className="inline-block ml-1 w-3 h-3 opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

export default function ProTools() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item =>
          `${item.title} ${item.description} ${item.tags}`.toLowerCase().includes(q)
        ),
      }))
      .filter(sec => sec.items.length > 0);
  }, [search]);

  const totalResults = filtered.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-6">

        {/* Header + Search */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Tools & Resources</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search tools and resources…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-muted)] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {search.trim() && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {totalResults === 0
                ? `No results for "${search}"`
                : `${totalResults} result${totalResults === 1 ? '' : 's'} for "${search}"`}
            </p>
          )}
        </div>

        {/* Tool Sections */}
        {filtered.map(sec => (
          <div key={sec.id}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{sec.title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{sec.subtitle}</p>
            <div className={GRID}>
              {sec.items.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={`${CARD} ${item.hoverBorder}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <h3 className={`text-sm font-semibold text-gray-900 dark:text-white ${item.hoverTitle} transition-colors leading-tight`}>
                        {item.title}{item.external && <ExternalIcon />}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Disclaimer */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Disclaimer</h3>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            These tools are for informational purposes only. Always consult healthcare professionals before making significant changes to your diet or exercise routine.
          </p>
        </div>

      </div>
    </div>
  );
}
