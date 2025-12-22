# Transcrição de Vídeos com Whisper

Script Python para extrair áudio de vídeos e gerar transcrições usando Whisper da Groq.

## Configuração

1. Instale as dependências:
```bash
uv sync
```

2. Configure sua chave da API do Groq:
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione: `GROQ_API_KEY=sua_chave_api_aqui`

3. Certifique-se de ter o FFmpeg instalado:
   - macOS: `brew install ffmpeg`
   - Ubuntu: `sudo apt install ffmpeg`
   - Windows: `choco install ffmpeg` ou `winget install ffmpeg`

## Uso

### 1. Gerar Transcrições

Execute o script:
```bash
python transcripter.py
```

O script irá:
- Processar todos os vídeos na pasta `videos/`
- Extrair áudio de cada vídeo
- Gerar transcrições usando Whisper da Groq
- Salvar as transcrições em `transcriptions.json`

### 2. Ler Transcrições

Use a ferramenta de leitura:

```python
from transcription_reader import get_creator_transcriptions

# Obter transcrições de um criador específico
transcriptions = get_creator_transcriptions('jeffnippard')
print(transcriptions)
```

### Formato de Saída

```
Transcript 1
transcrição do primeiro vídeo...

Transcript 2
transcrição do segundo vídeo...
```

### Para uso com agentes de IA

```python
# Exemplo de integração com agente
def get_transcriptions_tool(creator_name):
    return get_creator_transcriptions(creator_name)
```

## Estrutura do JSON

```json
{
  "jeffnippard": [
    {
      "video": "video1.mp4",
      "transcription": "texto transcrito..."
    }
  ],
  "kallaway": [
    {
      "video": "video2.mp4", 
      "transcription": "texto transcrito..."
    }
  ]
}
```
