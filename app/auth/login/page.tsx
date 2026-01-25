"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Terminal } from "lucide-react"

export default function Page() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      router.push("/admin")
      router.refresh() // Refresh to update middleware/server components
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Terminal className="h-8 w-8 text-foreground" />
            </div>
            <h1 className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground">
              Admin Access
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              {">"} Authentication required
            </p>
          </div>

          {/* Login Form */}
          <div className="border border-foreground bg-background p-6">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
              <span className="text-muted-foreground font-mono text-xs">{"// "}</span>
              <span className="font-mono text-xs uppercase tracking-wider">
                System Login
              </span>
            </div>

            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="font-mono text-xs uppercase tracking-wider">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="font-mono text-sm border-foreground bg-background"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono text-sm border-foreground bg-background"
                  />
                </div>
                {error && (
                  <p className="font-mono text-xs text-destructive bg-destructive/10 p-2 border border-destructive">
                    {">"} Error: {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full font-mono uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Authenticating..." : "Access Terminal"}
                </Button>
              </div>
            </form>
          </div>

          {/* Back to site */}
          <div className="text-center">
            <Link
              href="/"
              className="font-mono text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              {"<"} Back to portfolio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
