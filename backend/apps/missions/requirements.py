import json


def parse_mission_requirements(mission) -> dict:
    raw = getattr(mission, 'requirements', None)
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


def mission_requires_id_verification(mission) -> bool:
    return bool(parse_mission_requirements(mission).get('requires_id_verification'))
