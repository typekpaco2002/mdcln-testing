import { Link } from 'react-router-dom';
import { Mail, Twitter, Instagram, Linkedin } from 'lucide-react';
import BrandMark from './BrandMark.jsx';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-20"
      style={{
        background: 'var(--bg-page)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark size={32} />
              <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                ModelClone
              </h3>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              AI-powered identity recreation and video generation platform.
            </p>
          </div>

          {/* Product */}
          <FooterCol title="Product" links={[
            { to: "/dashboard", label: "Dashboard" },
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Pricing" },
          ]} />

          {/* Legal */}
          <FooterCol title="Legal" links={[
            { to: "/terms", label: "Terms of Service" },
            { to: "/privacy", label: "Privacy Policy" },
            { to: "/cookies", label: "Cookie Policy" },
          ]} />

          {/* Contact */}
          <div>
            <h4 className="eyebrow mb-4">Contact</h4>
            <ul className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <a href="mailto:support@modelclone.app" className="inline-flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                  <Mail className="w-4 h-4" />
                  support@modelclone.app
                </a>
              </li>
              <li>
                <a href="mailto:support@modelclone.app" className="transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
                  Legal inquiries: support@modelclone.app
                </a>
              </li>
              <li>
                <a href="mailto:support@modelclone.app" className="transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
                  DMCA: support@modelclone.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social & Copyright */}
        <div
          className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            © {currentYear} ModelClone. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            {[
              { href: 'https://twitter.com', Icon: Twitter, label: 'Twitter' },
              { href: 'https://instagram.com', Icon: Instagram, label: 'Instagram' },
              { href: 'https://linkedin.com', Icon: Linkedin, label: 'LinkedIn' },
            ].map(({ href, Icon, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors"
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-content)',
                  border: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="eyebrow mb-4">{title}</h4>
      <ul className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {links.map((link) => (
          <li key={link.to || link.href}>
            {link.to ? (
              <Link to={link.to} className="transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                {link.label}
              </Link>
            ) : (
              <a href={link.href} className="transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
