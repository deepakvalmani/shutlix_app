import React from 'react';
import { PageHeader } from '../components/ui/index';

const CookiePolicy = () => {
    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
            <PageHeader title="Cookie Policy" subtitle="Last updated: April 19, 2026" />

            <div className="flex-1 py-12 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="glass-md rounded-3xl p-8 space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
                    <p>Last updated: April 19, 2026</p>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>1. What are Cookies?</h2>
                        <p>Cookies are small text files stored on your device when you visit a website. They help the platform remember your preferences and improve your browsing experience.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>2. How We Use Cookies</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Essential:</strong> Required for you to log in and access secure areas of the platform.</li>
                            <li><strong>Preferences:</strong> Used to remember your theme choice (Light/Dark mode).</li>
                            <li><strong>Analytics:</strong> Help us understand how many users are active and which features are most popular.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>3. Managing Cookies</h2>
                        <p>Most browsers allow you to control cookies through their settings. However, disabling essential cookies may prevent you from logging in and tracking shuttles.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>4. Third-Party Cookies</h2>
                        <p>We use trusted third-party services like map tile providers (CARTO, OSM) which may set cookies to deliver map content successfully.</p>
                    </section>
                </div>
            </div>
        </div>
      </div>
    );
};

export default CookiePolicy;
