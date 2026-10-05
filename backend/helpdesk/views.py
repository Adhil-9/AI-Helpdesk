from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from ai.services import AIService
import logging

logger = logging.getLogger(__name__)

class ChatView(APIView):
    # To match spring boot behaviour, we permit all on this endpoint.
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        question = request.data.get('question')
        conversation_id = request.data.get('conversationId')
        image_file = request.FILES.get('image')
        
        has_content = (question and question.strip()) or image_file

        if not has_content:
            return Response(
                {"error": "Question or image must be provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ai_service = AIService()
            response_data = ai_service.ask(question, conversation_id, image_file=image_file)
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error generating answer for question: {question}", exc_info=True)
            fallback = {
                "answer": "I'm having trouble generating a response right now. Please try again.",
                "sources": []
            }
            return Response(fallback, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
