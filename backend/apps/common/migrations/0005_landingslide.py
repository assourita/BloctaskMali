from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0004_repair_question_mark_text'),
    ]

    operations = [
        migrations.CreateModel(
            name='LandingSlide',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=120)),
                ('search_query', models.CharField(blank=True, max_length=120)),
                ('image', models.ImageField(upload_to='landing/carousel/')),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Slide landing',
                'verbose_name_plural': 'Slides landing',
                'db_table': 'landing_slides',
                'ordering': ['order', 'title'],
            },
        ),
    ]
