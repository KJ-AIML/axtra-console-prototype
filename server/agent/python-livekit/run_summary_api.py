#!/usr/bin/env python3
"""
Run the Call Summary API Server
Simple entry point for starting just the summary generation API
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.server import main

if __name__ == "__main__":
    main()
