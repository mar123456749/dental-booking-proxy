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
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    console.log('📥 Received from ElevenLabs:', JSON.stringify(data, null, 2));
    console.log('📊 Data types:', {
      startType: typeof data.start,
      nameType: typeof data['responses.name'],
      emailType: typeof data['responses.email'],
      phoneType: typeof data['responses.phone']
    });

    // Validate basic structure
    if (!data || typeof data !== 'object') {
      console.log('❌ Invalid data structure');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Transform ElevenLabs flat structure to Cal.com nested structure
    const calcomPayload = {
      eventTypeId: parseInt(data.eventTypeId) || 3921180,
      start: data.start,
      timeZone: (data.timeZone || 'Europe/Kiev').trim(),
      language: data.language || 'uk',
      metadata: {},
      responses: {
        name: data['responses.name'] || data.name,
        email: (data['responses.email'] === 'null' || !data['responses.email'] || data['responses.email'] === null) 
               ? 'appointments@dental-clinic.com' 
               : data['responses.email'] || data.email,
        phone: (data['responses.phone'] === 'null' || data['responses.phone'] === null) 
               ? undefined 
               : (data['responses.phone'] || data['responses.phon'] || data.phone)
      }
    };

    // Detailed validation
    console.log('🔍 Validation checks:');
    console.log('- Start time present:', !!calcomPayload.start);
    console.log('- Start time format:', calcomPayload.start);
    console.log('- Name present:', !!calcomPayload.responses.name);
    console.log('- Email present:', !!calcomPayload.responses.email);
    console.log('- Email format valid:', /\S+@\S+\.\S+/.test(calcomPayload.responses.email));

    // Validate required fields
    if (!calcomPayload.start) {
      console.log('❌ Missing start time');
      return res.status(400).json({ error: 'Missing start time' });
    }
    if (!calcomPayload.responses.name) {
      console.log('❌ Missing client name');
      return res.status(400).json({ error: 'Missing client name' });
    }
    if (!calcomPayload.responses.email) {
      console.log('❌ Missing client email');
      return res.status(400).json({ error: 'Missing client email' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(calcomPayload.start)) {
      console.log('❌ Invalid date format:', calcomPayload.start);
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DDTHH:MM:SS.000Z' });
    }

    console.log('📤 Sending to Cal.com:', JSON.stringify(calcomPayload, null, 2));

    // Get API key from environment variables
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) {
      console.log('❌ Missing API key');
      return res.status(500).json({ error: 'Cal.com API key not configured' });
    }

    // Forward to Cal.com API
    console.log('🌐 Calling Cal.com API...');
    const calcomResponse = await fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calcomPayload)
    });

    const result = await calcomResponse.json();
    console.log('📨 Cal.com response status:', calcomResponse.status);
    console.log('📨 Cal.com response:', JSON.stringify(result, null, 2));
    
    if (!calcomResponse.ok) {
      console.error('❌ Cal.com error:', result);
      return res.status(calcomResponse.status).json(result);
    }

    console.log('✅ Success:', result.id);
    
    // Return success response for ElevenLabs
    return res.status(200).json({
      success: true,
      message: `Appointment booked successfully for ${calcomPayload.responses.name}`,
      bookingId: result.id,
      appointmentTime: calcomPayload.start
    });

  } catch (error) {
    console.error('💥 Server error:', error.message);
    console.error('💥 Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}
