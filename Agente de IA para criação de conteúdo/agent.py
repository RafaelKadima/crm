from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.tavily import TavilyTools

from agno.storage.sqlite import SqliteStorage
from agno.playground import Playground, serve_playground_app

from transcription_reader import get_creator_transcriptions, list_available_creators
from dotenv import load_dotenv
load_dotenv()


copywriter = Agent(
    model=OpenAIChat(id="gpt-4.1-mini"),
    name="copywriter",
    
    add_history_to_messages=True,
    num_history_runs=10,
    storage=SqliteStorage(table_name="agent_sessions", 
                          db_file="tmp/storage.db"),
    
    tools=[
        TavilyTools(),
        list_available_creators,
        get_creator_transcriptions
        ], 

    show_tool_calls=True,
    instructions=open("prompts/copywriter.md").read()
)

playground = Playground(agents=[copywriter]).get_app()

if __name__ == "__main__":
    serve_playground_app(playground, 
                         port=8000)