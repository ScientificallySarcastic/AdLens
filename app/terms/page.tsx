export default function Terms() {
  const sections = [
    {
      number: "01",
      title: "Service Description",
      content:
        "Fastrill provides WhatsApp automation and messaging tools for businesses. Our platform enables intelligent, intent-based customer conversations at scale.",
    },
    {
      number: "02",
      title: "Account Responsibility",
      content:
        "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.",
    },
    {
      number: "03",
      title: "Acceptable Use",
      content:
        "You agree not to use the platform for spam, illegal activities, or violations of Meta's messaging policies. We reserve the right to investigate and take action against misuse.",
    },
    {
      number: "04",
      title: "Payments",
      content:
        "Messaging fees charged by Meta are the sole responsibility of the connected business account holder. Fastrill subscription fees are billed separately per your chosen plan.",
    },
    {
      number: "05",
      title: "Termination",
      content:
        "We may suspend or terminate accounts that violate these Terms, with or without prior notice depending on the severity of the violation.",
    },
    {
      number: "06",
      title: "Limitation of Liability",
      content:
        'Fastrill is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from your use of the platform.',
    },
    {
      number: "07",
      title: "Contact",
      content: (
        <>
          For questions about these Terms, reach us at{" "}
          <a href="mailto:support@fastrill.com" style={{ color: "#00e5a0", textDecoration: "none" }}>
            support@fastrill.com
          </a>
          . We typically respond within 24 business hours.
        </>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080c10;
          color: #e8edf2;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px 100px;
        }

        /* ── NAV ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 80px;
        }
        .nav-logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.5px;
          color: #fff;
          text-decoration: none;
        }
        .nav-logo span { color: #00e5a0; }
        .nav-back {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }
        .nav-back:hover { color: #00e5a0; }

        /* ── HERO ── */
        .hero {
          margin-bottom: 72px;
        }
        .hero-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #00e5a0;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hero-eyebrow::after {
          content: '';
          display: block;
          width: 32px;
          height: 1px;
          background: #00e5a0;
          opacity: 0.5;
        }
        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(38px, 6vw, 62px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -2px;
          color: #fff;
          margin-bottom: 24px;
        }
        .hero-title em {
          font-style: normal;
          color: transparent;
          -webkit-text-stroke: 1px rgba(255,255,255,0.3);
        }
        .hero-meta {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
        }
        .hero-meta-item {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          font-weight: 300;
        }
        .hero-meta-item strong {
          display: block;
          color: rgba(255,255,255,0.7);
          font-weight: 500;
          margin-bottom: 2px;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* ── DIVIDER ── */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, #00e5a0 0%, rgba(0,229,160,0.2) 30%, transparent 70%);
          margin-bottom: 64px;
        }

        /* ── SECTIONS ── */
        .sections { display: flex; flex-direction: column; gap: 0; }

        .section {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 0 32px;
          padding: 36px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
          transition: background 0.2s;
        }
        .section:first-child { border-top: 1px solid rgba(255,255,255,0.05); }
        .section:hover { background: rgba(255,255,255,0.015); }

        .section-number {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #00e5a0;
          padding-top: 4px;
          opacity: 0.7;
        }

        .section-body {}
        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -0.3px;
        }
        .section-content {
          font-size: 15px;
          line-height: 1.75;
          color: rgba(255,255,255,0.5);
          font-weight: 300;
          max-width: 620px;
        }

        /* ── FOOTER ── */
        .footer {
          margin-top: 72px;
          padding: 32px;
          background: rgba(0,229,160,0.04);
          border: 1px solid rgba(0,229,160,0.12);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: gap;
          gap: 16px;
        }
        .footer-left {}
        .footer-label {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #00e5a0;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .footer-text {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          font-weight: 300;
        }
        .footer-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #00e5a0;
          color: #080c10;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.5px;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 0.2s, transform 0.15s;
        }
        .footer-btn:hover { opacity: 0.88; transform: translateY(-1px); }

        @media (max-width: 560px) {
          .section { grid-template-columns: 48px 1fr; gap: 0 16px; }
          .footer { flex-direction: column; }
        }
      `}</style>

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <a href="/" className="nav-logo">fast<span>rill</span></a>
          <a href="/" className="nav-back">← Back to home</a>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">Legal</div>
          <h1 className="hero-title">Terms &<br /><em>Conditions</em></h1>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <strong>Last Updated</strong>
              February 2026
            </div>
            <div className="hero-meta-item">
              <strong>Effective</strong>
              Upon account creation
            </div>
            <div className="hero-meta-item">
              <strong>Applies to</strong>
              All Fastrill users
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* SECTIONS */}
        <div className="sections">
          {sections.map((s) => (
            <div key={s.number} className="section">
              <div className="section-number">{s.number}</div>
              <div className="section-body">
                <div className="section-title">{s.title}</div>
                <div className="section-content">{s.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER CTA */}
        <div className="footer">
          <div className="footer-left">
            <div className="footer-label">Questions?</div>
            <div className="footer-text">Our team is ready to help clarify anything.</div>
          </div>
          <a href="mailto:support@fastrill.com" className="footer-btn">
            Contact Support →
          </a>
        </div>
      </div>
    </>
  );
}
