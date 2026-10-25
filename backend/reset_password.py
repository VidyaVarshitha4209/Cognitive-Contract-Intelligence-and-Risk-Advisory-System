"""
List users or reset a password, using your project's own database settings.

Run from  D:\\contract-intelligence\\backend  with the virtual environment active:

    python reset_password.py                              -> shows every registered user
    python reset_password.py you@mail.com NewPass123      -> sets a new password for that user
"""
import sys

from sqlalchemy import func

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

USAGE = "Usage:\n  python reset_password.py\n  python reset_password.py <email> <new_password>"


def main() -> None:
    db = SessionLocal()
    try:
        if len(sys.argv) == 1:
            users = db.query(User).all()
            if not users:
                print("No users found. Use the 'Create Account' tab on the login page.")
                return
            print("Registered users (copy the email EXACTLY as shown):")
            for u in users:
                print(f"  id={u.id}  email={u.email!r}  name={u.full_name!r}")
            return

        if len(sys.argv) != 3:
            print(USAGE)
            return

        email, new_password = sys.argv[1].strip(), sys.argv[2]
        if len(new_password) < 8:
            print("Please use a password with at least 8 characters.")
            return

        user = db.query(User).filter(User.email == email).first()
        if user is None:  # also try ignoring upper/lower case
            user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if user is None:
            print(f"No user with email {email!r}. Run without arguments to see the list.")
            return

        user.hashed_password = get_password_hash(new_password)
        db.commit()
        print(f"Done. Sign in with email {user.email!r} and your new password.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
