import { CARD } from './styles';

// Pro's own copy of the Original app's /portion-guide/ page. The images are
// the same files in public/images/.

const PORTIONS = [
  { emoji: '🤚', unit: 'Palm',        food: 'Protein-dense foods' },
  { emoji: '✊', unit: 'Fist',        food: 'Vegetables' },
  { emoji: '🤲', unit: 'Cupped Hand', food: 'Carb-dense foods (if extra carbs)' },
  { emoji: '👍', unit: 'Thumb',       food: 'Fat-dense foods (if extra fats)' },
];

const KEY_POINTS = [
  ['Personalized', 'Your hand size relates to your body size, making this a customized approach to portion control'],
  ['Portable', 'Always have your measuring tool with you — no equipment needed'],
  ['Flexible', 'This is a starting point — adjust portions based on hunger, fullness, and your specific goals'],
  ['Simple', 'Just count to two and use your hand — no complicated calculations required'],
];

function Guide({ title, count, image, alt }) {
  return (
    <div className={`${CARD} flex flex-col gap-3`}>
      <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      <img src={image} alt={alt} loading="lazy" className="w-full h-auto rounded-xl"
        onError={e => { e.currentTarget.style.display = 'none'; }} />
      <div className="flex flex-col gap-1.5">
        {PORTIONS.map(p => (
          <div key={p.unit} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">
              {p.emoji} {count} {p.unit}{count > 1 ? 's' : ''}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-right">{p.food}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortionGuideTool() {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Use your hand as a personalized measuring tool — no scales or measuring cups needed. Your hand size naturally
        correlates with your body size, making it an excellent portable guide for building balanced meals.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <Guide title="For Women" count={1} image="/images/portion-guide-women.jpg"
          alt="Hand portion size guide for women showing palm-sized protein, fist-sized vegetables, cupped hand of carbs, and thumb-sized fats" />
        <Guide title="For Men" count={2} image="/images/portion-guide-men.jpg"
          alt="Hand portion size guide for men showing two palms of protein, two fists of vegetables, two cupped hands of carbs, and two thumbs of fats" />
      </div>

      <div className={`${CARD} flex flex-col gap-2`}>
        <h3 className="text-sm lg:text-base font-bold text-gray-900 dark:text-white">Key points to remember</h3>
        {KEY_POINTS.map(([title, text]) => (
          <p key={title} className="text-sm text-gray-600 dark:text-gray-300">
            <strong className="text-gray-800 dark:text-gray-200">{title}:</strong> {text}
          </p>
        ))}
      </div>
    </div>
  );
}
