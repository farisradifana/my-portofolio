// Social links. Icon paths come from simple-icons at build time (official
// marks, CC0). LinkedIn is no longer shipped by simple-icons, so its path is inlined.
import { siGithub, siGitlab, siX, siInstagram, siThreads, siFacebook, siTiktok, siReddit } from 'simple-icons';
import { site } from './site';

export interface Social {
  name: string;
  href: string;
  path: string;
  /** Brand color for hover. Omitted for black marks, which use the text color instead. */
  color?: string;
}

const MAIL =
  'M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Zm21-1.762V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z';
const LINKEDIN =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';

// Professional first, then social.
export const socials: Social[] = [
  { name: 'Email', href: `mailto:${site.email}`, path: MAIL, color: 'var(--accent-ink)' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/farisradifana', path: LINKEDIN, color: '#0A66C2' },
  { name: 'GitHub', href: 'https://github.com/farisradifana', path: siGithub.path },
  { name: 'GitLab', href: 'https://gitlab.com/farisradifana', path: siGitlab.path, color: '#FC6D26' },
  { name: 'X', href: 'https://x.com/farisradifana', path: siX.path },
  { name: 'Instagram', href: 'https://www.instagram.com/farisradifan', path: siInstagram.path, color: '#FF0069' },
  { name: 'Threads', href: 'https://www.threads.com/@farisradifana', path: siThreads.path },
  { name: 'Facebook', href: 'https://www.facebook.com/farisradifanahmad', path: siFacebook.path, color: '#0866FF' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@farisradifana', path: siTiktok.path },
  { name: 'Reddit', href: 'https://www.reddit.com/user/farisradifana/', path: siReddit.path, color: '#FF4500' },
];
