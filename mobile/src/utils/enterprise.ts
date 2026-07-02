export function assignmentStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Confirmée',
    rejected: 'Refusée',
    completed: 'Terminée',
    in_progress: 'En cours',
  };
  if (!status) return '—';
  return labels[status] || status;
}
