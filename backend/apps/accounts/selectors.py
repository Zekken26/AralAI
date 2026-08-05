def get_user_by_id(user_id: int):
    from apps.accounts.models import User

    return User.objects.filter(id=user_id).first()
