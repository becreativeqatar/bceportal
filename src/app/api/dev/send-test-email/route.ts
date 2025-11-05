import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { to } = await request.json();

    const result = await sendEmail({
      to: to || 'test@example.com',
      subject: 'Be Creative Portal Test Email',
      text: 'This is a test email from Be Creative Portal.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e90ff;">Be Creative Portal Test Email</h1>
          <p>This is a test email from the Be Creative Portal system.</p>
          <p>If you're seeing this in MailHog, the email configuration is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent for testing purposes. No action is required.
          </p>
        </div>
      `,
    });

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Test email sent successfully! Check MailHog at http://localhost:8025'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test email API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test email' 
    }, { status: 500 });
  }
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // Send a simple test email with GET request
  try {
    const result = await sendEmail({
      to: 'admin@yourdomain.com',
      subject: 'Be Creative Portal - Test Email (GET)',
      text: 'This is a simple test email sent via GET request.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e90ff;">Be Creative Portal Test</h1>
          <p>This test email was sent via GET request to verify email functionality.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>Check MailHog at <a href="http://localhost:8025">http://localhost:8025</a></p>
        </div>
      `,
    });

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Test email sent successfully! Check MailHog at http://localhost:8025'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test email API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test email' 
    }, { status: 500 });
  }
}