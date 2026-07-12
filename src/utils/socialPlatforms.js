/** Display order: popular / engaging platforms first */
export const SOCIAL_PLATFORM_ORDER = [
  'twitter',
  'instagram',
  'google maps reviews',
  'facebook',
  'youtube',
  'tiktok',
  'snapchat',
  'whatsapp',
  'linkedin',
  'pinterest',
  'telegram',
  'reddit',
  'discord',
  'twitch',
  'github',
  'dribbble',
  'behance',
  'vimeo',
  'flickr',
];

export function sortSocialPlatformKeys(platformKeys) {
  if (!platformKeys?.length) return [];
  const orderMap = new Map(SOCIAL_PLATFORM_ORDER.map((key, index) => [key, index]));
  return [...platformKeys].sort((a, b) => {
    const aIdx = orderMap.has(a) ? orderMap.get(a) : 999;
    const bIdx = orderMap.has(b) ? orderMap.get(b) : 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });
}
