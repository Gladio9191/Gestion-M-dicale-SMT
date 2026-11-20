"""Pure validation of API date ranges; no patient data or external services."""
import re


def _year(value, field):
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ValueError(f'{field} doit être une année entière au format AAAA')
    text = str(value).strip()
    if not re.fullmatch(r'\\d{4}', text):
        raise ValueError(f'{field} doit être une année entière au format AAAA')
    year = int(text)
    if year < 1900 or year > 2100:
        raise ValueError(f'{field} doit être compris entre 1900 et 2100')
    return year


def parse_year_range(values):
    """Read JSON dict or Flask MultiDict without accepting empty or reversed years."""
    year_from = _year(values.get('year_from', 2017), 'year_from')
    year_to = _year(values.get('year_to', 2026), 'year_to')
    if year_from > year_to:
        raise ValueError('year_from ne doit pas dépasser year_to')
    return year_from, year_to
