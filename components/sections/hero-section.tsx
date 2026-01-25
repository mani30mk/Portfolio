"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Github, Download } from "lucide-react"

export function HeroSection() {
  const [terminalLines, setTerminalLines] = useState<string[]>([])

  const fullTerminalContent = [
    "$ whoami",
    "> Manikandan",
    "",
    "$ uptime",
    "> active: up 3 years, 2 semesters",
    "",
    "$ memory",
    "> memory: 3GB / 5GB utilized",
    "",
    "$ status",
    "> status: coding, networking",
    "",
    "Major: BTech Computer Science (IOT)",

  ]

  useEffect(() => {
    let currentLine = 0
    const interval = setInterval(() => {
      if (currentLine < fullTerminalContent.length) {
        setTerminalLines(prev => [...prev, fullTerminalContent[currentLine]])
        currentLine++
      } else {
        clearInterval(interval)
      }
    }, 150)

    return () => clearInterval(interval)
  }, [])

  return (
    <section id="home" className="min-h-screen flex items-center bg-background py-20">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Terminal Intro */}
          <div className="space-y-6">
            <div className="font-mono">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                <span className="text-muted-foreground">$</span> sudo<br />
                whoami
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mt-2">
                Manikandan
              </h2>
            </div>

            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Engineering intelligent, production-ready Machine Learning and Deep Learning applications that bridge data, algorithms, and modern web experiences.
            </p>

            <div className="flex gap-4 pt-4">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 font-mono uppercase tracking-wider"
              >
                <a href="https://github.com/mani30mk/" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  View Repository
                </a>
              </Button>
              <Button
                variant="outline"
                className="border-foreground text-foreground hover:bg-foreground hover:text-background font-mono uppercase tracking-wider bg-transparent"
                asChild
              >
                <a href="/assets/Manikandan_Resume.pdf" target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Resume
                </a>
              </Button>
            </div>
          </div>

          {/* Right Side - Terminal Window */}
          <div className="bg-foreground rounded-lg overflow-hidden shadow-2xl">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted-foreground/20">
              <span className="text-xs text-muted font-mono">mani ~ bash</span>
            </div>

            {/* Terminal Content */}
            <div className="p-6 font-mono text-sm text-background min-h-[320px]">
              {terminalLines.map((line, index) => (
                <div key={index} className="leading-relaxed">
                  {line?.startsWith("$") ? (
                    <span className="text-background/80">{line}</span>
                  ) : line?.startsWith(">") ? (
                    <span className="text-background/60">{line}</span>
                  ) : line?.startsWith("Major:") || line?.startsWith("GPA:") ? (
                    <span className="text-background font-semibold">{line}</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
              ))}
              <span className="inline-block w-2 h-4 bg-background/80 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
