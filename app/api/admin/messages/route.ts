import { NextRequest, NextResponse } from 'next/server'
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

async function readMessages(): Promise<ContactMessage[]> {
    try {
        const data = await fs.readFile(MESSAGES_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return []
    }
}

async function saveMessages(messages: ContactMessage[]) {
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2))
}

// GET - List messages
export async function GET(request: NextRequest) {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await readMessages()
    return NextResponse.json(messages)
}

// DELETE - Delete a message
export async function DELETE(request: NextRequest) {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    let messages = await readMessages()
    messages = messages.filter(m => m.id !== id)
    await saveMessages(messages)

    return NextResponse.json({ success: true })
}

// PATCH - Mark as read
export async function PATCH(request: NextRequest) {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    const messages = await readMessages()
    const message = messages.find(m => m.id === id)
    if (message) {
        message.is_read = true
        await saveMessages(messages)
    }

    return NextResponse.json({ success: true })
}
