import logging
import os
from typing import List
from django.conf import settings
from langchain_ollama import OllamaLLM, OllamaEmbeddings
from langchain_postgres.vectorstores import PGVector
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document as LangchainDocument
from helpdesk.models import ConversationMessage

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model_name = settings.OLLAMA_MODEL
        self.embedding_model = settings.OLLAMA_EMBEDDING_MODEL
        
        # Get DB URL from environment or construct it
        self.db_url = os.environ.get('DATABASE_URL', f"postgres://{os.environ.get('DB_USER', 'postgres')}:{os.environ.get('DB_PASSWORD', 'postgres')}@{os.environ.get('DB_HOST', 'localhost')}:{os.environ.get('DB_PORT', '5433')}/{os.environ.get('DB_NAME', 'helpdesk')}")
        
        # We need to construct a connection string suitable for pgvector
        self.sqlalchemy_url = self.db_url.replace("postgres://", "postgresql+psycopg://")

        
        self.embeddings = OllamaEmbeddings(
            base_url=self.base_url,
            model=self.embedding_model
        )
        
        self.llm = OllamaLLM(
            base_url=self.base_url,
            model=self.model_name,
            temperature=0.2,
            num_predict=256
        )
        
        self.vector_store = PGVector(
            embeddings=self.embeddings,
            collection_name="college_documents",
            connection=self.sqlalchemy_url,
            use_jsonb=True,
        )

    def retrieve(self, question: str, top_k: int = 3) -> List[LangchainDocument]:
        logger.info(f"Retrieving documents for question: {question}")
        docs = self.vector_store.similarity_search(question, k=top_k)
        return docs

    def generate_answer(self, question: str, context_docs: List[LangchainDocument], conversation_id: str = None) -> str:
        # Cleanly normalize text whitespace to keep prompt compact
        import re
        
        context_str = "\n\n".join([
            re.sub(r'\n{2,}', '\n', re.sub(r'[ \t]+', ' ', doc.page_content)).strip()
            for doc in context_docs
        ])

        history_str = ""
        if conversation_id:
            # Get top 10 most recent messages, ordered by timestamp desc
            history_qs = ConversationMessage.objects.filter(conversation_id=conversation_id).order_by('-timestamp')[:10]
            # Reverse to chronological order
            history = reversed(list(history_qs))
            
            for msg in history:
                content = msg.content
                if len(content) > 300:
                    content = content[:300] + "..."
                history_str += f"{msg.role}: {content}\n"

        prompt_text = (
            "You are a helpful AI assistant for the MRCET college help desk.\n"
            "Answer the exact question first based strictly and only on the provided context below. "
            "Give only the amount of information needed to clearly answer it. "
            "Do NOT unnecessarily explain extra topics, unrelated information, or full details unless the user explicitly asks for them. "
            "If the required information is not available in the context, you must clearly respond: 'The information is not available in the current knowledge base.' "
            "Do not invent, hallucinate, or guess any college-specific facts not found in the context.\n"
            "If additional information could be useful, optionally end with a short prompt such as 'If you want, I can provide more details about [Topic].'\n\n"
            f"Context:\n{context_str}\n\n"
        )

        if history_str:
            prompt_text += f"Conversation History:\n{history_str}\n\n"

        prompt_text += f"Question: {question}\n\nConcise Answer:"

        response = self.llm.invoke(prompt_text)
        return response.strip() if response else "I could not generate an answer based on the knowledge base."

    def is_general_query(self, question: str) -> bool:
        q = question.lower().strip(' ?!. \t\n')
        
        # If explicitly asking about MRCET or the college, it's NOT general.
        if 'mrcet' in q or 'malla reddy' in q or 'this college' in q or 'your college' in q:
            return False
            
        # 1. Greetings
        casual = ['hi', 'hello', 'hey', 'how are you', 'who are you', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'sup', 'what\'s up']
        if q in casual or q.startswith(('hi ', 'hello ', 'hey ')):
            return True
            
        # 2. Tech / Academic / General terms
        import re
        general_terms = [
            r'\bpython\b', r'\bjava\b', r'\bc\+\+\b', r'\bc\b', r'\bjavascript\b', r'\bdjango\b',
            r'\bsql\b', r'\bdbms\b', r'\bos\b', r'\boperating systems?\b', r'\bcomputer networks?\b',
            r'\bdata structures?\b', r'\balgorithms?\b', r'\bweb development\b', r'\bapi\b', r'\brest apis?\b',
            r'\bgit\b', r'\bgithub\b', r'\bcloud\b', r'\bai\b', r'\bml\b', r'\baptitude\b', 
            r'\binterview\b', r'\bresume\b', r'\bcareer\b', r'\bstudy plan\b', r'\bnormalization\b',
            r'\bbinary search\b', r'\boop\b', r'\bprepare\b', r'\bpreparation\b', r'\bcommunication skills?\b'
        ]
        if any(re.search(term, q) for term in general_terms):
            return True
            
        # Placement prep vs Placement process
        if 'prepare' in q and 'placement' in q:
            return True
            
        # 3. Explanations without specific college focus
        college_terms = ['admission', 'fee', 'intake', 'course', 'btech', 'mtech', 'exam', 'attendance', 'faculty', 'principal', 'syllabus', 'department', 'transport', 'hostel', 'canteen', 'library', 'process', 'placement']
        has_college_term = any(re.search(r'\b' + term + r'\b', q) for term in college_terms)
        
        if not has_college_term:
            if q.startswith('explain ') or q.startswith('define ') or q.startswith('what is ') or q.startswith('how do i ') or q.startswith('how can i ') or q.startswith('how should i '):
                return True
                
        return False

    def generate_general_answer(self, question: str, conversation_id: str = None) -> str:
        history_str = ""
        if conversation_id:
            history_qs = ConversationMessage.objects.filter(conversation_id=conversation_id).order_by('-timestamp')[:10]
            history = reversed(list(history_qs))
            
            for msg in history:
                content = msg.content
                if len(content) > 300:
                    content = content[:300] + "..."
                history_str += f"{msg.role}: {content}\n"

        prompt_text = (
            "You are AI Help Desk, a helpful student assistant.\n\n"
            "Answer general student, academic, programming, technical, career, placement, and study-related questions clearly and accurately. "
            "Answer the exact question first. Give only the amount of information needed to clearly answer it. "
            "Do NOT unnecessarily provide a long explanation, extra topics, unrelated information, or a complete tutorial unless the user explicitly asks for more detail (e.g. 'explain in detail', 'give examples').\n"
            "For simple factual questions, use 1-3 sentences. For definitions, give a short definition and optionally a small example. "
            "Never respond with large blocks of information simply because you know more. Prioritize relevance and conciseness.\n"
            "If additional information could be useful, optionally end with a short prompt such as 'If you want, I can explain [Topic] with an example.'\n"
            "Do not claim to know private or college-specific information. Do not invent MRCET-specific facts.\n\n"
        )
        
        if history_str:
            prompt_text += f"Conversation History:\n{history_str}\n\n"

        prompt_text += f"Question: {question}\n\nAnswer:"
        
        response = self.llm.invoke(prompt_text)
        return response.strip() if response else "I'm having trouble generating a response right now. Please try again."

    def ask(self, question: str, conversation_id: str = None, image_file=None) -> dict:
        q_text = question if question else "[Attached Image]"
        if conversation_id:
            ConversationMessage.objects.create(conversation_id=conversation_id, role="USER", content=q_text)

        if image_file:
            answer = "I received your image, but my current configuration does not have a vision model enabled to process images. Please try asking a text-based question."
            sources = []
        else:
            try:
                is_general = self.is_general_query(question)
            except Exception as e:
                logger.error(f"Error in router: {e}", exc_info=True)
                is_general = False

            if is_general:
                answer = self.generate_general_answer(question, conversation_id)
                sources = []
            else:
                docs = self.retrieve(question, top_k=3)
                answer = self.generate_answer(question, docs, conversation_id)
                sources = []
                for doc in docs:
                    metadata = doc.metadata or {}
                    filename = metadata.get("filename")
                    page_number = metadata.get("page_number")
                    if filename:
                        source = {"document": filename, "pageNumber": page_number}
                        if source not in sources:
                            sources.append(source)

        if conversation_id:
            ConversationMessage.objects.create(conversation_id=conversation_id, role="AI", content=answer)

        return {
            "answer": answer,
            "sources": sources
        }
