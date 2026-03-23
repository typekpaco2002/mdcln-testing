import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        
        <div className="glass rounded-3xl p-8 prose prose-invert max-w-none">
          <p className="text-gray-400 mb-6">Last updated: October 26, 2025</p>

          <h2>1. What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience.
          </p>

          <h2>2. How We Use Cookies</h2>
          
          <h3>Essential Cookies</h3>
          <p>Required for the service to function:</p>
          <ul>
            <li><strong>auth-storage:</strong> Keeps you logged in</li>
            <li><strong>session:</strong> Maintains your session</li>
          </ul>

          <h3>Analytics Cookies</h3>
          <p>Help us understand how you use our service (optional):</p>
          <ul>
            <li>Page views and navigation</li>
            <li>Feature usage statistics</li>
            <li>Error tracking</li>
          </ul>

          <h2>3. Third-Party Cookies</h2>
          <p>We may use cookies from:</p>
          <ul>
            <li><strong>Media Delivery Provider:</strong> For content delivery</li>
            <li><strong>Payment Processor:</strong> For payment processing</li>
          </ul>

          <h2>4. Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Note that disabling essential cookies may affect functionality.
          </p>

          <h3>Browser Instructions</h3>
          <ul>
            <li><strong>Chrome:</strong> Settings → Privacy → Cookies</li>
            <li><strong>Firefox:</strong> Preferences → Privacy → Cookies</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
          </ul>

          <h2>5. Cookie Duration</h2>
          <ul>
            <li><strong>Session cookies:</strong> Deleted when you close browser</li>
            <li><strong>Persistent cookies:</strong> Stored up to 30 days</li>
          </ul>

          <h2>6. Updates</h2>
          <p>
            We may update this Cookie Policy. Check this page periodically for changes.
          </p>

          <h2>7. Contact</h2>
          <p>
            Questions about cookies? Contact: privacy@modelclone.ai
          </p>
        </div>
      </div>
    </div>
  );
}
