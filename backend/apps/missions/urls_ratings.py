from django.urls import path

from .rating_views import RatingView

urlpatterns = [
    path('', RatingView.as_view(), name='rating-create'),
]
