exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    console.error('JSON parse error:', e);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const email = (data.email || '').trim();
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUB_ID;
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    console.error('Missing Beehiiv environment variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const customFields = [];
  if (data.question) customFields.push({ name: 'Health Question', value: data.question });
  if (data.topics && data.topics.length) customFields.push({ name: 'Topics', value: data.topics.join(', ') });
  if (data.hcp)      customFields.push({ name: 'Works with OB-GYN', value: data.hcp });
  if (data.age)      customFields.push({ name: 'Age Range', value: data.age });
  if (data.location) customFields.push({ name: 'Location', value: data.location });

  const payload = {
    email,
    reactivate_existing: true,
    send_welcome_email: true,
    utm_source: 'landing_page',
    utm_medium: 'waitlist_form',
    custom_fields: customFields
  };

  try {
    const url = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Beehiiv status:', response.status);

    if (!response.ok) {
      console.error('Beehiiv error:', JSON.stringify(result));
      return { statusCode: response.status, body: JSON.stringify({ error: 'Subscription failed' }) };
    }

    // Send notification email via Resend
    const hcpLabel = { yes: 'Yes', no: 'No', looking: 'No, and looking for one' }[data.hcp] || '—';
    const ageLabel = { u25: 'Under 25', '25-34': '25–34', '35-44': '35–44', '45-54': '45–54', '55-64': '55–64', '65+': '65+' }[data.age] || '—';
    const locationLabel = { us: 'United States', international: 'Outside the US' }[data.location] || '—';
    const topicsList = data.topics && data.topics.length ? data.topics.join(', ') : '—';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FemSource Waitlist <onboarding@resend.dev>',
        to: process.env.NOTIFICATION_EMAIL,
        subject: `New waitlist signup — ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
            <h2 style="color:#5C3D8F;margin-bottom:1.5rem;">New FemSource Waitlist Submission</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;width:160px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${email}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;">Health question</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${data.question || '—'}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Topics</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${topicsList}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Sees an OB-GYN?</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${hcpLabel}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Age range</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${ageLabel}</td></tr>
              <tr><td style="padding:10px 0;font-weight:600;">Location</td><td style="padding:10px 0;">${locationLabel}</td></tr>
            </table>
            <p style="margin-top:2rem;font-size:0.85rem;color:#6B6660;">Reply to this email or write directly to <a href="mailto:${email}">${email}</a> to send her research within 72 hours.</p>
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
