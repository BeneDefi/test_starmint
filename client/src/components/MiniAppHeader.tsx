import { useEffect } from 'react';

interface MiniAppHeaderProps {
  title: string;
  description: string;
  imageUrl: string;
}

export default function MiniAppHeader({ title, description, imageUrl }: MiniAppHeaderProps) {
  useEffect(() => {
    // Set up the Mini App embed metadata following latest Neynar standards
    const embedData = {
      version: "next",
      imageUrl: imageUrl,
      button: {
        title: "🚀 Play Starmint",
        action: {
          type: "launch_miniapp",
          name: "Starmint Classic Space Shooter",
          url: window.location.origin,
          splashImageUrl: window.location.origin + "/spaceship.png",
          splashBackgroundColor: "#0f172a"
        }
      }
    };

    // Set the required fc:frame meta tag for Mini App embed
    const frameMeta = document.querySelector('meta[name="fc:frame"]') || document.createElement('meta');
    frameMeta.setAttribute('name', 'fc:frame');
    frameMeta.setAttribute('content', JSON.stringify(embedData));
    if (!document.head.contains(frameMeta)) {
      document.head.appendChild(frameMeta);
    }

    // Set Farcaster Mini App identifier
    const miniAppMeta = document.querySelector('meta[name="fc:miniapp"]') || document.createElement('meta');
    miniAppMeta.setAttribute('name', 'fc:miniapp');
    miniAppMeta.setAttribute('content', 'true');
    if (!document.head.contains(miniAppMeta)) {
      document.head.appendChild(miniAppMeta);
    }

    // Set Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    ogTitle.setAttribute('content', title);
    if (!document.head.contains(ogTitle)) {
      document.head.appendChild(ogTitle);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]') || document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    ogDescription.setAttribute('content', description);
    if (!document.head.contains(ogDescription)) {
      document.head.appendChild(ogDescription);
    }

    const ogImage = document.querySelector('meta[property="og:image"]') || document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    ogImage.setAttribute('content', imageUrl);
    if (!document.head.contains(ogImage)) {
      document.head.appendChild(ogImage);
    }

    // Set additional Open Graph meta tags
    const ogUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    ogUrl.setAttribute('content', window.location.origin);
    if (!document.head.contains(ogUrl)) {
      document.head.appendChild(ogUrl);
    }

    const ogType = document.querySelector('meta[property="og:type"]') || document.createElement('meta');
    ogType.setAttribute('property', 'og:type');
    ogType.setAttribute('content', 'website');
    if (!document.head.contains(ogType)) {
      document.head.appendChild(ogType);
    }

    // Set Twitter meta tags for better sharing
    const twitterCard = document.querySelector('meta[name="twitter:card"]') || document.createElement('meta');
    twitterCard.setAttribute('name', 'twitter:card');
    twitterCard.setAttribute('content', 'summary_large_image');
    if (!document.head.contains(twitterCard)) {
      document.head.appendChild(twitterCard);
    }

    const twitterTitle = document.querySelector('meta[name="twitter:title"]') || document.createElement('meta');
    twitterTitle.setAttribute('name', 'twitter:title');
    twitterTitle.setAttribute('content', title);
    if (!document.head.contains(twitterTitle)) {
      document.head.appendChild(twitterTitle);
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]') || document.createElement('meta');
    twitterDescription.setAttribute('name', 'twitter:description');
    twitterDescription.setAttribute('content', description);
    if (!document.head.contains(twitterDescription)) {
      document.head.appendChild(twitterDescription);
    }

    const twitterImage = document.querySelector('meta[name="twitter:image"]') || document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    twitterImage.setAttribute('content', imageUrl);
    if (!document.head.contains(twitterImage)) {
      document.head.appendChild(twitterImage);
    }

    // Set page title
    document.title = title;
  }, [title, description, imageUrl]);

  return null; // This component only sets meta tags
}