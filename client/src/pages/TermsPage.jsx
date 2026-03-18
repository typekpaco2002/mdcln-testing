import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="glass rounded-3xl p-8 prose prose-invert max-w-none">
          <p className="text-gray-400 mb-6">Last updated: October 26, 2025</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using ModelClone ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use the Service for personal or commercial purposes. This is the grant of a license, not a transfer of title.
          </p>

          <h2>3. Content Ownership</h2>
          <p>
            You retain all rights to the content you upload. However, by uploading content, you grant ModelClone a worldwide, non-exclusive license to use, process, and display your content solely for the purpose of providing the Service.
          </p>

          <h2>4. AI-Generated Content</h2>
          <p>
            You own the AI-generated content created using our Service. You are responsible for ensuring you have the rights to use any reference images or videos you upload.
          </p>

          <h2>5. Prohibited Uses</h2>
          <p>You may not use the Service to:</p>
          <ul>
            <li>Create deepfakes or misleading content</li>
            <li>Violate anyone's intellectual property or privacy rights</li>
            <li>Generate illegal, harmful, or offensive content</li>
            <li>Impersonate others without consent</li>
          </ul>

          <h2>6. Credits and Payments</h2>
          <p>
            Credits are non-refundable. Unused credits do not expire. Prices are subject to change with notice.
          </p>

          <h2>7. Service Availability</h2>
          <p>
            We strive for 99.9% uptime but do not guarantee uninterrupted service. We may suspend service for maintenance with notice when possible.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            ModelClone shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the Service.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            For questions about these Terms, contact us at: support@modelclone.app
          </p>
        </div>
      </div>
    </div>
  );
}
