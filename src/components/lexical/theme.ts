import type { EditorThemeClasses } from 'lexical'

export const editorTheme: EditorThemeClasses = {
  paragraph: 'mb-1',
  heading: {
    h1: 'text-2xl font-bold mb-2',
    h2: 'text-xl font-bold mb-2',
    h3: 'text-lg font-semibold mb-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
  list: {
    ul: 'list-disc ml-4 mb-2',
    ol: 'list-decimal ml-4 mb-2',
    listitem: 'mb-0.5',
    nested: {
      listitem: 'list-none',
    },
  },
}
