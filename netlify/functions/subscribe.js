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
    console.error('Missing environment variables');
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

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('Fetch error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
