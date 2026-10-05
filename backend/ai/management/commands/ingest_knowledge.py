import os
import logging
from django.core.management.base import BaseCommand
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ai.services import AIService
from helpdesk.models import CollegeDocument

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Ingest PDF documents from the data directory into the vector store.'

    def handle(self, *args, **options):
        # Look in ../data (from backend root)
        # __file__ is backend/ai/management/commands/ingest_pdfs.py
        # os.path.dirname x 4 gives backend, x 5 gives AI-helpdesk
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), 'data')
        if not os.path.exists(data_dir):
            self.stdout.write(self.style.WARNING(f"Data directory not found at {data_dir}. Falling back to /app/data"))
            data_dir = '/app/data'
            if not os.path.exists(data_dir):
                self.stdout.write(self.style.ERROR(f"Data directory {data_dir} does not exist."))
                return

        pdf_files = [f for f in os.listdir(data_dir) if f.lower().endswith('.pdf')]
        
        if not pdf_files:
            self.stdout.write(self.style.WARNING(f"No PDF files found in {data_dir}"))
            return

        ai_service = AIService()
        
        # We try to mimic TokenTextSplitter(800, 400, 5, 10000, true) roughly
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=400,
            length_function=len,
        )

        for filename in pdf_files:
            if CollegeDocument.objects.filter(filename=filename).exists():
                self.stdout.write(f"Document {filename} already ingested. Skipping.")
                continue
                
            file_path = os.path.join(data_dir, filename)
            self.stdout.write(f"Ingesting document: {file_path}")
            
            try:
                loader = PyPDFLoader(file_path)
                documents = loader.load()
                
                # Add metadata
                for doc in documents:
                    # PyPDFLoader usually adds 'source' and 'page' metadata.
                    doc.metadata['filename'] = filename
                    doc.metadata['category'] = "General"
                    if 'page' in doc.metadata:
                        doc.metadata['page_number'] = doc.metadata['page']
                
                chunks = text_splitter.split_documents(documents)
                
                for i, chunk in enumerate(chunks):
                    chunk.metadata['chunk_number'] = i + 1
                    
                self.stdout.write(f"Split {filename} into {len(chunks)} chunks. Saving to vector store...")
                
                ai_service.vector_store.add_documents(chunks)
                
                CollegeDocument.objects.create(
                    filename=filename,
                    category="General"
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully ingested {filename}"))
                
            except Exception as e:
                logger.error(f"Error ingesting {filename}", exc_info=True)
                self.stdout.write(self.style.ERROR(f"Warning: Could not ingest document {filename}: {str(e)}"))
