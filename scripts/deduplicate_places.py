"""Compatibility wrapper for the old command name.

The canonical pipeline now lives in build_places.py. Keeping this file avoids
breaking local notes/automation that still invokes scripts/deduplicate_places.py.
"""
from build_places import main


if __name__ == '__main__':
    main()
