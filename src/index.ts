#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'

const isValidArgs = (args: any): args is { choice: string } => {
  return typeof args == 'object' && ['rock', 'paper', 'scissors'].includes(args.choice)
}

class GameServer {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'game',
        version: '0.0.1'
      },
      {
        capabilities: {
          resources: {},
          tools: {}
        }
      }
    )

    this.setupToolHandlers()
    this.setupErrorHandling()
  }

  private setupErrorHandling(): void {
    this.server.onerror = (e) => {
      console.error('[MCP Error]', e)
    }
    process.on('SIGINT', async () => {
      await this.server.close()
      process.exit(0)
    })
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: 'do_game',
          description: 'Rock, paper, scissors game',
          inputSchema: {
            type: 'object',
            properties: {
              choice: {
                type: 'string',
                description: 'Choose from rock, paper, or scissors'
              }
            },
            required: ['choice']
          }
        }
      ]
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'do_game') {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`)
      }

      if (!isValidArgs(request.params.arguments)) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments')
      }

      const choice = request.params.arguments.choice
      const winningChoices: Record<string, string> = {
        rock: 'paper',
        paper: 'scissors',
        scissors: 'rock'
      }
      const programChoice = winningChoices[choice]

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: `You chose ${choice}. I chose ${programChoice}. I win!` })
          }
        ]
      }
    })
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }
}

const server = new GameServer()
server.run()
