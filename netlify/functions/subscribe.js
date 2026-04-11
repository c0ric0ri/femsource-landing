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
    console.error('Invalid email:', email);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUB_ID;

  console.log('API key present:', !!BEEHIIV_API_KEY);
  console.log('Pub ID present:', !!BEEHIIV_PUB_ID);
  console.log('Pub ID value:', BEEHIIV_PUB_ID);
  console.log('Submitting email:', email);

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    console.error('Missing environment variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const payload = {
    email,
    reactivate_existing: true,
    send_welcome_email: false
  };

  try {
    const url = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`;
    console.log('Calling URL:', url);

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
    console.log('Beehiiv response:', JSON.stringify(result));

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Subscription failed', detail: result })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Fetch error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
