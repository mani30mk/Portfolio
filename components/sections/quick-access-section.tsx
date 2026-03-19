import { Github, Linkedin, Code, Mail } from "lucide-react"
import Link from "next/link"

const quickLinks = [
  {
    label: "GITHUB",
    href: "https://github.com/mani30mk/",
    icon: Github,
    external: true,
  },
  {
    label: "LINKEDIN",
    href: "https://www.linkedin.com/in/manikandan1007/",
    icon: Linkedin,
    external: true,
  },
  {
    label: "SKILLS",
    href: "#skills",
    icon: Code,
    external: false,
  },
  {
    label: "CONTACT",
    href: "#contact",
    icon: Mail,
    external: false,
  },
]

export function QuickAccessSection() {
  return (
    <section className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-6">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground mb-6">
          Quick Access
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 border border-foreground">
          {quickLinks.map((link, index) => (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className={`flex items-center justify-between px-6 py-4 font-mono text-sm uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors ${index !== quickLinks.length - 1 ? "border-r border-foreground" : ""
                }`}
            >
              <span>{link.label}</span>
              <link.icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
