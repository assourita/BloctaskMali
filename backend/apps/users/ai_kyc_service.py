"""Service d'analyse KYC par IA (OpenAI Vision)."""
import base64
import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class KYCDocumentType(Enum):
    """Types de documents KYC."""
    ID_CARD_FRONT = "id_card_front"
    ID_CARD_BACK = "id_card_back"
    SELFIE = "selfie"


class KYCDecision(Enum):
    """Décisions KYC."""
    APPROVED = "approved"
    REJECTED = "rejected"
    MANUAL_REVIEW = "manual_review"


@dataclass
class KYCAnalysisResult:
    """Résultat de l'analyse KYC par IA."""
    decision: KYCDecision
    confidence: float  # 0.0 à 1.0
    extracted_data: dict
    reasons: list[str]
    document_type: KYCDocumentType
    
    def to_dict(self) -> dict:
        return {
            'decision': self.decision.value,
            'confidence': self.confidence,
            'extracted_data': self.extracted_data,
            'reasons': self.reasons,
            'document_type': self.document_type.value,
        }


def encode_image_to_base64(image_url: str) -> Optional[str]:
    """Encode une image depuis une URL en base64."""
    try:
        response = requests.get(image_url, timeout=15)
        if response.status_code != 200:
            logger.error(f"Failed to fetch image from {image_url}: {response.status_code}")
            return None
        return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        logger.error(f"Error encoding image {image_url}: {e}")
        return None


def analyze_id_card_front(image_url: str, user_data: dict) -> KYCAnalysisResult:
    """Analyse la face avant de la carte d'identité avec OpenAI Vision."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        logger.warning("OPENAI_API_KEY not configured, defaulting to manual review")
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["API OpenAI non configurée"],
            document_type=KYCDocumentType.ID_CARD_FRONT,
        )
    
    base64_image = encode_image_to_base64(image_url)
    if not base64_image:
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["Impossible de charger l'image"],
            document_type=KYCDocumentType.ID_CARD_FRONT,
        )
    
    prompt = f"""
    Analyse cette carte d'identité malienne et extrais les informations suivantes:
    - Nom de famille
    - Prénom(s)
    - Date de naissance
    - Numéro NINA (si visible)
    - Lieu de naissance
    - Sexe
    - Profession
    
    Vérifie également:
    - Le document semble-t-il authentique?
    - Les informations sont-elles lisibles?
    - Y a-t-il des signes de falsification?
    
    Réponds en format JSON avec cette structure:
    {{
        "is_valid": boolean,
        "confidence": float (0-1),
        "extracted_data": {{
            "last_name": string,
            "first_name": string,
            "date_of_birth": string (YYYY-MM-DD),
            "nina": string,
            "place_of_birth": string,
            "gender": string,
            "profession": string
        }},
        "issues": [string],
        "reasons": [string]
    }}
    
    Données utilisateur fournies pour comparaison:
    - Nom: {user_data.get('last_name', '')}
    - Prénom: {user_data.get('first_name', '')}
    - NINA: {user_data.get('nina', '')}
    """
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image_url',
                                'image_url': {'url': f'data:image/jpeg;base64,{base64_image}'},
                            },
                        ],
                    }
                ],
                'max_tokens': 1000,
            },
            timeout=30,
        )
        
        if response.status_code != 200:
            logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return KYCAnalysisResult(
                decision=KYCDecision.MANUAL_REVIEW,
                confidence=0.0,
                extracted_data={},
                reasons=["Erreur API OpenAI"],
                document_type=KYCDocumentType.ID_CARD_FRONT,
            )
        
        import json
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Extraire le JSON de la réponse
        try:
            analysis = json.loads(content)
        except json.JSONDecodeError:
            # Si la réponse n'est pas du JSON pur, essayer d'extraire le JSON
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                raise
        
        is_valid = analysis.get('is_valid', False)
        confidence = analysis.get('confidence', 0.5)
        extracted = analysis.get('extracted_data', {})
        issues = analysis.get('issues', [])
        reasons = analysis.get('reasons', [])
        
        # Comparer avec les données utilisateur
        data_mismatch = []
        if extracted.get('last_name', '').lower() != user_data.get('last_name', '').lower():
            data_mismatch.append(f"Nom différent: {extracted.get('last_name')} vs {user_data.get('last_name')}")
        if extracted.get('first_name', '').lower() != user_data.get('first_name', '').lower():
            data_mismatch.append(f"Prénom différent: {extracted.get('first_name')} vs {user_data.get('first_name')}")
        if extracted.get('nina', '') and extracted.get('nina') != user_data.get('nina', ''):
            data_mismatch.append(f"NINA différent: {extracted.get('nina')} vs {user_data.get('nina')}")
        
        if data_mismatch:
            reasons.extend(data_mismatch)
            is_valid = False
            confidence *= 0.5
        
        if not is_valid or confidence < 0.7:
            decision = KYCDecision.MANUAL_REVIEW if confidence >= 0.5 else KYCDecision.REJECTED
        else:
            decision = KYCDecision.APPROVED
        
        return KYCAnalysisResult(
            decision=decision,
            confidence=confidence,
            extracted_data=extracted,
            reasons=reasons,
            document_type=KYCDocumentType.ID_CARD_FRONT,
        )
        
    except Exception as e:
        logger.error(f"Error analyzing ID card front: {e}")
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["Erreur lors de l'analyse"],
            document_type=KYCDocumentType.ID_CARD_FRONT,
        )


def analyze_id_card_back(image_url: str) -> KYCAnalysisResult:
    """Analyse le dos de la carte d'identité."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["API OpenAI non configurée"],
            document_type=KYCDocumentType.ID_CARD_BACK,
        )
    
    base64_image = encode_image_to_base64(image_url)
    if not base64_image:
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["Impossible de charger l'image"],
            document_type=KYCDocumentType.ID_CARD_BACK,
        )
    
    prompt = """
    Analyse le dos de cette carte d'identité malienne et vérifie:
    - Le document semble-t-il authentique?
    - Les informations sont-elles cohérentes avec une pièce d'identité officielle?
    - Y a-t-il des signes de falsification ou de modification?
    - Le numéro d'identification est-il visible et cohérent?
    
    Réponds en format JSON:
    {
        "is_valid": boolean,
        "confidence": float (0-1),
        "issues": [string],
        "reasons": [string]
    }
    """
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image_url',
                                'image_url': {'url': f'data:image/jpeg;base64,{base64_image}'},
                            },
                        ],
                    }
                ],
                'max_tokens': 500,
            },
            timeout=30,
        )
        
        if response.status_code != 200:
            logger.error(f"OpenAI API error: {response.status_code}")
            return KYCAnalysisResult(
                decision=KYCDecision.MANUAL_REVIEW,
                confidence=0.0,
                extracted_data={},
                reasons=["Erreur API OpenAI"],
                document_type=KYCDocumentType.ID_CARD_BACK,
            )
        
        import json
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        try:
            analysis = json.loads(content)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                raise
        
        is_valid = analysis.get('is_valid', False)
        confidence = analysis.get('confidence', 0.5)
        issues = analysis.get('issues', [])
        reasons = analysis.get('reasons', [])
        
        if not is_valid or confidence < 0.7:
            decision = KYCDecision.MANUAL_REVIEW if confidence >= 0.5 else KYCDecision.REJECTED
        else:
            decision = KYCDecision.APPROVED
        
        return KYCAnalysisResult(
            decision=decision,
            confidence=confidence,
            extracted_data={},
            reasons=reasons,
            document_type=KYCDocumentType.ID_CARD_BACK,
        )
        
    except Exception as e:
        logger.error(f"Error analyzing ID card back: {e}")
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["Erreur lors de l'analyse"],
            document_type=KYCDocumentType.ID_CARD_BACK,
        )


def analyze_selfie(image_url: str, id_card_front_url: str) -> KYCAnalysisResult:
    """Analyse le selfie et compare avec la photo de la carte d'identité."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["API OpenAI non configurée"],
            document_type=KYCDocumentType.SELFIE,
        )
    
    selfie_base64 = encode_image_to_base64(image_url)
    id_card_base64 = encode_image_to_base64(id_card_front_url)
    
    if not selfie_base64 or not id_card_base64:
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["Impossible de charger les images"],
            document_type=KYCDocumentType.SELFIE,
        )
    
    prompt = """
    Compare ces deux images:
    - Image 1: Selfie de la personne
    - Image 2: Photo sur la carte d'identité
    
    Détermine:
    - Est-ce la même personne?
    - Le selfie est-il authentique (pas une photo de photo)?
    - La qualité est-elle suffisante pour la vérification?
    
    Réponds en format JSON:
    {
        "is_same_person": boolean,
        "is_authentic_selfie": boolean,
        "confidence": float (0-1),
        "issues": [string],
        "reasons": [string]
    }
    """
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image_url',
                                'image_url': {'url': f'data:image/jpeg;base64,{selfie_base64}'},
                            },
                            {
                                'type': 'image_url',
                                'image_url': {'url': f'data:image/jpeg;base64,{id_card_base64}'},
                            },
                        ],
                    }
                ],
                'max_tokens': 500,
            },
            timeout=30,
        )
        
        if response.status_code != 200:
            logger.error(f"OpenAI API error: {response.status_code}")
            return KYCAnalysisResult(
                decision=KYCDecision.MANUAL_REVIEW,
                confidence=0.0,
                extracted_data={},
                reasons=["Erreur API OpenAI"],
                document_type=KYCDocumentType.SELFIE,
            )
        
        import json
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        try:
            analysis = json.loads(content)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                raise
        
        is_same_person = analysis.get('is_same_person', False)
        is_authentic = analysis.get('is_authentic_selfie', False)
        confidence = analysis.get('confidence', 0.5)
        issues = analysis.get('issues', [])
        reasons = analysis.get('reasons', [])
        
        if not is_same_person or not is_authentic or confidence < 0.7:
            decision = KYCDecision.MANUAL_REVIEW if confidence >= 0.5 else KYCDecision.REJECTED
        else:
            decision = KYCDecision.APPROVED
        
        return KYCAnalysisResult(
            decision=decision,
            confidence=confidence,
            extracted_data={},
            reasons=reasons,
            document_type=KYCDocumentType.SELFIE,
        )
        
    except Exception as e:
        logger.error(f"Error analyzing selfie: {e}")
        return KYCAnalysisResult(
            decision=KYCDecision.MANUAL_REVIEW,
            confidence=0.0,
            extracted_data={},
            reasons=["Erreur lors de l'analyse"],
            document_type=KYCDocumentType.SELFIE,
        )


def analyze_kyc_submission(id_card_front_url: str, id_card_back_url: str, selfie_url: str, user_data: dict) -> dict:
    """Analyse complète d'une soumission KYC."""
    results = {
        'id_card_front': analyze_id_card_front(id_card_front_url, user_data).to_dict(),
        'id_card_back': analyze_id_card_back(id_card_back_url).to_dict(),
        'selfie': analyze_selfie(selfie_url, id_card_front_url).to_dict(),
    }
    
    # Décision globale
    decisions = [r['decision'] for r in results.values()]
    confidences = [r['confidence'] for r in results.values()]
    
    if all(d == 'approved' for d in decisions):
        final_decision = 'approved'
        final_confidence = min(confidences)
    elif any(d == 'rejected' for d in decisions):
        final_decision = 'rejected'
        final_confidence = min(confidences)
    else:
        final_decision = 'manual_review'
        final_confidence = sum(confidences) / len(confidences)
    
    results['final_decision'] = final_decision
    results['final_confidence'] = final_confidence
    
    return results
