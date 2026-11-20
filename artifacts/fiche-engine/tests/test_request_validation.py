"""Synthetic-only validation tests. No ONEE employee or patient data."""
import ast
import sys
import unittest
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE))
from request_validation import parse_year_range


class TestYearRange(unittest.TestCase):
    def test_defaults_remain_compatible(self):
        self.assertEqual(parse_year_range({}), (2017, 2026))

    def test_int_and_four_digit_string_values(self):
        self.assertEqual(parse_year_range({'year_from': '2019', 'year_to': 2024}), (2019, 2024))
        self.assertEqual(parse_year_range({'year_from': '2026', 'year_to': '2026'}), (2026, 2026))

    def test_invalid_year_types_are_rejected(self):
        for value in (None, True, False, '', ' ', '20x6', '20.5', 2020.5, [], -2020):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_year_range({'year_from': value})

    def test_inverted_ranges_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'dépasser'):
            parse_year_range({'year_from': 2026, 'year_to': 2017})

    def test_outside_bounds_is_rejected(self):
        for value in ('1899', 2101, 0):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_year_range({'year_from': value})

    def test_invalid_request_shape_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_year_range(['2017', '2026'])

    def test_six_api_routes_call_shared_validator(self):
        source = (ENGINE / 'app.py').read_text(encoding='utf-8')
        tree = ast.parse(source)
        calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)
                 and isinstance(node.func, ast.Name) and node.func.id == 'parse_year_range']
        self.assertEqual(len(calls), 6)


if __name__ == '__main__':
    unittest.main()
