import type { Mission } from '../types';

export function missionApplicationsOpen(mission: Mission): boolean {
  if (typeof mission.applications_open === 'boolean') {
    return mission.applications_open;
  }
  return (
    mission.status === 'funded' &&
    !mission.provider &&
    !mission.assigned_enterprise_id
  );
}

export function applyBlockMessage(reason?: string | null): string {
  switch (reason) {
    case 'assigned':
      return 'Cette mission a déjà été assignée. Les candidatures sont fermées.';
    case 'closed':
      return 'Cette mission n\'est plus ouverte aux candidatures.';
    case 'already_applied':
      return 'Vous avez déjà postulé à cette mission.';
    case 'kyc_incomplete':
      return 'Complétez votre profil et votre vérification (NINA, téléphone, documents) pour postuler.';
    case 'kyc_required':
      return 'Cette mission exige un KYC vérifié par l\'administration.';
    case 'unavailable':
      return 'Activez votre disponibilité dans votre profil prestataire.';
    case 'profile_incomplete':
      return 'Complétez votre profil prestataire pour postuler.';
    case 'own_mission':
      return 'Vous ne pouvez pas postuler à votre propre mission.';
    case 'enterprise_ineligible':
      return 'Votre entreprise ne peut pas postuler à cette mission.';
    case 'wrong_role':
      return 'Activez l\'espace prestataire pour postuler.';
    default:
      return 'Candidature indisponible (profil incomplet, KYC ou disponibilité).';
  }
}
