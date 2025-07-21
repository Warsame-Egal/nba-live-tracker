import os

RUNNING_ON_RENDER = os.getenv("RENDER") is not None or os.getenv("RENDER_EXTERNAL_HOSTNAME") is not None
