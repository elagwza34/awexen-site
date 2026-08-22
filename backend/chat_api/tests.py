import json
import os
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase


class AskAwexenApiTests(SimpleTestCase):
    def test_health(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])

    @patch.dict(os.environ, {"OPENROUTER_API_KEY": ""})
    def test_empty_knowledge_still_uses_ai_for_general_questions(self) -> None:
        response = self.client.post(
            "/api/ask-awexen",
            data=json.dumps({"question": "ما عاصمة فرنسا؟", "knowledge": []}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 503)

    @patch.dict(os.environ, {"OPENROUTER_API_KEY": ""})
    def test_missing_server_key_is_reported(self) -> None:
        response = self.client.post(
            "/api/ask-awexen",
            data=json.dumps({
                "question": "ما خدماتكم؟",
                "knowledge": [{"title": "الخدمات", "answer": "نقدم تطوير المواقع."}],
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 503)

    def test_pdf_file_is_required(self) -> None:
        response = self.client.post("/api/knowledge/extract-pdf")
        self.assertEqual(response.status_code, 400)

    def test_invalid_pdf_is_rejected(self) -> None:
        upload = SimpleUploadedFile("invalid.pdf", b"not a real pdf", content_type="application/pdf")
        response = self.client.post("/api/knowledge/extract-pdf", {"file": upload})
        self.assertEqual(response.status_code, 400)
