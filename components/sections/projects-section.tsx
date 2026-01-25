"use client"

import { useEffect, useState } from "react"
import { Folder, ExternalLink, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"


interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  topics: string[]
  language: string | null
  stargazers_count: number
  forks_count: number
}

interface ProjectSettings {
  github_repo_name: string
  is_visible: boolean
  custom_description: string | null
  image_url: string | null
  display_order: number
}

interface Project extends GitHubRepo {
  custom_description?: string | null
  image_url?: string | null
}

export function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("/api/projects?visible=true")
        if (response.ok) {
          const data = await response.json()
          // Map DB keys to component expected keys (component expects Project interface which extends GitHubRepo somewhat)
          // Actually, let's just map the DB response to what the UI needs directly.
          // The UI uses: name (title), custom_description/description, image_url, topics/technologies, html_url (githubUrl), homepage (link)

          const mappedProjects = data.map((p: any) => ({
            id: p._id,
            name: p.title || p.githubRepoName,
            full_name: p.githubRepoName,
            description: p.description, // DB description is the effective one
            custom_description: null, // processed in DB
            html_url: p.githubUrl,
            homepage: p.link,
            topics: p.technologies || [],
            language: null, // or store in DB? DB doesn't have language field yet, maybe add if needed or rely on topics
            image_url: p.imageUrl,
            stargazers_count: 0, // Not stored
            forks_count: 0 // Not stored
          }))
          setProjects(mappedProjects)
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Generate placeholder images based on project name
  const getProjectImage = (project: Project, index: number) => {
    if (project.image_url) return project.image_url

    const images = [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1550439062-609e1531270e?w=600&h=400&fit=crop",
    ]
    return images[index % images.length]
  }

  return (
    <section id="projects" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-3 mb-12">
          <Folder className="h-6 w-6 text-foreground" />
          <h2 className="text-4xl font-mono font-bold text-foreground">/PROJECTS</h2>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-border animate-pulse">
                <div className="h-56 bg-muted" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-mono">
            No projects configured. Visit the admin panel to select which projects to display.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="border border-foreground bg-background overflow-hidden group"
              >
                {/* Project Image */}
                <div className="relative h-56 bg-muted overflow-hidden">
                  {/* Window Controls */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="w-3 h-3 rounded-full bg-foreground/60" />
                    <span className="w-3 h-3 rounded-full bg-foreground/40" />
                  </div>

                  {/* Timestamp */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="font-mono text-xs text-foreground/60 bg-background/80 px-2 py-1">
                      {project.language || "Code"}
                    </span>
                  </div>

                  <Image
                    src={getProjectImage(project, index) || "/placeholder.svg"}
                    alt={project.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>

                {/* Project Info */}
                <div className="p-6">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.topics?.slice(0, 4).map((topic) => (
                      <span
                        key={topic}
                        className="font-mono text-xs border border-foreground px-2 py-0.5 uppercase"
                      >
                        {topic}
                      </span>
                    ))}
                    {(!project.topics || project.topics.length === 0) && project.language && (
                      <span className="font-mono text-xs border border-foreground px-2 py-0.5 uppercase">
                        {project.language}
                      </span>
                    )}
                  </div>

                  <h3 className="font-mono text-xl font-bold text-foreground mb-2">
                    {project.name.replace(/-/g, " ").replace(/_/g, " ")}
                  </h3>

                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                    {project.custom_description || project.description || "A project showcasing various programming concepts and technologies."}
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs uppercase tracking-wider border-foreground text-foreground hover:bg-foreground hover:text-background bg-transparent"
                      asChild
                    >
                      <a href={project.html_url} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-3 w-3" />
                        Repo/Source
                      </a>
                    </Button>
                    {project.homepage && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs uppercase tracking-wider border-foreground text-foreground hover:bg-foreground hover:text-background bg-transparent"
                        asChild
                      >
                        <a href={project.homepage} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Demo
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
