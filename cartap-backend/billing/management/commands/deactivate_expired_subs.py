from django.core.management.base import BaseCommand
from django.utils import timezone
from billing.models import DriverSubscription

class Command(BaseCommand):
    help = "Deactivate expired driver subscriptions"

    def handle(self, *args, **options):
        updated = DriverSubscription.objects.filter(is_active=True, ends_at__lte=timezone.now()).update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f"Deactivated: {updated}"))
