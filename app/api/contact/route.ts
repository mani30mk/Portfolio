import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import dbConnect from '@/lib/mongodb'
import Message from '@/models/Message'

export async function POST(request: NextRequest) {
    try {
        const { name, email, message } = await request.json()

        // 1. Save to MongoDB
        await dbConnect()
        await Message.create({
            name,
            email,
            message,
        })

        // 2. Send Email if credentials exist
        const user = process.env.GMAIL_USER
        const pass = process.env.GMAIL_APP_PASSWORD

        if (user && pass) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user,
                        pass,
                    },
                })

                await transporter.sendMail({
                    from: user,
                    to: user, // Send to self
                    subject: `StartUp Portfolio: New Message from ${name}`,
                    text: `
Name: ${name}
Email: ${email}
                    
Message:
${message}
                    `,
                    html: `
<h3>New Portfolio Contact</h3>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Message:</strong></p>
<blockquote>${message}</blockquote>
                    `,
                })
                console.log("Email sent successfully")
            } catch (emailError) {
                console.error("Failed to send email:", emailError)
                // We don't fail the request because DB save was successful
            }
        } else {
            console.warn("Email credentials missing in .env.local")
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Contact error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to send message' },
            { status: 500 }
        )
    }
}
