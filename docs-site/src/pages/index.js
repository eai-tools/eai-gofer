import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  return (
    <Layout
      title="Gofer"
      description="Nightly-generated technical documentation for Gofer sourced from .tech-docs.">
      <main style={{padding: '4rem 1.5rem', textAlign: 'center'}}>
        <h1>Gofer</h1>
        <p>Nightly-generated technical documentation sourced from <code>.tech-docs</code>.</p>
        <p>
          <Link className="button button--primary button--lg" to="/docs/overview">
            Open Technical Overview
          </Link>
        </p>
      </main>
    </Layout>
  );
}
