from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import User


class CurrentUserSerializer(serializers.ModelSerializer):
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "platform_role", "email_verified", "memberships")

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_memberships(self, user: User) -> list[dict[str, object]]:
        return [
            {
                "organization_id": membership.organization_id,
                "organization_slug": membership.organization.slug,
                "organization_name": membership.organization.name,
                "role": membership.role,
            }
            for membership in user.memberships.filter(is_active=True).select_related("organization")
        ]
