"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Mail,
  Folder,
  Trash2,
  Save,
  RefreshCw,
  Terminal,
  Eye,
  EyeOff,
  GripVertical
} from "lucide-react"

interface Message {
  id: string
  name: string
  email: string
  message: string
  is_read: boolean
  created_at: string
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  topics: string[]
}

interface ProjectSettings {
  id?: string
  github_repo_name: string
  is_visible: boolean
  custom_description: string | null
  image_url: string | null
  display_order: number
}

export default function AdminPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [projectSettings, setProjectSettings] = useState<Map<string, ProjectSettings>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        setIsAuthenticated(true)
        fetchData()
      } else {
        window.location.href = "/auth/login"
      }
    } catch (error) {
      console.error("Auth check failed", error)
    } finally {
      setAuthChecking(false)
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch messages from local API
      try {
        const messagesResponse = await fetch("/api/admin/messages")
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          setMessages(messagesData)
        }
      } catch (err) {
        console.error("Failed to fetch messages", err)
      }

      // Fetch GitHub repos
      const response = await fetch("https://api.github.com/users/mani30mk/repos?sort=updated&per_page=50")
      const reposData: GitHubRepo[] = await response.json()
      setRepos(Array.isArray(reposData) ? reposData : [])

      // Fetch project settings from local API
      let settingsData: ProjectSettings[] = []
      try {
        const settingsResponse = await fetch("/api/projects")
        if (settingsResponse.ok) {
          const rawProjects = await settingsResponse.json()
          settingsData = rawProjects.map((p: any) => ({
            id: p._id,
            github_repo_name: p.githubRepoName || p.title,
            is_visible: p.isVisible,
            custom_description: p.description,
            image_url: p.imageUrl,
            display_order: p.displayOrder || 0
          }))
        }
      } catch (err) {
        console.error("Failed to fetch settings", err)
      }

      const settingsMap = new Map<string, ProjectSettings>()
      settingsData.forEach((s: ProjectSettings) => settingsMap.set(s.github_repo_name, s))

      // Initialize settings for repos that don't have them
      if (Array.isArray(reposData)) {
        reposData.forEach((repo, index) => {
          if (!settingsMap.has(repo.name)) {
            settingsMap.set(repo.name, {
              github_repo_name: repo.name,
              is_visible: false,
              custom_description: null,
              image_url: null,
              display_order: index,
            })
          }
        })
      }

      setProjectSettings(settingsMap)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteMessage(id: string) {
    try {
      await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setMessages(messages.filter((m) => m.id !== id))
    } catch (error) {
      console.error("Failed to delete message", error)
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setMessages(messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)))
    } catch (error) {
      console.error("Failed to mark message as read", error)
    }
  }

  function toggleVisibility(repoName: string) {
    const settings = projectSettings.get(repoName)
    if (settings) {
      const newSettings = new Map(projectSettings)
      newSettings.set(repoName, { ...settings, is_visible: !settings.is_visible })
      setProjectSettings(newSettings)
    }
  }

  function updateDescription(repoName: string, description: string) {
    const settings = projectSettings.get(repoName)
    if (settings) {
      const newSettings = new Map(projectSettings)
      newSettings.set(repoName, { ...settings, custom_description: description || null })
      setProjectSettings(newSettings)
    }
  }

  function updateImageURL(repoName: string, url: string) {
    const settings = projectSettings.get(repoName)
    if (settings) {
      const newSettings = new Map(projectSettings)
      newSettings.set(repoName, { ...settings, image_url: url || null })
      setProjectSettings(newSettings)
    }
  }

  async function handleImageUpload(repoName: string, file: File) {
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      if (data.url) {
        updateImageURL(repoName, data.url)
      }
    } catch (error: any) {
      console.error("Error uploading image:", error)
      alert(error.message || "Failed to upload image. Please use an external URL.")
    }
  }

  function updateDisplayOrder(repoName: string, order: number) {
    const settings = projectSettings.get(repoName)
    if (settings) {
      const newSettings = new Map(projectSettings)
      newSettings.set(repoName, { ...settings, display_order: order })
      setProjectSettings(newSettings)
    }
  }

  async function saveProjectSettings() {
    setSaving(true)
    try {
      // Get all settings and map to API schema
      const projectsToSave = Array.from(projectSettings.values()).map(settings => {
        const repo = repos.find(r => r.name === settings.github_repo_name);
        return {
          title: settings.github_repo_name,
          description: settings.custom_description || repo?.description || "No description",
          imageUrl: settings.image_url || null,
          technologies: repo?.topics || [], // Map topics to technologies
          githubUrl: repo?.html_url,
          githubRepoName: settings.github_repo_name,
          isVisible: settings.is_visible,
          displayOrder: settings.display_order
        };
      });

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectsToSave),
      })

      if (response.ok) {
        alert("Settings saved successfully!")
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  if (authChecking) {
    return <div className="min-h-screen flex items-center justify-center font-mono">Loading...</div>
  }

  if (!isAuthenticated) {
    return null // Redirecting
  }

  const visibleProjects = Array.from(projectSettings.entries())
    .filter(([, settings]) => settings.is_visible)
    .sort((a, b) => a[1].display_order - b[1].display_order)

  const unreadCount = messages.filter((m) => !m.is_read).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-foreground text-background">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="h-6 w-6" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/"}
                className="font-mono text-xs uppercase border-background text-background hover:bg-background hover:text-foreground"
              >
                View Site
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="font-mono text-xs uppercase"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="projects" className="font-mono text-sm uppercase gap-2">
              <Folder className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="messages" className="font-mono text-sm uppercase gap-2">
              <Mail className="h-4 w-4" />
              Messages {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-lg font-bold uppercase tracking-wider">
                Inbox Messages
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="font-mono text-xs uppercase bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-border p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="border border-border p-8 text-center">
                <p className="font-mono text-muted-foreground">No messages yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`border p-4 ${msg.is_read
                      ? "border-border bg-background"
                      : "border-foreground bg-muted"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {msg.name} ({msg.email})
                          </span>
                          {!msg.is_read && (
                            <span className="font-mono text-xs bg-foreground text-background px-2 py-0.5">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {msg.message}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground mt-2">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!msg.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(msg.id)}
                            className="font-mono text-xs"
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMessage(msg.id)}
                          className="font-mono text-xs text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-lg font-bold uppercase tracking-wider">
                GitHub Projects Visibility
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  className="font-mono text-xs uppercase bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={saveProjectSettings}
                  disabled={saving}
                  className="font-mono text-xs uppercase bg-foreground text-background hover:bg-foreground/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Visible Projects Preview */}
            {visibleProjects.length > 0 && (
              <div className="border border-foreground bg-muted p-4">
                <h3 className="font-mono text-sm font-bold uppercase mb-3">
                  Currently Visible ({visibleProjects.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {visibleProjects.map(([name]) => (
                    <span
                      key={name}
                      className="font-mono text-xs bg-foreground text-background px-2 py-1"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border border-border p-4 animate-pulse">
                    <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {repos.map((repo, index) => {
                  const settings = projectSettings.get(repo.name)
                  return (
                    <div
                      key={repo.id}
                      className={`border p-4 ${settings?.is_visible
                        ? "border-foreground bg-muted"
                        : "border-border bg-background"
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 pt-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            checked={settings?.is_visible || false}
                            onCheckedChange={() => toggleVisibility(repo.name)}
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center gap-2">
                            {settings?.is_visible ? (
                              <Eye className="h-4 w-4 text-foreground" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                            <h3 className="font-mono text-sm font-bold">
                              {repo.name}
                            </h3>
                            {repo.language && (
                              <span className="font-mono text-xs text-muted-foreground border border-border px-2 py-0.5">
                                {repo.language}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {repo.description || "No description"}
                          </p>

                          {settings?.is_visible && (
                            <div className="space-y-4 pt-4 border-t border-border mt-4">
                              <div className="grid gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                  Custom Description (optional)
                                </label>
                                <Input
                                  value={settings?.custom_description || ""}
                                  onChange={(e) => updateDescription(repo.name, e.target.value)}
                                  placeholder="Override the GitHub description..."
                                  className="font-mono text-sm"
                                />
                              </div>

                              <div className="grid gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                  Project Image (Upload or URL)
                                </label>
                                <div className="flex gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleImageUpload(repo.name, file)
                                    }}
                                    className="font-mono text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-foreground file:text-background hover:file:bg-foreground/90 cursor-pointer"
                                  />
                                </div>
                                <Input
                                  value={settings?.image_url || ""}
                                  onChange={(e) => updateImageURL(repo.name, e.target.value)}
                                  placeholder="https://example.com/image.jpg"
                                  className="font-mono text-sm mt-1"
                                />
                                {settings?.image_url && (
                                  <div className="relative w-full h-32 bg-muted mt-2 rounded-md overflow-hidden border border-border">
                                    <img
                                      src={settings.image_url}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                  Display Order:
                                </label>
                                <Input
                                  type="number"
                                  value={settings?.display_order || index}
                                  onChange={(e) => updateDisplayOrder(repo.name, parseInt(e.target.value) || 0)}
                                  className="font-mono text-sm w-20"
                                  min={0}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
