"""BlockTask URL Configuration"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API Endpoints
    path('api/users/', include('apps.users.urls')),
    path('api/categories/', include('apps.missions.urls_categories')),
    path('api/missions/', include('apps.missions.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/escrow/', include('apps.escrow.urls')),
    path('api/reputation/', include('apps.reputation.urls')),
    path('api/disputes/', include('apps.disputes.urls')),
    path('api/tracking/', include('apps.tracking.urls')),
    path('api/proofs/', include('apps.proofs.urls')),
    path('api/enterprises/', include('apps.enterprises.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
