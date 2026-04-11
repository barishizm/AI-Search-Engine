import re


def sanitize_query(query: str) -> str:
    # Remove control characters
    query = re.sub(r'[\x00-\x1f\x7f]', '', query)
    # Limit repeated special chars (injection attempts often use these)
    query = re.sub(r'["\[\]{}\\]{3,}', '', query)
    # Strip leading/trailing whitespace
    return query.strip()
