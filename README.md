# AI Helpdesk

AI Helpdesk is a modern, AI-powered knowledge base assistant that uses Retrieval-Augmented Generation (RAG) to provide accurate answers about MRCET policies, programs, and directory information.

## Architecture

* **Frontend:** React + Vite
* **Backend:** Django REST Framework
* **RAG Pipeline:** LangChain
* **Vector Database:** PostgreSQL with PGVector
* **AI Provider:** Ollama (running locally)
  * `qwen2.5:1.5b` for answer generation
  * `nomic-embed-text` for vector embeddings

## Prerequisites

1. Install **Docker** and **Docker Compose**.
2. Install **Ollama** on your host machine.

## Quick Start

### 1. Start Ollama and Pull Models
Ensure Ollama is running on your host machine and pull the required models:
```bash
ollama run qwen2.5:1.5b
ollama pull nomic-embed-text
```
Verify the models are available:
```bash
ollama list
```

### 2. Configure Environment
A `.env.example` file is provided. Create your own `.env` file in the root directory:
```bash
cp .env.example .env
```
*(Update the variables in `.env` if needed, but defaults work out-of-the-box).*

### 3. Start Docker Containers
Build and start the application stack:
```bash
docker compose up -d --build
```
Verify all containers (`helpdesk-frontend`, `helpdesk-backend`, `helpdesk-postgres`) are running:
```bash
docker compose ps
```

### 4. Run Migrations
Initialize the database tables:
```bash
docker compose exec helpdesk-backend python manage.py migrate
```

### 5. Ingest Knowledge Base
Ingest the provided PDF (`data/MRCET_AI_Helpdesk_Knowledge_Base.pdf`) into the PostgreSQL vector store:
```bash
docker compose exec helpdesk-backend python manage.py ingest_knowledge
```
*(This extracts text, chunks it, generates embeddings using `nomic-embed-text`, and saves them to PGVector).*

### 6. Test the Chatbot
Open the frontend in your browser:
**http://localhost:5173**

You can now ask questions such as:
- *What is the full name of MRCET?*
- *What courses are offered?*
- *What companies have conducted placement drives?*

The AI will exclusively answer based on the knowledge base document. If the information is not present, it will decline to hallucinate.

## API Documentation
Swagger documentation is available at:
**http://localhost:8080/api/docs/**
