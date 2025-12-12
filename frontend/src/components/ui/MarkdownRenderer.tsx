import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renderiza markdown básico em HTML.
 * Suporta: **bold**, *italic*, [links](url), - listas, `code`
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let listItems: string[] = []
    let inList = false

    const processLine = (line: string): React.ReactNode => {
      // Processa inline elements
      let processed: React.ReactNode[] = []
      let remaining = line
      let key = 0

      // Links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let lastIndex = 0
      let match

      while ((match = linkRegex.exec(remaining)) !== null) {
        // Texto antes do link
        if (match.index > lastIndex) {
          processed.push(
            <span key={key++}>
              {processInlineStyles(remaining.slice(lastIndex, match.index))}
            </span>
          )
        }
        // O link
        processed.push(
          <a
            key={key++}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {match[1]}
          </a>
        )
        lastIndex = match.index + match[0].length
      }

      // Resto do texto
      if (lastIndex < remaining.length) {
        processed.push(
          <span key={key++}>
            {processInlineStyles(remaining.slice(lastIndex))}
          </span>
        )
      }

      return processed.length > 0 ? processed : processInlineStyles(line)
    }

    const processInlineStyles = (text: string): React.ReactNode => {
      // Bold **text**
      let parts = text.split(/\*\*([^*]+)\*\*/g)
      if (parts.length > 1) {
        return parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : processItalic(part)
        )
      }
      return processItalic(text)
    }

    const processItalic = (text: string): React.ReactNode => {
      // Italic *text*
      const parts = text.split(/\*([^*]+)\*/g)
      if (parts.length > 1) {
        return parts.map((part, i) => 
          i % 2 === 1 ? <em key={i}>{part}</em> : processCode(part)
        )
      }
      return processCode(text)
    }

    const processCode = (text: string): React.ReactNode => {
      // Code `text`
      const parts = text.split(/`([^`]+)`/g)
      if (parts.length > 1) {
        return parts.map((part, i) => 
          i % 2 === 1 ? (
            <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              {part}
            </code>
          ) : part
        )
      }
      return text
    }

    lines.forEach((line, index) => {
      const trimmed = line.trim()

      // Lista com -
      if (trimmed.startsWith('- ')) {
        if (!inList) {
          inList = true
          listItems = []
        }
        listItems.push(trimmed.slice(2))
      } else {
        // Fecha lista anterior se houver
        if (inList && listItems.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2">
              {listItems.map((item, i) => (
                <li key={i}>{processLine(item)}</li>
              ))}
            </ul>
          )
          listItems = []
          inList = false
        }

        // Linha normal
        if (trimmed) {
          elements.push(
            <p key={index} className="my-1">
              {processLine(trimmed)}
            </p>
          )
        } else if (index > 0 && index < lines.length - 1) {
          // Linha em branco (espaçamento)
          elements.push(<br key={index} />)
        }
      }
    })

    // Fecha lista final se houver
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, i) => (
            <li key={i}>{processLine(item)}</li>
          ))}
        </ul>
      )
    }

    return elements
  }

  return (
    <div className={`markdown-content ${className}`}>
      {renderMarkdown(content)}
    </div>
  )
}

