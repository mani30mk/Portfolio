import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Message from '@/models/Message'
import { cookies } from 'next/headers'

// GET - List messages
export async function GET(request: NextRequest) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        await dbConnect()
        const messages = await Message.find({}).sort({ createdAt: -1 })

        // Map _id to id for frontend compatibility
        const formattedMessages = messages.map(m => ({
            id: m._id,
            name: m.name,
            email: m.email,
            message: m.message,
            is_read: m.is_read,
            created_at: m.createdAt
        }))

        return NextResponse.json(formattedMessages)
    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Delete a message
export async function DELETE(request: NextRequest) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await request.json()
        await dbConnect()
        await Message.findByIdAndDelete(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}

// PATCH - Mark as read
export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await request.json()
        await dbConnect()
        await Message.findByIdAndUpdate(id, { is_read: true })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
