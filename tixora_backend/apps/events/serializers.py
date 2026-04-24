# apps/events/serializers.py
from django.utils.text import slugify
from django.utils import timezone
from rest_framework import serializers
from .models import Event, TicketType, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug']


class TicketTypeSerializer(serializers.ModelSerializer):
    """
    Used for both reading and writing ticket types.
    quantity_available is computed — never stored directly.
    """
    quantity_available = serializers.ReadOnlyField()
    is_sold_out        = serializers.ReadOnlyField()
    is_on_sale         = serializers.ReadOnlyField()

    class Meta:
        model  = TicketType
        fields = [
            'id', 'name', 'description', 'price',
            'total_quantity', 'quantity_sold', 'quantity_available',
            'max_per_order', 'sale_start', 'sale_end',
            'is_active', 'is_sold_out', 'is_on_sale',
            'created_at',
        ]
        read_only_fields = ['id', 'quantity_sold', 'created_at']

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Price cannot be negative.')
        return value

    def validate_total_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Total quantity must be at least 1.')
        return value

    def validate(self, attrs):
        sale_start = attrs.get('sale_start')
        sale_end   = attrs.get('sale_end')
        if sale_start and sale_end and sale_end <= sale_start:
            raise serializers.ValidationError({
                'sale_end': 'Sale end must be after sale start.'
            })
        return attrs


class EventListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.
    Only includes fields needed for browsing cards.
    Avoids loading full description and all ticket types.
    """
    organizer_name     = serializers.SerializerMethodField()
    category           = CategorySerializer(read_only=True)
    total_capacity     = serializers.ReadOnlyField()
    total_sold         = serializers.ReadOnlyField()
    is_on_sale         = serializers.ReadOnlyField()
    lowest_price       = serializers.SerializerMethodField()

    class Meta:
        model  = Event
        fields = [
            'id', 'title', 'slug', 'category',
            'venue', 'city', 'banner',
            'start_date', 'end_date', 'status',
            'organizer_name', 'total_capacity',
            'total_sold', 'is_on_sale', 'lowest_price',
        ]

    def get_organizer_name(self, obj):
        return obj.organizer.get_full_name() or obj.organizer.email

    def get_lowest_price(self, obj):
        """Show starting price — e.g. 'From KES 500'."""
        types = obj.ticket_types.filter(is_active=True)
        if not types.exists():
            return None
        return min(t.price for t in types)


class EventDetailSerializer(serializers.ModelSerializer):
    """
    Full event detail including all ticket types.
    Used for the event detail page.
    """
    organizer_name  = serializers.SerializerMethodField()
    category        = CategorySerializer(read_only=True)
    ticket_types    = TicketTypeSerializer(many=True, read_only=True)
    total_capacity  = serializers.ReadOnlyField()
    total_sold      = serializers.ReadOnlyField()
    is_on_sale      = serializers.ReadOnlyField()
    is_upcoming     = serializers.ReadOnlyField()

    class Meta:
        model  = Event
        fields = [
            'id', 'title', 'slug', 'description',
            'category', 'venue', 'city', 'banner',
            'start_date', 'end_date', 'status',
            'organizer_name', 'ticket_types',
            'total_capacity', 'total_sold',
            'is_on_sale', 'is_upcoming',
            'created_at', 'updated_at',
        ]

    def get_organizer_name(self, obj):
        return obj.organizer.get_full_name() or obj.organizer.email


class EventWriteSerializer(serializers.ModelSerializer):
    """
    Used by organizers to create/update events.
    Slug is auto-generated — organizers don't set it manually.
    category_id is writable; category is readable.
    """
    category_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model  = Event
        fields = [
            'title', 'description', 'category_id',
            'venue', 'city', 'banner',
            'start_date', 'end_date', 'status',
        ]

    def validate_status(self, value):
        """
        Organizers can only set draft or published.
        completed/cancelled are system or admin actions.
        """
        allowed = [Event.Status.DRAFT, Event.Status.PUBLISHED]
        if value not in allowed:
            raise serializers.ValidationError(
                'You can only set status to draft or published.'
            )
        return value

    def validate(self, attrs):
        start = attrs.get('start_date')
        end   = attrs.get('end_date')

        # On create, both are required
        if not self.instance:
            if not start:
                raise serializers.ValidationError({'start_date': 'This field is required.'})
            if not end:
                raise serializers.ValidationError({'end_date': 'This field is required.'})

        # Use existing values on partial update
        start = start or (self.instance.start_date if self.instance else None)
        end   = end   or (self.instance.end_date   if self.instance else None)

        if start and end and end <= start:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        if start and start < timezone.now() and not self.instance:
            raise serializers.ValidationError({
                'start_date': 'Event start date cannot be in the past.'
            })
        return attrs

    def _generate_unique_slug(self, title):
        """
        Generate slug from title, append suffix if collision.
        e.g. 'nairobi-jazz-fest' → 'nairobi-jazz-fest-2' if taken
        """
        base_slug = slugify(title)[:200]
        slug      = base_slug
        counter   = 1
        while Event.objects.filter(slug=slug).exclude(
            pk=self.instance.pk if self.instance else None
        ).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def create(self, validated_data):
        validated_data['slug'] = self._generate_unique_slug(
            validated_data['title']
        )
        # organizer is injected by the view from request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Regenerate slug if title changed
        if 'title' in validated_data and validated_data['title'] != instance.title:
            validated_data['slug'] = self._generate_unique_slug(
                validated_data['title']
            )
        return super().update(instance, validated_data)