import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { promises as fs } from 'fs'
import path from 'path'

const MESSAGES_FILE = path.join(process.cwd(), 'data', 'messages.json')

interface ContactMessage {
    id: string
    name: string
    email: string
    message: string
    is_read: boolean
    created_at: string
}

async function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data')
    try {
        await fs.access(dataDir)
    } catch {
        await fs.mkdir(dataDir, { recursive: true })
    }
}

async function saveMessage(message: ContactMessage) {
    await ensureDataDir()
    let messages: ContactMessage[] = []
    try {
        const data = await fs.readFile(MESSAGES_FILE, 'utf-8')
        messages = JSON.parse(data)
    } catch {
        messages = []
    }
    messages.push(message)
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2))
}

export async function POST(request: NextRequest) {
    try {
        const { name, email, message } = await request.json()

        // 1. Save to local JSON
        const newMessage: ContactMessage = {
            id: Date.now().toString(),
            name,
            email,
            message,
            is_read: false,
            created_at: new Date().toISOString(),
        }
        await saveMessage(newMessage)

        // 2. Send Email if credentials exist
        const user = process.env.GMAIL_USER
        const pass = process.env.GMAIL_APP_PASSWORD

        console.log(`Attempting to send email. User present: ${!!user}, Pass present: ${!!pass}`)

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
                // Don't fail the request if just email fails, since message is saved
                // But maybe we want to know?
                // For now, let's log it and still return success so user thinks it worked? 
                // Or return a warning? The user *wants* email to work.
                // Let's keep throwing for now to see the error in UI, OR we can return success but log error.
                throw emailError
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
