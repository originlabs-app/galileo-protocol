import { codeToHtml, type ThemeRegistrationAny } from 'shiki'
import galileoTheme from '@/lib/galileo-theme.json'

interface CodeBlockProps {
  code: string
  lang: 'typescript' | 'solidity' | 'json'
  filename?: string
}

export async function CodeBlock({ code, lang, filename }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang,
    theme: galileoTheme as ThemeRegistrationAny,
  })

  return (
    <div className="code-block">
      {filename && (
        <div className="text-xs text-[#6B6B7B] mb-2 font-mono">{filename}</div>
      )}
      <div
        className="[&>pre]:bg-transparent [&>pre]:p-0 [&>pre]:m-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
