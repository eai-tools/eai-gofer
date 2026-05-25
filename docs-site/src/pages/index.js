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
        <p style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center'}}>
          <Link className="button button--primary button--lg" to="/docs/overview">
            Open Technical Overview
          </Link>
          <a className="button button--secondary button--lg" href="https://eai-tools.github.io/eai-gofer/releases.html">
            Open Releases
          </a>
        </p>
        <section style={{maxWidth: '760px', margin: '3rem auto 0', textAlign: 'left'}}>
          <h2>Public Downloads</h2>
          <p>
            Install the VS Code extension, download the portable agent plugin zip, or use the hosted
            Claude/Codex/Copilot plugin bundle directly from GitHub Pages.
          </p>
          <p style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
            <a className="button button--primary" href="/eai-gofer/releases/eai-gofer-latest.vsix">
              Latest VSIX
            </a>
            <a className="button button--secondary" href="/eai-gofer/releases/eai-gofer-agent-plugin-latest.zip">
              Latest Agent Plugin Zip
            </a>
            <a className="button button--secondary" href="/eai-gofer/releases/plugins/eai-gofer">
              Public Plugin Bundle
            </a>
          </p>
        </section>
      </main>
    </Layout>
  );
}
