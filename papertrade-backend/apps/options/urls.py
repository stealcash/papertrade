from rest_framework.routers import DefaultRouter
from .views import OptionViewSet

router = DefaultRouter()
router.register(r'', OptionViewSet, basename='options')

urlpatterns = router.urls
