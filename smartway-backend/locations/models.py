# locations/models.py
from django.db import models


class Location(models.Model):
    """
    Справочник локаций (городов/населённых пунктов).
    Управляется через админ-панель.
    """
    
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Уникальный код локации (например: bishkek, osh, tokmok)"
    )
    
    # Мультиязычные названия
    name_ru = models.CharField(
        max_length=255,
        verbose_name="Название (RU)"
    )
    name_en = models.CharField(
        max_length=255,
        verbose_name="Название (EN)"
    )
    name_ky = models.CharField(
        max_length=255,
        verbose_name="Название (KY)"
    )
    
    # Для сортировки в списках (популярные города вверху)
    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Чем меньше число, тем выше в списке"
    )
    
    # Активность (можно скрыть без удаления)
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Отображать в списках выбора"
    )
    
    # Дополнительные поля
    region = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Область/регион (опционально)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['sort_order', 'name_ru']
        verbose_name = "Локация"
        verbose_name_plural = "Локации"
    
    def __str__(self):
        return self.name_ru
    
    def get_name(self, lang: str = 'ru') -> str:
        """Получить название на нужном языке"""
        names = {
            'ru': self.name_ru,
            'en': self.name_en,
            'ky': self.name_ky,
        }
        return names.get(lang, self.name_ru)