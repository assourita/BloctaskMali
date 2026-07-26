"""
BlockTask Enterprise Models
Gestion des entreprises et employés
"""

from django.db import models
import uuid


class EnterpriseTeam(models.Model):
    """Équipe réutilisable au sein d'une entreprise."""

    enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='teams'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Chef d'équipe (défaut pour les affectations mission)
    manager = models.ForeignKey(
        'users.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_teams'
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enterprise_teams'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.enterprise.company_name}"


class EnterpriseTeamMember(models.Model):
    """Membre d'une équipe entreprise."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(
        EnterpriseTeam,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    employee = models.ForeignKey(
        'users.Employee',
        on_delete=models.CASCADE,
        related_name='team_memberships',
    )
    is_lead = models.BooleanField(
        default=False,
        help_text='Marqueur local (le chef officiel reste team.manager)',
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Catégorie / spécialité du membre dans l\'équipe (optionnel)',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'enterprise_team_members'
        constraints = [
            models.UniqueConstraint(
                fields=['team', 'employee'],
                name='uniq_team_member',
            ),
        ]

    def __str__(self):
        return f"{self.employee} ∈ {self.team.name}"


class EmployeeAssignment(models.Model):
    """Affectation d'un employé à une mission (multi-exécutants possibles)."""

    class AssignmentType(models.TextChoices):
        MANUAL = 'manual', 'Manuelle'
        AUTOMATIC = 'automatic', 'Automatique'
        ROTATION = 'rotation', 'Rotation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='employee_assignments'
    )
    employee = models.ForeignKey(
        'users.Employee',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='assignments_made'
    )

    assignment_type = models.CharField(
        max_length=20,
        choices=AssignmentType.choices,
        default=AssignmentType.MANUAL
    )
    is_lead = models.BooleanField(
        default=False,
        help_text='Chef d\'équipe pour cette mission',
    )

    notes = models.TextField(blank=True)

    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(blank=True, null=True)
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'employee_assignments'
        ordering = ['-assigned_at']
        constraints = [
            models.UniqueConstraint(
                fields=['mission', 'employee'],
                name='uniq_assignment_mission_employee',
            ),
        ]

    def __str__(self):
        return f"{self.employee} → {self.mission}"


class EnterpriseContract(models.Model):
    """Contrats entreprise avec BlockTask"""
    
    class ContractType(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        PREMIUM = 'premium', 'Premium'
        ENTERPRISE = 'enterprise', 'Entreprise'
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Actif'
        SUSPENDED = 'suspended', 'Suspendu'
        EXPIRED = 'expired', 'Expiré'
        TERMINATED = 'terminated', 'Résilié'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    
    contract_type = models.CharField(
        max_length=20,
        choices=ContractType.choices,
        default=ContractType.STANDARD
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    
    # Conditions
    monthly_fee = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    max_employees = models.PositiveIntegerField(default=10)
    
    # Période
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Facturation
    billing_email = models.EmailField()
    billing_address = models.TextField()
    
    # Documents
    contract_document = models.FileField(upload_to='contracts/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'enterprise_contracts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Contrat {self.contract_type} - {self.enterprise.company_name}"


class EnterpriseInvoice(models.Model):
    """Factures entreprise"""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        SENT = 'sent', 'Envoyée'
        PAID = 'paid', 'Payée'
        OVERDUE = 'overdue', 'En retard'
        CANCELLED = 'cancelled', 'Annulée'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    contract = models.ForeignKey(
        EnterpriseContract,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    
    # Période
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Montants
    subtotal = models.DecimalField(max_digits=15, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Paiement
    paid_at = models.DateTimeField(blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    pdf_file = models.FileField(upload_to='invoices/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    
    class Meta:
        db_table = 'enterprise_invoices'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Facture {self.invoice_number} - {self.enterprise.company_name}"


class EmployeeSchedule(models.Model):
    """Planning des employés"""
    
    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, 'Lundi'
        TUESDAY = 1, 'Mardi'
        WEDNESDAY = 2, 'Mercredi'
        THURSDAY = 3, 'Jeudi'
        FRIDAY = 4, 'Vendredi'
        SATURDAY = 5, 'Samedi'
        SUNDAY = 6, 'Dimanche'
    
    employee = models.ForeignKey(
        'users.Employee',
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_working = models.BooleanField(default=True)
    
    break_start = models.TimeField(blank=True, null=True)
    break_end = models.TimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'employee_schedules'
        unique_together = ['employee', 'day_of_week']
    
    def __str__(self):
        return f"{self.employee} - {self.get_day_of_week_display()}"


class EmployeeAvailability(models.Model):
    """Disponibilité actuelle des employés"""
    
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Disponible'
        BUSY = 'busy', 'Occupé'
        ON_MISSION = 'on_mission', 'En mission'
        ON_BREAK = 'on_break', 'En pause'
        OFFLINE = 'offline', 'Hors ligne'
        VACATION = 'vacation', 'En congé'
    
    employee = models.OneToOneField(
        'users.Employee',
        on_delete=models.CASCADE,
        related_name='availability'
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OFFLINE
    )
    
    # Position actuelle
    current_latitude = models.FloatField(blank=True, null=True)
    current_longitude = models.FloatField(blank=True, null=True)
    location_updated_at = models.DateTimeField(blank=True, null=True)
    
    # Mission en cours
    current_mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_employees'
    )
    
    # Prochaine disponibilité
    available_from = models.DateTimeField(blank=True, null=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'employee_availability'
    
    def __str__(self):
        return f"{self.employee} - {self.status}"


class EnterprisePayrollSettings(models.Model):
    """Paramètres de paie des employés (décisions du gérant)."""

    class Frequency(models.TextChoices):
        WEEKLY = 'weekly', 'Hebdomadaire'
        MONTHLY = 'monthly', 'Mensuelle'

    class PaymentMode(models.TextChoices):
        AUTOMATIC = 'automatic', 'Automatique'
        MANUAL = 'manual', 'Manuel'

    enterprise = models.OneToOneField(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='payroll_settings',
    )
    is_enabled = models.BooleanField(default=True)
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.WEEKLY,
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=PaymentMode.choices,
        default=PaymentMode.MANUAL,
    )
    # % du net mission (après commission plateforme) redistribué aux employés
    employee_pool_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=70,
        help_text='% du montant net mission versé au pool employés (le reste reste à l\'entreprise)',
    )
    # Multiplicateur du poids pour le chef d'équipe / lead
    lead_weight_multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.5,
        help_text='Poids relatif du lead en mission équipe (ex. 1.5 = +50%)',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enterprise_payroll_settings'

    def __str__(self):
        return f"Paie {self.enterprise.company_name} ({self.frequency}/{self.payment_mode})"


class MissionEmployeeEarning(models.Model):
    """Gain accrû pour un employé à la validation d'une mission entreprise."""

    class Status(models.TextChoices):
        ACCRUED = 'accrued', 'Accru'
        INCLUDED = 'included', 'Inclus dans une période'
        PAID = 'paid', 'Payé'
        CANCELLED = 'cancelled', 'Annulé'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='employee_earnings',
    )
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='employee_earnings',
    )
    employee = models.ForeignKey(
        'users.Employee',
        on_delete=models.CASCADE,
        related_name='earnings',
    )
    payroll_line = models.ForeignKey(
        'enterprises.PayrollLine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='earnings',
    )

    mission_price = models.DecimalField(max_digits=15, decimal_places=2)
    mission_net = models.DecimalField(max_digits=15, decimal_places=2)
    pool_amount = models.DecimalField(max_digits=15, decimal_places=2)
    amount = models.DecimalField(max_digits=15, decimal_places=2)

    is_team = models.BooleanField(default=False)
    is_lead = models.BooleanField(default=False)
    team_size = models.PositiveIntegerField(default=1)
    share_weight = models.DecimalField(max_digits=8, decimal_places=4, default=1)
    share_ratio = models.DecimalField(max_digits=8, decimal_places=6, default=1)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACCRUED,
    )
    accrued_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'mission_employee_earnings'
        ordering = ['-accrued_at']
        constraints = [
            models.UniqueConstraint(
                fields=['mission', 'employee'],
                name='uniq_earning_mission_employee',
            ),
        ]

    def __str__(self):
        return f"{self.employee} · {self.amount} XOF · {self.mission_id}"


class PayrollPeriod(models.Model):
    """Période de paie (semaine ou mois) générée pour une entreprise."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        PENDING_APPROVAL = 'pending_approval', 'En attente validation'
        APPROVED = 'approved', 'Approuvée'
        PAID = 'paid', 'Payée'
        CANCELLED = 'cancelled', 'Annulée'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='payroll_periods',
    )
    frequency = models.CharField(
        max_length=20,
        choices=EnterprisePayrollSettings.Frequency.choices,
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=EnterprisePayrollSettings.PaymentMode.choices,
    )
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    employees_count = models.PositiveIntegerField(default=0)
    missions_count = models.PositiveIntegerField(default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    generated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payroll_periods_generated',
    )
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payroll_periods_approved',
    )
    paid_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payroll_periods_paid',
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payroll_periods'
        ordering = ['-period_start', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['enterprise', 'period_start', 'period_end', 'frequency'],
                name='uniq_payroll_period_enterprise_range',
            ),
        ]

    def __str__(self):
        return f"Paie {self.enterprise.company_name} {self.period_start}→{self.period_end}"


class PayrollLine(models.Model):
    """Ligne de paie d'un employé pour une période."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PAID = 'paid', 'Payée'
        SKIPPED = 'skipped', 'Ignorée'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name='lines',
    )
    employee = models.ForeignKey(
        'users.Employee',
        on_delete=models.CASCADE,
        related_name='payroll_lines',
    )

    missions_count = models.PositiveIntegerField(default=0)
    solo_missions = models.PositiveIntegerField(default=0)
    team_missions = models.PositiveIntegerField(default=0)
    lead_missions = models.PositiveIntegerField(default=0)

    gross_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    adjustment = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    paid_at = models.DateTimeField(blank=True, null=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'payroll_lines'
        ordering = ['-net_amount']
        constraints = [
            models.UniqueConstraint(
                fields=['period', 'employee'],
                name='uniq_payroll_line_period_employee',
            ),
        ]

    def __str__(self):
        return f"{self.employee} · {self.net_amount} XOF ({self.period_id})"


class EnterpriseAnalytics(models.Model):
    """Statistiques entreprise (matérialisées)"""
    
    enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    date = models.DateField()
    
    # Missions
    missions_created = models.PositiveIntegerField(default=0)
    missions_completed = models.PositiveIntegerField(default=0)
    missions_cancelled = models.PositiveIntegerField(default=0)
    missions_disputed = models.PositiveIntegerField(default=0)
    
    # Financier
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_commission = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_paid_to_providers = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Performance
    avg_completion_time = models.FloatField(default=0)  # Minutes
    on_time_rate = models.FloatField(default=100)  # Pourcentage
    customer_satisfaction = models.FloatField(default=5)  # 1-5
    
    # Employés
    active_employees = models.PositiveIntegerField(default=0)
    employee_utilization = models.FloatField(default=0)  # Pourcentage
    
    class Meta:
        db_table = 'enterprise_analytics'
        unique_together = ['enterprise', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.enterprise.company_name} - {self.date}"
