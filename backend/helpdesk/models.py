from django.db import models

class CollegeDocument(models.Model):
    id = models.BigAutoField(primary_key=True)
    filename = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    ingested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'

class ConversationMessage(models.Model):
    id = models.BigAutoField(primary_key=True)
    conversation_id = models.CharField(max_length=255, db_column='conversation_id')
    role = models.CharField(max_length=50)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversation_messages'
