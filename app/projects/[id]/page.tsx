"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Github, ExternalLink, Star, GitFork, Calendar, Terminal, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProjectData {
  _id: string
  title: string
  description: string
  imageUrl?: string
  technologies: string[]
  link?: string
  githubUrl?: string
  githubRepoName?: string
  demoVideoUrl?: string
  isVisible: boolean
  displayOrder: number
  createdAt: string
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${id}`)
        if (!response.ok) {
          throw new Error("Project not found")
        }
        const data = await response.json()
        setProject(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [id])

  // Trigger entrance animation
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-20">
          {/* Skeleton loader */}
          <div className="animate-pulse space-y-8">
            <div className="h-4 bg-muted w-40" />
            <div className="h-12 bg-muted w-3/4" />
            <div className="h-24 bg-muted w-full" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-muted border border-border" />
              <div className="h-24 bg-muted border border-border" />
              <div className="h-24 bg-muted border border-border" />
            </div>
            <div className="h-96 bg-muted border border-border" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="bg-foreground rounded-lg overflow-hidden inline-block">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/10 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/50" />
                <div className="w-3 h-3 rounded-full bg-warning/50" />
                <div className="w-3 h-3 rounded-full bg-success/50" />
              </div>
              <span className="text-xs text-background/60 font-mono ml-2">error</span>
            </div>
            <div className="p-8 font-mono text-background">
              <p className="text-lg">$ cat project</p>
              <p className="text-background/60 mt-2">&gt; Error: {error || "Project not found"}</p>
            </div>
          </div>
          <div>
            <Link
              href="/"
              className="font-mono text-sm uppercase tracking-wider text-foreground border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors inline-block"
            >
              <ArrowLeft className="inline mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const formattedDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm font-bold text-foreground hover:text-muted-foreground transition-colors"
          >
            {project.title}
          </Link>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Projects
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div
        className="container mx-auto px-6 py-12 max-w-5xl"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        {/* Project Header */}
        <section className="mb-12">
          {/* Breadcrumb */}
          <div className="font-mono text-xs text-muted-foreground mb-8 flex items-center gap-2">
            <Link href="/" className="hover:text-foreground transition-colors">~</Link>
            <span>/</span>
            <Link href="/" className="hover:text-foreground transition-colors">projects</Link>
            <span>/</span>
            <span className="text-foreground">{project.githubRepoName || project.title}</span>
          </div>

          {/* Title */}
          <h1 className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            <span className="text-muted-foreground">$ </span>
            {project.title}
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {project.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-8">
            {project.githubUrl && (
              <Button
                variant="outline"
                className="font-mono text-xs uppercase tracking-wider border-foreground text-foreground hover:bg-foreground hover:text-background bg-transparent"
                asChild
              >
                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  View Source
                </a>
              </Button>
            )}
            {project.link && (
              <Button
                className="font-mono text-xs uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90"
                asChild
              >
                <a href={project.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Live Demo
                </a>
              </Button>
            )}
          </div>
        </section>

        {/* Tech Stack */}
        {project.technologies && project.technologies.length > 0 && (
          <section className="mb-12">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
              &gt; Tech Stack
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="font-mono text-xs border border-foreground px-3 py-1.5 uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors cursor-default"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Stats Row */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-foreground">
            <div className="flex flex-col items-center justify-center py-6 px-4 border-b sm:border-b-0 sm:border-r border-foreground">
              <Star className="h-5 w-5 text-muted-foreground mb-2" />
              <span className="font-mono text-2xl font-bold text-foreground">
                {project.githubRepoName ? "★" : "—"}
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Open Source
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 px-4 border-b sm:border-b-0 sm:border-r border-foreground">
              <GitFork className="h-5 w-5 text-muted-foreground mb-2" />
              <span className="font-mono text-2xl font-bold text-foreground">
                {project.technologies?.length || 0}
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Technologies
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 px-4">
              <Calendar className="h-5 w-5 text-muted-foreground mb-2" />
              <span className="font-mono text-sm font-bold text-foreground">
                {formattedDate}
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Created
              </span>
            </div>
          </div>
        </section>



        {/* Demo Video */}
        {project.demoVideoUrl && (
          <section className="mb-12">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Project Demo
            </h2>
            <div className="border border-foreground overflow-hidden bg-foreground">
              {/* Terminal-style Window Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-background/20">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-background/30" />
                  <span className="w-3 h-3 rounded-full bg-background/20" />
                  <span className="w-3 h-3 rounded-full bg-background/10" />
                </div>
                <span className="font-mono text-xs text-background/50 ml-2 flex items-center gap-2">
                  <Play className="h-3 w-3" />
                  {project.githubRepoName ? `${project.githubRepoName}_demo` : "project_demo"}
                  {project.demoVideoUrl.endsWith(".mp4") ? ".mp4" : ".webm"}
                </span>
              </div>
              {/* Video Player */}
              <div className="relative bg-black">
                <video
                  controls
                  preload="metadata"
                  className="w-full aspect-video"
                  poster={project.imageUrl || undefined}
                >
                  <source
                    src={project.demoVideoUrl}
                    type={project.demoVideoUrl.endsWith(".mp4") ? "video/mp4" : "video/webm"}
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
              {/* Video info bar */}
              <div className="px-4 py-2 border-t border-background/20">
                <span className="font-mono text-xs text-background/40">
                  &gt; Demo video showcasing {project.title} in action
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Back to projects CTA */}
        <section className="py-12 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-mono text-sm text-muted-foreground">
                &gt; Explore more of my work
              </p>
            </div>
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-wider text-foreground border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-3 w-3" />
              All Projects
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background">
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
