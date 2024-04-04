import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor } from "langchain/agents";
import { z } from "zod";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { CommandInteraction, EmbedBuilder } from "discord.js";
import { getAudioUrlFromText } from "./getAudioUrlFromText";

const SYSTEM_PROMPT = `You're an assistant dedicated to helping users get a summary of a chat conversation along with summary audio. The user will enter a list of chats between two or more users. Your task is to return a summary using the provided function "generate_summary" such that a user can understand quickly what happened in the chat. The summary should be concise and capture the essence of the conversation. Use generate_summary function to generate the summary and get the summary audio URL. THE FINAL SUMMARY MUST NEVER EXCEED 4000 CHARACTERS.`;
// const SYSTEM_PROMPT = `You're an assistant dedicated to helping users get a summary of a chat conversation. The user will enter a list of chats between two or more users. Your task is to return a summary using the provided function "generate_summary" such that a user can understand quickly what happened in the chat. The summary should be concise and capture the essence of the conversation. In addition to the summary, at the end, you should also include a list with title TLDR; consisting of important takeaways as bullet points. Use generate_ssummary function to generate the summary. `;

const generateSummary = z.object({
  summary: z.string().describe("Summary of the chat."),
});

function validateSummaryJSON(summaryJSON: Record<string, string>) {
  const requiredFields = ["summary"];

  for (const field of requiredFields) {
    if (!summaryJSON || !summaryJSON[field]) {
      return false;
    }
  }

  return true;
}

interface DiscordContext {
  interaction: CommandInteraction;
  messageLimit: number;
  chatHistory: string;
  channelName: string;
  date: string;
  linkToUserMessage: string;
}

export async function getAIResponse(discordContext: DiscordContext) {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.5,
    });

    const tools = [
      new DynamicStructuredTool({
        name: "generate_summary",
        description:
          "Generates summary of the chat conversation based on the input.",
        schema: generateSummary,
        func: async (input) => {
          try {
            const summaryJson = input;
            const isJsonValid = validateSummaryJSON(summaryJson);

            if (!isJsonValid)
              return "The argument to the function generate_summary does not match the schema. Please try again.";

            const summary = summaryJson.summary;

            console.log(summary);

            await discordContext.interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x0099ff)
                  .setTitle(
                    `Summary of last ${discordContext.messageLimit} messages:`,
                  )
                  .setDescription(summary)
                  .setTimestamp()
                  .setFooter({
                    text: `The audio version of this summary is being generated and will be sent soon. Please wait.`,
                  }),
              ],
            });

            try {
              // generate audio file from the summary text
              const audioURL = await getAudioUrlFromText(`${summary}`);
              await discordContext.interaction.followUp({
                content: `Here is the audio version of this summary!`,
                files: [
                  {
                    attachment: audioURL,
                    name: "chat_summary.mp3",
                  },
                ],
                ephemeral: true,
              });

              return `${summary}
                You can listen to the summary [here](${audioURL}).
              `;
            } catch (e) {
              console.log((e as Error).message || e);
              return `${summary}`;
            }
          } catch (e) {
            console.log((e as Error).message);
            return `Could not generate summary due to error: ${
              (e as Error).message
            }`;
          }
        },
      }),
    ];

    const modelWithFunctions = model.bind({
      functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });

    const MEMORY_KEY = "chat_history";
    const memoryPrompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      new MessagesPlaceholder(MEMORY_KEY),
      ["user", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agentWithMemory = RunnableSequence.from([
      {
        input: (i) => i.input,
        agent_scratchpad: (i) => formatToOpenAIFunctionMessages(i.steps),
        chat_history: (i) => i.chat_history,
      },
      memoryPrompt,
      modelWithFunctions,
      new OpenAIFunctionsAgentOutputParser(),
    ]);

    /** Pass the runnable along with the tools to create the Agent Executor */
    const executorWithMemory = AgentExecutor.fromAgentAndTools({
      agent: agentWithMemory,
      tools: tools,
      returnIntermediateSteps: undefined,
    });

    const result = await executorWithMemory.invoke({
      input: discordContext.chatHistory,
      chat_history: [],
    });

    const responsetext = result.output;

    console.log(responsetext.toString());
    return responsetext.toString();
  } catch (e) {
    console.error((e as Error).message);
    return `Could not generate summary due to error: ${(e as Error).message}`;
  }
}
