import unittest

from server import check_password, new_admin


class NewAdminTest(unittest.TestCase):
    def test_stores_a_checkable_hash(self):
        user_id, email, digest = new_admin("Admin@Example.com", "correct horse battery")
        self.assertEqual(email, "admin@example.com")
        self.assertEqual(len(user_id), 16)
        self.assertTrue(check_password("correct horse battery", digest))
        self.assertFalse(check_password("wrong horse battery", digest))

    def test_refuses_a_short_password(self):
        with self.assertRaises(ValueError):
            new_admin("admin@example.com", "short-pass")

    def test_refuses_a_bad_email(self):
        with self.assertRaises(ValueError):
            new_admin("not-an-email", "correct horse battery")


if __name__ == "__main__":
    unittest.main()
