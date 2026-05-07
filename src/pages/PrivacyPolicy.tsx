import React from 'react';
import { PageHeader } from '../components/ui/index';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
            <PageHeader title="Privacy Policy" subtitle="Last updated: April 19, 2026" />
            
            <div className="flex-1 py-12 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="glass-md rounded-3xl p-8 space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
                    <p>Last updated: April 19, 2026</p>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>1. Introduction</h2>
                        <p>ShutliX ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our shuttle tracking platform.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>2. Information We Collect</h2>
                        <p><strong>Location Data:</strong> When using the driver portal, we collect real-time geolocation data to provide tracking services. Students do not share their location unless they explicitly use the "Locate Me" feature for navigation purposes.</p>
                        <p><strong>Account Information:</strong> Name, email, and organization details provided during registration.</p>
                        <p><strong>Usage Data:</strong> Information about how you interact with our platform.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>3. How We Use Your Information</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To provide live shuttle tracking services.</li>
                            <li>To facilitate communication within your organization.</li>
                            <li>To improve platform performance and security.</li>
                            <li>To generate anonymous analytics for organization administrators.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>4. Security</h2>
                        <p>We implement industry-standard security measures, including HTTPS encryption and secure database protocols, to protect your data. Real-time communication is handled via secure WebSockets.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>5. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, please contact us at privacy@shuttlix.applet.</p>
                    </section>
                </div>
            </div>
        </div>
      </div>
    );
};

export default PrivacyPolicy;
