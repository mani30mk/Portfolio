import { HeroSection } from "@/components/sections/hero-section"
import { QuickAccessSection } from "@/components/sections/quick-access-section"
import { SkillsSection } from "@/components/sections/skills-section"
import { ProjectsSection } from "@/components/sections/projects-section"
import { ContactSection } from "@/components/sections/contact-section"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <QuickAccessSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />

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
