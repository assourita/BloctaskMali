# Generated for auto_validation_delay default 48h

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('missions', '0009_mission_media'),
    ]

    operations = [
        migrations.AlterField(
            model_name='mission',
            name='auto_validation_delay',
            field=models.PositiveIntegerField(default=48, help_text='Heures avant validation auto'),
        ),
    ]
