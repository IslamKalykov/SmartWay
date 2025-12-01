from django.urls import path
from .views import PlanListView, MockPayView, MySubscriptionsView, CurrentPlanView

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing-plans"),
    path("mock-pay/", MockPayView.as_view(), name="billing-mock-pay"),
    path("my/", MySubscriptionsView.as_view(), name="billing-my"),
    path("current/", CurrentPlanView.as_view(), name="billing-current"),  # 🔹
]
