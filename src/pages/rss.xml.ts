import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '@config/site';
import { formatDate } from '@utils/date';

export async function GET(context: any) {
  const posts = await getCollection('posts');
  
  // Sort posts by date (newest first), handling undefined dates
  const sortedPosts = posts.sort((a, b) => {
    const dateA = a.data.date || new Date(0);
    const dateB = b.data.date || new Date(0);
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return rss({
    title: siteConfig.title, // Updated from siteConfig.name
    description: siteConfig.description,
    site: context.site ? context.site.toString() : '', // Use context.site, fallback to empty if undefined
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/${post.slug}/`,
      categories: post.data.categories || [],
      // Optional custom data
      customData: post.data.tags ? 
        `<tags>${post.data.tags.join(',')}</tags>` : '',
    })),
    // Optional: customize the RSS output
    stylesheet: '/rss/styles.xsl',
  });
}
