from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

class ChatTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.chat_url = reverse('chat')

    @patch('helpdesk.views.AIService')
    def test_chat_success(self, MockAIService):
        # Setup mock
        mock_instance = MockAIService.return_value
        mock_instance.ask.return_value = {
            "answer": "Mocked AI Response",
            "sources": [{"document": "test.pdf", "pageNumber": 1}]
        }

        response = self.client.post(self.chat_url, {
            'question': 'What is the fee?',
            'conversationId': '12345'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['answer'], "Mocked AI Response")
        self.assertEqual(len(response.data['sources']), 1)

    def test_chat_empty_question(self):
        response = self.client.post(self.chat_url, {
            'question': '',
            'conversationId': '12345'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('helpdesk.views.AIService')
    def test_chat_service_failure(self, MockAIService):
        mock_instance = MockAIService.return_value
        mock_instance.ask.side_effect = Exception("Ollama connection failed")

        response = self.client.post(self.chat_url, {
            'question': 'What is the fee?',
            'conversationId': '12345'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Sorry, an error occurred", response.data['answer'])
