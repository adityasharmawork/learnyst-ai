"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Zap } from "lucide-react"

interface CheatsheetRendererProps {
  content: string
}

export function CheatsheetRenderer({ content }: CheatsheetRendererProps) {
  const parseCheatsheet = (text: string) => {
    const sections = text.split(/^## /gm).filter(Boolean)

    return sections.map((section, index) => {
      const lines = section.split("\n").filter(Boolean)
      const title = lines[0].replace(/^#+\s*/, "").replace(/^[🎯📐🔄✅🧠⚡]\s*/u, "")
      const emoji = lines[0].match(/^[🎯📐🔄✅🧠⚡]/u)?.[0] || "📋"
      const content = lines.slice(1)

      return { title, emoji, content, index }
    })
  }

  const renderContent = (content: string[]) => {
    return content
      .map((line, idx) => {
        // Handle table format
        if (line.includes("|") && line.split("|").length >= 3) {
          const cells = line
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)

          // Skip table header separators
          if (cells.every((cell) => cell.match(/^-+$/))) {
            return null
          }

          if (cells.length >= 3) {
            return (
              <div key={idx} className="cheatsheet-item bg-card/50 border border-border/30 rounded-lg p-4 mb-3">
                <div className="font-semibold neon-accent text-base mb-1">{cells[0]}</div>
                <div className="text-sm text-foreground/80 mb-2">{cells[1]}</div>
                <div className="text-xs text-muted-foreground">{cells[2]}</div>
              </div>
            )
          }
        }

        // Handle bullet points
        if (line.startsWith("•") || line.startsWith("-")) {
          const text = line.replace(/^[•-]\s*/, "")
          const isPositive = text.includes("DO:")
          const isNegative = text.includes("DON'T:")

          // Clean HTML tags and render properly
          const cleanText = text.replace(/<strong>(.*?)<\/strong>/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1")

          return (
            <div
              key={idx}
              className="flex items-start space-x-3 cheatsheet-item bg-card/30 border border-border/20 rounded-lg p-3 mb-2"
            >
              {isPositive && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
              {isNegative && <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              {!isPositive && !isNegative && <Zap className="w-4 h-4 neon-accent mt-0.5 flex-shrink-0" />}
              <span className="text-sm text-foreground/90">{cleanText}</span>
            </div>
          )
        }

        // Handle numbered lists
        if (/^\d+\./.test(line)) {
          const cleanText = line.replace(/<strong>(.*?)<\/strong>/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1")
          return (
            <div key={idx} className="cheatsheet-item bg-card/30 border border-border/20 rounded-lg p-3 mb-2">
              <span className="text-sm text-foreground/90">{cleanText}</span>
            </div>
          )
        }

        // Handle bold text and clean HTML tags
        if (line.includes("**") || line.includes("<strong>")) {
          const cleanText = line
            .replace(/<strong>(.*?)<\/strong>/g, '<span class="font-semibold neon-accent">$1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold neon-accent">$1</span>')

          return (
            <div key={idx} className="cheatsheet-item bg-card/30 border border-border/20 rounded-lg p-3 mb-2">
              <span className="text-sm text-foreground/90" dangerouslySetInnerHTML={{ __html: cleanText }} />
            </div>
          )
        }

        // Regular text
        if (line.trim()) {
          return (
            <div key={idx} className="text-sm text-muted-foreground mb-2 p-2">
              {line}
            </div>
          )
        }

        return null
      })
      .filter(Boolean)
  }

  const sections = parseCheatsheet(content)

  return (
    <div className="cheatsheet-content space-y-6">
      {sections.map((section) => (
        <Card key={section.index} className="learning-card-premium">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl">{section.emoji}</span>
              <h3 className="text-lg font-semibold neon-accent">{section.title}</h3>
            </div>

            <div className="space-y-3">{renderContent(section.content)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
