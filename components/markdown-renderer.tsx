"use client"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^#### (.*$)/gm, "<h4>$1</h4>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
      .replace(/^> (.*$)/gm, "<blockquote>$1</blockquote>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[h|u|o|b|l])/gm, "<p>")
      .replace(/(?<!>)$/gm, "</p>")
      .replace(/<p><\/p>/g, "")
      .replace(/<p>(<[h|u|o|b])/g, "$1")
      .replace(/(<\/[h|u|o|b|l]>)<\/p>/g, "$1")
  }

  return (
    <div className={`markdown-content ${className}`} dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
  )
}
