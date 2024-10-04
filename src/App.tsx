import React, { useState, useEffect, useRef } from 'react'
import { Send, Key } from 'lucide-react'
import { Markmap } from 'markmap-view'
import { Transformer } from 'markmap-lib'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const transformer = new Transformer();

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [mindmapContent, setMindmapContent] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && mindmapContent) {
      while (svgRef.current.firstChild) {
        svgRef.current.removeChild(svgRef.current.firstChild);
      }
      const { root } = transformer.transform(mindmapContent);
      Markmap.create(svgRef.current, {
        colorFreezeLevel: 2,
      }, root);
    }
  }, [mindmapContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !apiKey.trim()) return

    const newMessages = [
      ...messages,
      { role: 'user', content: input } as Message
    ]
    setMessages(newMessages)
    setInput('')

    const systemPromptWithMindmap = `${systemPrompt}
    Based on the entire conversation history, create a comprehensive and detailed mind map. Follow these guidelines:

    1. Use the following format for the mind map:
    ---
    title: [Main Topic of the Conversation]
    markmap:
      colorFreezeLevel: 2
    ---

    # [Main Topic]

    ## [Key Concept 1]
    - [Specific Detail 1]
    - [Specific Detail 2]
    - [Specific Detail 3]

    ## [Key Concept 2]
    - [Specific Detail 1]
      - [Sub-detail A]
      - [Sub-detail B]
    - [Specific Detail 2]

    ## [Key Concept 3]
    - [Specific Detail 1]
    - [Specific Detail 2]
      - [Sub-detail A]
      - [Sub-detail B]
      - [Sub-detail C]

    2. Ensure the mind map reflects the key points of the entire conversation.
    3. Use concrete, specific information instead of placeholders or generic terms.
    4. Create at least 3 main branches (Key Concepts) with 2-3 levels of depth each.
    5. Include relevant details, examples, or insights from the conversation.
    6. If the conversation introduces new topics, add them as new main branches.
    7. Update existing branches with new information when the topic is revisited.
    8. Your response should ONLY contain the mind map code, nothing else.

    Current conversation history:
    ${newMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}
    `

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPromptWithMindmap },
            ...newMessages
          ]
        })
      })

      const data = await response.json()
      if (response.ok) {
        const assistantMessage = data.choices[0].message.content
        setMessages([...newMessages, { role: 'assistant', content: 'Mind map updated' }])
        setMindmapContent(assistantMessage)
      } else {
        throw new Error(data.error?.message || 'Unknown error occurred')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${error.message}` }])
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">OpenAI Chat with Detailed Mind Map</h1>
      </header>
      <div className="flex-grow flex p-4 max-w-6xl mx-auto w-full">
        <div className="flex flex-col w-1/2 pr-2">
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your OpenAI API key"
              />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700">
              System Prompt
            </label>
            <input
              type="text"
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Enter system prompt"
            />
          </div>
          <div className="flex-grow overflow-auto bg-white rounded-lg shadow p-4 mb-4">
            {messages.map((message, index) => (
              <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {message.content}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow rounded-l-md border-gray-300 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
        <div className="w-1/2 pl-2">
          <div className="bg-white rounded-lg shadow p-4 h-full">
            <h2 className="text-lg font-semibold mb-2">Mind Map</h2>
            <svg ref={svgRef} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App