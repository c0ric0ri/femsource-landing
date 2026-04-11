exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const email = (data.email || '').trim();
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const BEEHIIV_API_KEY   = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID    = process.env.BEEHIIV_PUB_ID;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    console.error('Missing Beehiiv environment variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  // Build custom fields from form data
  const customFields = [];
  if (data.question) {
    customFields.push({ name: 'Health Question', value: data.question });
  }
  if (data.topics && data.topics.length) {
    customFields.push({ name: 'Topics', value: data.topics.join(', ') });
  }
  if (data.hcp) {
    customFields.push({ name: 'Works with OB-GYN', value: data.hcp });
  }
  if (data.age) {
    customFields.push({ name: 'Age Range', value: data.age });
  }
  if (data.location) {
    customFields.push({ name: 'Location', value: data.location });
  }

  const payload = {
    email,
    reactivate_existing: false,
    send_welcome_email: true,
    utm_source: 'landing_page',
    utm_medium: 'waitlist_form',
    custom_fields: customFields
  };

  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Beehiiv error:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Subscription failed' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
