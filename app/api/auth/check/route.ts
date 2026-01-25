import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const sessionCookie = request.cookies.get('admin_session')

    if (sessionCookie?.value) {
        return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
}
