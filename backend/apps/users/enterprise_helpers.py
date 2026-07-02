"""Helpers pour la création et la complétion du profil entreprise."""


def enterprise_profile_defaults(user) -> dict:
    name = (user.first_name or user.username or user.email.split('@')[0]).strip()
    return {
        'company_name': name,
        'address': user.address or '',
        'city': user.city or '',
        'company_email': user.email,
        'company_phone': user.phone_number or '',
    }
