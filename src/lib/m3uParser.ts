export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  category: string;
}

export interface CategoryVideos {
  name: string;
  videos: Video[];
}

const PROXY_URL = 'https://feedscroll.rayhandox.workers.dev?url=';

function getProxiedUrl(url: string): string {
  // Route ALL videos through proxy to fix CORS issues
  return `${PROXY_URL}${encodeURIComponent(url)}`;
}

export async function parseM3U(url: string): Promise<CategoryVideos[]> {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.split('\n');

  const categories: Record<string, Video[]> = {};
  let currentVideo: Partial<Video> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXTINF:')) {
      const match = trimmed.match(/tvg-id="([^"]+)"/);
      const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
      const groupMatch = trimmed.match(/group-title="([^"]+)"/);
      const titleMatch = trimmed.match(/,(.+)$/);

      currentVideo = {
        id: match ? match[1] : '',
        thumbnail: logoMatch ? logoMatch[1] : '',
        category: groupMatch ? groupMatch[1] : 'Uncategorized',
        title: titleMatch ? titleMatch[1].trim() : 'Untitled',
      };
    } else if (trimmed.startsWith('http') && currentVideo.id) {
      // Route all videos through proxy
      const proxiedUrl = getProxiedUrl(trimmed);

      const category = currentVideo.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        id: currentVideo.id,
        title: currentVideo.title,
        thumbnail: currentVideo.thumbnail,
        url: proxiedUrl,
        category: category,
      });

      currentVideo = {};
    }
  }

  return Object.entries(categories).map(([name, videos]) => ({
    name,
    videos,
  }));
}

export function filterVideosBySearch(videos: Video[], query: string): Video[] {
  if (!query.trim()) return videos;
  const lowerQuery = query.toLowerCase();
  return videos.filter(v =>
    v.title.toLowerCase().includes(lowerQuery) ||
    v.category.toLowerCase().includes(lowerQuery)
  );
}