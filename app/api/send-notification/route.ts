// app/api/send-notification/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role, type, link, tournamentId } = body;

    // You will need to install an email provider like Resend: 
    // npm install resend
    
    /* import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    */

    if (type === 'direct_add') {
      // Send: "You've been added to a tournament as a Scorer!"
      console.log(`Sending Direct Add email to ${email}`);
      /*
      await resend.emails.send({
        from: 'CricSync <noreply@cricsync.com>',
        to: email,
        subject: 'You have been added to a tournament!',
        html: `<p>You are now a ${role} for this tournament. Log in to your dashboard to view it.</p>`
      });
      */
    } else if (type === 'new_invite') {
      // Send: "You've been invited! Click here to create your account."
      console.log(`Sending Invite Link to ${email}: ${link}`);
      /*
      await resend.emails.send({
        from: 'CricSync <noreply@cricsync.com>',
        to: email,
        subject: 'Tournament Invitation',
        html: `<p>You've been invited as a ${role}. Click <a href="${link}">here</a> to create your account and accept.</p>`
      });
      */
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}