"""BlockTask URL Configuration"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.users.auth_views import BlockTaskTokenObtainPairView, GoogleAuthView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication
    path('api/auth/token/', BlockTaskTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/google/', GoogleAuthView.as_view(), name='google_auth'),

    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Endpoints
    path('api/config/', include('apps.common.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/categories/', include('apps.missions.urls_categories')),
    path('api/missions/', include('apps.missions.urls')),
    path('api/ratings/', include('apps.missions.urls_ratings')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/escrow/', include('apps.escrow.urls')),
    path('api/reputation/', include('apps.reputation.urls')),
    path('api/disputes/', include('apps.disputes.urls')),
    path('api/tracking/', include('apps.tracking.urls')),
    path('api/proofs/', include('apps.proofs.urls')),
    path('api/enterprises/', include('apps.enterprises.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/chat/', include('apps.chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
