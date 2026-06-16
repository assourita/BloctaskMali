"""
BlockTask Proofs Admin
Administration complète des preuves et validations
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MissionProof, GPSLocation, QRValidation, SignatureRecord,
    PhotoAnalysis, ProofChecklist
)


# ==================== GPS LOCATION INLINE ====================

class GPSLocationInline(admin.TabularInline):
    """Positions GPS inline"""
    model = GPSLocation
    extra = 0
    fields = ('location_type', 'latitude', 'longitude', 'timestamp', 'created_at')
    readonly_fields = ('latitude', 'longitude', 'timestamp', 'created_at')
    can_delete = False
    max_num = 10


# ==================== PHOTO ANALYSIS INLINE ====================

class PhotoAnalysisInline(admin.StackedInline):
    """Analyse photo inline"""
    model = PhotoAnalysis
    extra = 0
    can_delete = False
    readonly_fields = ['analyzed_at']


# ==================== MISSION PROOF ADMIN ====================

@admin.register(MissionProof)
class MissionProofAdmin(admin.ModelAdmin):
    """Administration complète des preuves"""
    
    list_display = [
        'id_short', 'mission', 'proof_type', 'submitted_by',
        'verification_status_colored', 'file_size_display', 'created_at'
    ]
    list_filter = [
        'proof_type', 'verification_status', 'mime_type', 'created_at'
    ]
    search_fields = [
        'mission__title', 'submitted_by__email', 'title', 'description', 'ipfs_hash'
    ]
    ordering = ['-created_at']
    
    actions = ['verify_proofs', 'reject_proofs', 'flag_proofs']
    
    fieldsets = (
        ('Mission', {
            'fields': ('mission', 'submitted_by')
        }),
        ('Type', {
            'fields': ('proof_type',)
        }),
        ('Contenu', {
            'fields': ('title', 'description')
        }),
        ('Fichier', {
            'fields': ('file', 'file_name', 'file_size', 'mime_type')
        }),
        ('Blockchain', {
            'fields': ('ipfs_hash', 'blockchain_hash'),
            'classes': ('collapse',)
        }),
        ('Vérification', {
            'fields': ('verification_status', 'verified_by', 'verification_notes')
        }),
        ('Métadonnées', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'created_at', 'updated_at', 'file_size', 'mime_type', 'ipfs_hash', 'blockchain_hash'
    ]
    
    inlines = [PhotoAnalysisInline]
    
    def id_short(self, obj):
        return format_html('<code>{}</code>', str(obj.id)[:8])
    id_short.short_description = 'ID'
    
    def file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"
    file_size_display.short_description = 'Taille'
    
    def verification_status_colored(self, obj):
        colors = {
            'pending': 'orange',
            'verified': 'green',
            'rejected': 'red',
            'flagged': 'purple',
        }
        color = colors.get(obj.verification_status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_verification_status_display()
        )
    verification_status_colored.short_description = 'Statut'
    
    @admin.action(description='✅ Vérifier preuves sélectionnées')
    def verify_proofs(self, request, queryset):
        queryset.update(verification_status='verified', verified_by=request.user)
        self.message_user(request, f"{queryset.count()} preuves vérifiées.")
    
    @admin.action(description='❌ Rejeter preuves sélectionnées')
    def reject_proofs(self, request, queryset):
        queryset.update(verification_status='rejected', verified_by=request.user)
        self.message_user(request, f"{queryset.count()} preuves rejetées.")
    
    @admin.action(description='🚩 Signaler preuves sélectionnées')
    def flag_proofs(self, request, queryset):
        queryset.update(verification_status='flagged', verified_by=request.user)
        self.message_user(request, f"{queryset.count()} preuves signalées.")


# ==================== GPS LOCATION ADMIN ====================

@admin.register(GPSLocation)
class GPSLocationAdmin(admin.ModelAdmin):
    list_display = [
        'mission', 'user', 'location_type', 'coordinates', 'accuracy', 'speed', 'timestamp'
    ]
    list_filter = ['location_type', 'timestamp']
    search_fields = ['mission__title', 'user__email', 'address', 'city']
    ordering = ['-timestamp']
    readonly_fields = ['created_at', 'timestamp']
    
    def coordinates(self, obj):
        return f"{obj.latitude:.6f}, {obj.longitude:.6f}"
    coordinates.short_description = 'Coordonnées'


# ==================== QR VALIDATION ADMIN ====================

@admin.register(QRValidation)
class QRValidationAdmin(admin.ModelAdmin):
    list_display = ['mission', 'status_colored', 'scanned_by', 'scanned_at', 'expires_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['mission__title', 'scanned_by__email', 'qr_code_data']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'scanned_at']
    
    def status_colored(self, obj):
        colors = {
            'pending': 'orange',
            'scanned': 'blue',
            'validated': 'green',
            'expired': 'red',
            'cancelled': 'gray',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Statut'


# ==================== SIGNATURE RECORD ADMIN ====================

@admin.register(SignatureRecord)
class SignatureRecordAdmin(admin.ModelAdmin):
    list_display = ['mission', 'signer', 'signer_role', 'is_valid', 'signed_at', 'created_at']
    list_filter = ['signer_role', 'is_valid', 'signed_at']
    search_fields = ['mission__title', 'signer__email']
    ordering = ['-signed_at']
    readonly_fields = ['created_at', 'signed_at', 'blockchain_hash']


# ==================== PHOTO ANALYSIS ADMIN ====================

@admin.register(PhotoAnalysis)
class PhotoAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        'proof', 'faces_count', 'is_blurry', 'is_dark',
        'matches_mission_location', 'fraud_score_colored', 'analyzed_at'
    ]
    list_filter = ['is_blurry', 'is_dark', 'matches_mission_location', 'analyzed_at']
    search_fields = ['proof__mission__title', 'text_detected']
    ordering = ['-analyzed_at']
    readonly_fields = ['analyzed_at']
    
    def fraud_score_colored(self, obj):
        score = obj.fraud_score
        color = 'green' if score < 30 else 'orange' if score < 70 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, score
        )
    fraud_score_colored.short_description = 'Score Fraude'


# ==================== PROOF CHECKLIST ADMIN ====================

@admin.register(ProofChecklist)
class ProofChecklistAdmin(admin.ModelAdmin):
    list_display = [
        'mission', 'completion_percentage_display', 'is_complete',
        'pickup_photo_done', 'delivery_photo_done', 'signature_done',
        'qr_code_done', 'receipt_done', 'updated_at'
    ]
    list_filter = ['is_complete', 'pickup_photo_done', 'delivery_photo_done', 'signature_done', 'updated_at']
    search_fields = ['mission__title']
    ordering = ['-updated_at']
    readonly_fields = ['updated_at', 'completed_at']
    
    def completion_percentage_display(self, obj):
        pct = obj.completion_percentage
        color = 'green' if pct == 100 else 'orange' if pct >= 50 else 'red'
        return format_html(
            '<div style="width:100px; background:#ddd;">'
            '<div style="width:{}%; background:{}; color:white; text-align:center; padding:2px;">'
            '{:.0f}%</div></div>',
            pct, color, pct
        )
    completion_percentage_display.short_description = 'Progression'
