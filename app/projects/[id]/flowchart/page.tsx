"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, GitBranch, Terminal, ChevronRight } from "lucide-react"
import { FlowchartRenderer, FlowchartData } from "@/components/flowchart/flowchart-renderer"

interface ProjectData {
  _id: string
  title: string
  githubRepoName?: string
  flowchartData?: string
}

export default function FlowchartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [flowcharts, setFlowcharts] = useState<FlowchartData[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${id}`)
        if (!response.ok) throw new Error("Project not found")

        const data = await response.json()
        setProject(data)

        if (data.flowchartData) {
          try {
            const parsed = JSON.parse(data.flowchartData)
            // Support both array and single object format
            const charts: FlowchartData[] = Array.isArray(parsed) ? parsed : [parsed]
            setFlowcharts(charts)
          } catch {
            setError("Failed to parse flowchart data")
          }
        } else {
          setError("No flowchart data available for this project")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [id])

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-24">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-foreground animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-muted-foreground animate-pulse">
              $ loading flowchart...
            </span>
          </div>
        </div>
      </main>
    )
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (error || !project) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-24">
          <div className="border border-foreground p-8 text-center max-w-md mx-auto">
            <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="font-mono text-sm text-foreground mb-2">
              $ error: {error || "Project not found"}
            </p>
            <Link
              href={`/projects/${id}`}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mt-4"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to project
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  const activeFlowchart = flowcharts[activeIndex]

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${id}`}
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </Link>
              <span className="text-muted-foreground/30">/</span>
              <span className="font-mono text-xs text-muted-foreground">
                {project.githubRepoName || project.title}
              </span>
              <span className="text-muted-foreground/30">/</span>
              <span className="font-mono text-xs text-foreground font-bold">
                flowchart
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div
        className={`container mx-auto px-6 py-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="h-5 w-5 text-foreground" />
            <h1 className="font-mono text-lg font-bold text-foreground">
              {activeFlowchart?.title || "Architecture Flowchart"}
            </h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            &gt; Interactive architecture diagram for{" "}
            <span className="text-foreground">{project.title}</span>
            {" "}— hover nodes to highlight connections, click for details
          </p>
        </div>

        {/* Tab Selector — Only show if multiple flowcharts */}
        {flowcharts.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-0 border border-foreground inline-flex">
            {flowcharts.map((fc, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`font-mono text-xs px-4 py-2.5 transition-colors uppercase tracking-wider ${
                  idx === activeIndex
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                } ${idx < flowcharts.length - 1 ? "border-r border-foreground" : ""}`}
              >
                <span className="flex items-center gap-1.5">
                  <ChevronRight className={`h-3 w-3 transition-transform ${idx === activeIndex ? "rotate-90" : ""}`} />
                  {fc.title || `Flowchart ${idx + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Flowchart Renderer — Terminal Window Chrome */}
        {activeFlowchart && (
          <div className="border border-foreground overflow-hidden">
            {/* Terminal Title Bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-foreground border-b border-background/20">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-background/30" />
                <span className="w-3 h-3 rounded-full bg-background/20" />
                <span className="w-3 h-3 rounded-full bg-background/10" />
              </div>
              <span className="font-mono text-xs text-background/50 ml-2 flex items-center gap-2">
                <GitBranch className="h-3 w-3" />
                {activeFlowchart.title || "flowchart"}.diagram
                {flowcharts.length > 1 && (
                  <span className="text-background/30 ml-1">
                    [{activeIndex + 1}/{flowcharts.length}]
                  </span>
                )}
              </span>
            </div>

            {/* Renderer */}
            <FlowchartRenderer data={activeFlowchart} />
          </div>
        )}

        {/* Info bar */}
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
            {activeFlowchart?.nodes?.length || 0} nodes · {activeFlowchart?.edges?.length || 0} connections
            {flowcharts.length > 1 && ` · ${flowcharts.length} diagrams`}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/50">
            scroll to zoom · drag to pan · click node for details
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background mt-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-mono text-sm text-muted-foreground">
              {">"} 2026 Manikandan S. All rights reserved.
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Portfolio
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
