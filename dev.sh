#!/bin/bash
pnpm run dev 2>&1 | tee ./logs/dev.log
