import { getCollection } from 'astro:content';
import { formatDate } from '@utils/date';

export async function GET() {
  // Get all posts
  const posts = await getCollection('posts');

  // Define helpful links data
  const helpfulLinks = [
    {
      slug: 'bmr-calculator',
      title: 'BMR Calculator',
      description: 'Calculate your Basal Metabolic Rate to understand your daily calorie needs',
      category: 'Calorie & Nutrition Tools',
      tags: ['calculator', 'bmr', 'calories', 'metabolism'],
      url: 'https://www.calculator.net/bmr-calculator.html',
      type: 'external-link'
    },
    {
      slug: 'daily-calorie-calculator',
      title: 'Daily Calorie Calculator',
      description: 'Determine your daily calorie requirements based on activity level and goals',
      category: 'Calorie & Nutrition Tools',
      tags: ['calculator', 'calories', 'daily-needs', 'activity'],
      url: 'https://www.calculator.net/calorie-calculator.html',
      type: 'external-link'
    },
    {
      slug: 'macro-calculator',
      title: 'Macro Calculator',
      description: 'Calculate your protein, carbs, and fat requirements for optimal nutrition',
      category: 'Calorie & Nutrition Tools',
      tags: ['calculator', 'macros', 'protein', 'carbs', 'fat'],
      url: 'https://www.calculator.net/macro-calculator.html',
      type: 'external-link'
    },
    {
      slug: 'jackson-pollock-skinfold-calculator',
      title: 'Jackson-Pollock Skinfold Calculator',
      description: 'Calculate body density and body fat percentage using scientifically validated skinfold equations',
      category: 'Calorie & Nutrition Tools',
      tags: ['calculator', 'skinfold', 'body-fat', 'body-density', 'jackson-pollock'],
      url: 'https://www.topendsports.com/testing/density-jackson-pollock.htm',
      type: 'external-link'
    },
    {
      slug: 'body-fat-calculator',
      title: 'Body Fat Calculator',
      description: 'Estimate your body fat percentage using various measurement methods',
      category: 'Fitness & Workout Tools',
      tags: ['calculator', 'body-fat', 'measurements', 'fitness'],
      url: 'https://www.calculator.net/body-fat-calculator.html',
      type: 'external-link'
    },
    {
      slug: 'one-rep-max-calculator',
      title: '1RM Calculator',
      description: 'Calculate your one-rep max for strength training and program design',
      category: 'Fitness & Workout Tools',
      tags: ['calculator', 'strength', '1rm', 'weightlifting'],
      url: 'https://www.calculator.net/one-rep-max-calculator.html',
      type: 'external-link'
    },
    {
      slug: 'pace-calculator',
      title: 'Pace Calculator',
      description: 'Calculate running pace, time, and distance for your training runs',
      category: 'Fitness & Workout Tools',
      tags: ['calculator', 'running', 'pace', 'training'],
      url: 'https://www.calculator.net/pace-calculator.html',
      type: 'external-link'
    },
    {
      slug: 'examine-com',
      title: 'Examine.com',
      description: 'Analyzes and summarizes the latest scientific research on supplements',
      category: 'Health & Wellness Resources',
      tags: ['supplements', 'research', 'science', 'evidence-based'],
      url: 'https://examine.com/',
      type: 'external-link'
    },
    {
      slug: 'labdoor',
      title: 'Labdoor',
      description: 'An independent company that tests supplements',
      category: 'Health & Wellness Resources',
      tags: ['supplements', 'testing', 'quality', 'independent'],
      url: 'https://labdoor.com/',
      type: 'external-link'
    },
    {
      slug: 'exrx-net',
      title: 'ExRx.net',
      description: 'Exercise Library with comprehensive exercise database',
      category: 'Health & Wellness Resources',
      tags: ['exercises', 'workouts', 'fitness', 'library'],
      url: 'https://exrx.net/Lists/Directory',
      type: 'external-link'
    },
    {
      slug: 'myfitnesspal',
      title: 'MyFitnessPal',
      description: 'Popular calorie and macro tracking app with extensive food database',
      category: 'Recommended Apps & Tools',
      tags: ['app', 'tracking', 'calories', 'macros', 'food'],
      type: 'app',
      platforms: ['iOS', 'Android']
    },
    {
      slug: 'fitbit',
      title: 'Fitbit',
      description: 'Activity tracking, heart rate monitoring, and sleep analysis',
      category: 'Recommended Apps & Tools',
      tags: ['app', 'tracking', 'activity', 'heart-rate', 'sleep'],
      type: 'app',
      platforms: ['iOS', 'Android']
    },
    {
      slug: 'nike-training-club',
      title: 'Nike Training Club',
      description: 'Free workout videos and training plans for all fitness levels',
      category: 'Recommended Apps & Tools',
      tags: ['app', 'workouts', 'training', 'videos', 'free'],
      type: 'app',
      platforms: ['iOS', 'Android']
    }
  ];

  // Format posts for search
  const postsData = posts.map(post => {
    // Create a serializable version of the image data if it exists
    const imageData = post.data.image ? {
      src: post.data.image.src,
      width: post.data.image.width,
      height: post.data.image.height
    } : null;
    
    return {
      slug: post.slug,
      title: post.data.title,
      description: post.data.description || '',
      date: post.data.date ? formatDate(post.data.date) : '',
      image: imageData,
      categories: post.data.categories || [],
      tags: post.data.tags || [],
      content: post.body,
      type: 'post',
      url: `/${post.slug}/`
    };
  });

  // Format helpful links for search
  const linksData = helpfulLinks.map(link => ({
    slug: link.slug,
    title: link.title,
    description: link.description,
    category: link.category,
    tags: link.tags,
    type: link.type,
    url: link.url || null,
    platforms: link.platforms || null
  }));

  // Combine both datasets
  const searchData = [...postsData, ...linksData];

  return new Response(JSON.stringify(searchData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
