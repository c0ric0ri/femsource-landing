exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const name = (data.name || '').trim();
  if (!name) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name is required' }) };
  }

  const topicsList = data.topics && data.topics.length ? data.topics.join(', ') : '—';

  try {
    // Send notification email via Resend
    // Note: Beehiiv is not used here because this form does not collect an email address —
    // the founding member's email was captured by Stripe at the time of payment.
    // If you want to add founding members to Beehiiv, add an email field to the welcome
    // page form and call the Beehiiv subscriptions API using the same pattern in subscribe.js.
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FemSource Waitlist <onboarding@resend.dev>',
        to: process.env.NOTIFICATION_EMAIL,
        subject: `New Founding Member submission — ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
            <h2 style="color:#3D1F5C;margin-bottom:0.5rem;">New Founding Member Submission</h2>
            <p style="margin-bottom:1.5rem;font-size:0.9rem;color:#6B6660;">
              This person completed payment via Stripe and filled out the founding member follow-up form.
            </p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;width:180px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${name}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;">Health question</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${data.health_question || '—'}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Topics</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${topicsList}</td></tr>
              <tr><td style="padding:10px 0;font-weight:600;vertical-align:top;">Anything else</td><td style="padding:10px 0;">${data.notes || '—'}</td></tr>
            </table>
          </div>
        `,
      }),
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('Fetch error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
