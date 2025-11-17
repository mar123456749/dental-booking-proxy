// api/booking.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    console.log('📥 Received from ElevenLabs:', data);

    // Transform ElevenLabs flat structure to Cal.com nested structure
    const calcomPayload = {
      eventTypeId: parseInt(data.eventTypeId) || 3921180,
      start: data.start,
      timeZone: (data.timeZone || 'Europe/Kiev').trim(),
      language: data.language || 'uk',
      metadata: {},
      responses: {
        name: data['responses.name'] || data.name,
        email: data['responses.email'] || data.email,
        phone: data['responses.phone'] || data['responses.phon'] || data.phone
      }
    };

    // Validate required fields
    if (!calcomPayload.start) {
      return res.status(400).json({ error: 'Missing start time' });
    }
    if (!calcomPayload.responses.name) {
      return res.status(400).json({ error: 'Missing client name' });
    }
    if (!calcomPayload.responses.email) {
      return res.status(400).json({ error: 'Missing client email' });
    }

    console.log('📤 Sending to Cal.com:', calcomPayload);

    // Get API key from environment variables
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Cal.com API key not configured' });
    }

    // Forward to Cal.com API
    const calcomResponse = await fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calcomPayload)
    });

    const result = await calcomResponse.json();
    
    if (!calcomResponse.ok) {
      console.error('❌ Cal.com error:', result);
      return res.status(calcomResponse.status).json(result);
    }

    console.log('✅ Success:', result);
    
    // Return success response for ElevenLabs
    return res.status(200).json({
      success: true,
      message: `Appointment booked successfully for ${calcomPayload.responses.name}`,
      bookingId: result.id,
      appointmentTime: calcomPayload.start
    });

  } catch (error) {
    console.error('💥 Server error:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}
