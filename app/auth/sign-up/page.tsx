"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SignUpPage() {
  const [email, setEmail] = useState("maniofficial.ac.in")
  const [password, setPassword] = useState("password123")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/admin`,
        },
      })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-foreground bg-background p-8">
          <div className="flex items-center gap-2 mb-6 border-b border-foreground pb-4">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-foreground/30" />
            </div>
            <span className="text-xs text-muted-foreground font-mono">signup ~ success</span>
          </div>
          
          <h1 className="font-mono text-2xl font-bold text-foreground mb-4">
            $ account_created
          </h1>
          
          <p className="text-muted-foreground font-mono text-sm mb-6">
            Check your email to confirm your account, then you can log in.
          </p>
          
          <Link href="/auth/login">
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-mono">
              GO TO LOGIN
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-foreground bg-background p-8">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 mb-6 border-b border-foreground pb-4">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-foreground/30" />
            <div className="w-3 h-3 rounded-full bg-foreground/30" />
          </div>
          <span className="text-xs text-muted-foreground font-mono">signup ~ bash</span>
        </div>

        <h1 className="font-mono text-2xl font-bold text-foreground mb-2">
          $ create_admin
        </h1>
        <p className="text-muted-foreground font-mono text-sm mb-6">
          Create your admin account
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-sm text-foreground">
              {">"} email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono bg-background border-foreground focus:ring-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono text-sm text-foreground">
              {">"} password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono bg-background border-foreground focus:ring-foreground"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-500 font-mono text-sm border border-red-500 p-2">
              ERROR: {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 font-mono"
          >
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-foreground font-mono text-sm underline"
          >
            Already have an account? Login
          </Link>
        </div>
        
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground font-mono text-sm underline"
          >
            Back to Portfolio
          </Link>
        </div>
      </div>
    </div>
  )
}
