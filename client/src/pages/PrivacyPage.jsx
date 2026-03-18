import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="glass rounded-3xl p-8 prose prose-invert max-w-none">
          <p className="text-gray-400 mb-6">Last updated: October 26, 2025</p>

          <h2>1. Information We Collect</h2>
          
          <h3>Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Name</li>
            <li>Password (encrypted)</li>
          </ul>

          <h3>Content You Upload</h3>
          <p>We process and store:</p>
          <ul>
            <li>Identity photos (for model creation)</li>
            <li>Reference images and videos</li>
            <li>Generated content</li>
          </ul>

          <h3>Usage Data</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>Generation history</li>
            <li>Credit usage</li>
            <li>IP address and device information</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve our AI generation services</li>
            <li>Process your content through our AI models</li>
            <li>Manage your account and credits</li>
            <li>Send important service updates</li>
            <li>Prevent fraud and abuse</li>
          </ul>

          <h2>3. Data Storage and Security</h2>
          <p>
            Your content is securely stored using Cloudinary CDN with encryption. We use industry-standard security measures including:
          </p>
          <ul>
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Encrypted password storage</li>
            <li>Secure database access controls</li>
            <li>Regular security audits</li>
          </ul>

          <h2>4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Cloudinary:</strong> For image and video storage</li>
            <li><strong>WaveSpeed AI:</strong> For AI model processing</li>
            <li><strong>Stripe:</strong> For payment processing (coming soon)</li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>
            We retain your account data and generated content as long as your account is active. You can request account deletion at any time.
          </p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request data correction or deletion</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Withdraw consent</li>
          </ul>

          <h2>7. Children's Privacy</h2>
          <p>
            Our Service is not intended for users under 18. We do not knowingly collect information from children.
          </p>

          <h2>8. International Data Transfers</h2>
          <p>
            Your data may be processed in servers located in different countries. We ensure appropriate safeguards are in place.
          </p>

          <h2>9. Changes to Privacy Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes via email.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            For privacy questions or to exercise your rights, contact: privacy@modelclone.ai
          </p>
        </div>
      </div>
    </div>
  );
}
