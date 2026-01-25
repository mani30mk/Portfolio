"use client"

import React from "react"

import { useState } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"


export function ContactSection() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      })

      if (!response.ok) throw new Error("Failed to send")

      setStatus("success")
      setName("")
      setEmail("")
      setMessage("")

      setTimeout(() => setStatus("idle"), 3000)
    } catch (error) {
      console.error("Error sending message:", error)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-8">
            <Mail className="h-6 w-6 text-foreground" />
            <h2 className="text-4xl font-mono font-bold text-foreground">/CONTACT</h2>
          </div>

          {/* System Log Style */}
          <div className="border border-foreground bg-background p-6 mb-8">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-foreground mb-4">
              SYSTEM LOG
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Stay updated on my latest research and project commits.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="YOUR_NAME"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="font-mono text-sm border-foreground bg-background text-foreground placeholder:text-muted-foreground focus:ring-foreground"
                />
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="YOUR_EMAIL@DOMAIN"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="font-mono text-sm border-foreground bg-background text-foreground placeholder:text-muted-foreground focus:ring-foreground"
                />
              </div>

              <div>
                <textarea
                  placeholder="MESSAGE_CONTENT"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 font-mono text-sm border border-foreground bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-mono uppercase tracking-wider"
              >
                {status === "loading" ? "TRANSMITTING..." :
                  status === "success" ? "MESSAGE SENT!" :
                    status === "error" ? "TRANSMISSION FAILED" :
                      "FOLLOW FEED"}
              </Button>
            </form>
          </div>

          {/* Hardware Specs */}
          <div className="border border-foreground bg-foreground text-background p-6">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
              HARDWARE SPECS
            </h3>
            <ul className="font-mono text-sm space-y-1">
              <li>{">"} OS: Arch Linux</li>
              <li>{">"} Editor: Neovim</li>
              <li>{">"} Shell: Zsh</li>
              <li>{">"} Lang: EN, Tamil</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
